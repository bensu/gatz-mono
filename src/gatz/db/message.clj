(ns gatz.db.message
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.test :refer [deftest testing is are]]
            [crdt.core :as crdt]
            [gatz.crdt.message :as crdt.message]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [medley.core :refer [map-vals]]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [taoensso.nippy :as taoensso-nippy]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ========================================================================
;; Versions

(def message-defaults
  {:message/media nil
   :message/reply_to nil
   :message/deleted_at nil
   :message/edits []
   :message/reactions {}
   :message/posted_as_discussion []})

;; This is the same as reserialize as a CRDT
(defn update-message
  ([m] (update-message m (java.util.Date.)))
  ([m now]
   (-> (merge message-defaults m)
       (assoc :db/doc-type :gatz/message)
       (assoc :db/type :gatz/message)
       (assoc :message/updated_at now))))

;; I want to have versions of serialized files so that I can 
;; do more complicated migrations and know that I'll be dealing with the same

(def migration-client-id #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95")

(defn v0->v1 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> data
        (assoc :crdt/clock clock
               :db/version 1
               :db/doc-type :gatz.crdt/message
               :db/type :gatz/message)
        (update :message/deleted_at #(crdt/->MinWins %))
        (update :message/updated_at #(crdt/->MaxWins %))
        (update :message/posted_as_discussion #(crdt/->GrowOnlySet (or (set %) #{})))
        (update :message/edits #(crdt/->GrowOnlySet (or (set %) #{})))
        (update :message/text #(crdt/->LWW clock %))
        (update :message/reactions
                (fn [uid->emoji->ts]
                  (map-vals (fn [emoji->ts]
                              (map-vals (fn [ts] (crdt/->LWW clock ts)) emoji->ts))
                            (or uid->emoji->ts {})))))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}])

(def last-version (count all-migrations))

(defn ->latest-version [raw-data]
  ;; TODO: should I handle the unthawable case from
  ;; TODO: what should the version system look like
  (let [original-version (or (:db/version raw-data) 0)]
    (if (= original-version last-version)
      raw-data ;; already up to date, no migrations needed
      (loop [migrations (subvec all-migrations original-version last-version)
             msg (assoc raw-data :db/version original-version)]
        (if-let [migration (first migrations)]
          (let [{:keys [from to transform]} migration]
            (assert (= from (:db/version msg))
                    "Applying migration to the wrong version")
            (recur (rest migrations)
                   (-> (transform msg)
                       (assoc :db/version to))))
          msg)))))

(defn by-id [db mid]
  {:pre [(uuid? mid)]}
  (let [raw-msg (xtdb/entity db mid)]
    ;; This could be any version of the message
    (->latest-version raw-msg)))

(defn by-did [db did]
  (->> (q db '{:find m
               :in [did]
               :where [[m :message/did did]
                       [m :db/type :gatz/message]]}
          did)
       (map (partial by-id db))
       (remove (comp :message/deleted_at crdt/-value))
       (sort-by :message/created_at)
       vec))

;; ====================================================================== 
;; Events

(defmulti authorized-for-message-delta?
  (fn msg-action [_ctx _d _m evt]
    (get-in evt [:evt/data :message.crdt/action])))

(defmethod authorized-for-message-delta? :message.crdt/add-reaction
  [{:keys [auth/user-id] :as _ctx} d _m _evt]
  (contains? (:discussion/members d) user-id))

(defmethod authorized-for-message-delta? :message.crdt/remove-reaction
  [{:keys [auth/user-id] :as _ctx} d _m _evt]
  (contains? (:discussion/members d) user-id))

(defmethod authorized-for-message-delta? :message.crdt/edit
  [{:keys [auth/user-id] :as _ctx} d m _evt]
  (and (= user-id (:message/user_id m))
       (contains? (:discussion/members d) user-id)))

(defmethod authorized-for-message-delta? :message.crdt/delete
  [{:keys [auth/user-id] :as _ctx} d m _evt]
  (and (= user-id (:message/user_id m))
       (contains? (:discussion/members d) user-id)))

(defn discussion-by-id [db did]
  (xtdb/entity db did))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :evt/ts (Date.)
          :db/type :gatz/evt
          :evt/id (random-uuid)}
         evt))

(defn apply-action!
  "Applies a delta to the message and stores it. Assumes it is authorized to do so"
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} did mid action] ;; TODO: use cid
  {:pre [(uuid? did) (uuid? mid) (uuid? user-id)]}
  (let [evt (new-evt {:evt/type :message.crdt/delta
                      :evt/uid user-id
                      :evt/did did
                      :evt/mid mid
                      :evt/cid cid
                      :evt/data action})]
    (if (true? (malli/validate schema/MessageEvent evt))
      (if-let [d (discussion-by-id db did)]
        (if-let [m (by-id db mid)]
          (if (authorized-for-message-delta? ctx d m evt)
            (let [updated-m (crdt.message/apply-delta m (:message.crdt/delta action))]
              (biff/submit-tx ctx [(assoc updated-m :db/doc-type :gatz.crdt/message)
                                   (assoc evt :db/doc-type :gatz/evt)])
              {:discussion d
               :message updated-m
               :evt evt})
            (assert false "Not authorized to apply this action"))
          (assert false "Tried to delete a non-existing message"))
        (assert false "Tried to update a message in a non-existing discussion"))
      (assert false "Invaild event"))))

(deftest message-events
  (testing "Events can be validated"
    (let [now (Date.)
          [uid did mid cid] (repeatedly 4 random-uuid)
          clock (crdt/new-hlc cid now)]
      (are [action] (malli/validate schema/MessageAction action)
        {:message.crdt/action :message.crdt/edit
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}}}
        {:message.crdt/action :message.crdt/delete
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/deleted_at now}}
        {:message.crdt/action :message.crdt/add-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock now)}}}}
        {:message.crdt/action :message.crdt/remove-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock nil)}}}})
      (are [action] (false? (malli/validate schema/MessageAction action))
        {:message.crdt/action :message.crdt/edit
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}}}
        {:message.crdt/action :message.crdt/delete
         :message.crdt/delta {:crdt/clock clock
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}
                              :message/updated_at now
                              :message/deleted_at now}}
        {:message.crdt/action :message.crdt/add-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock now)}}}}
        {:message.crdt/action :message.crdt/remove-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock nil)}}}}))))

;; ====================================================================== 
;; Pre-CRDT clients

(defn delete-message!
  "Marks a message as deleted with :message/deleted_at"
  [{:keys [auth/user-id] :as ctx}
   did
   mid] ;; TODO: use cid
  {:pre [(uuid? did) (uuid? mid) (uuid? user-id)]}
  (let [now (Date.)
        clock (crdt/new-hlc user-id now)
        delta {:crdt/clock clock
               :message/deleted_at now
               :message/updated_at now}
        action {:message.crdt/action :message.crdt/delete
                :message.crdt/delta delta}]
    (apply-action! ctx did mid action)))

;; TODO: update into discussion
(defn react-to-message!

  [{:keys [auth/user-id] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (let [now (Date.)
          ;; TODO: use cid instead
        clock (crdt/new-hlc user-id now)
        delta {:crdt/clock clock
               :message/updated_at now
               :message/reactions {user-id {reaction (crdt/->LWW clock now)}}}
        action {:message.crdt/action :message.crdt/add-reaction
                :message.crdt/delta delta}]
    (apply-action! ctx did mid action)))


;; TODO: update into discussion
(defn undo-react!
  [{:keys [auth/user-id] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (let [now (Date.)
        clock (crdt/new-hlc user-id now)
        delta {:crdt/clock clock
               :message/updated_at now
               :message/reactions {user-id {reaction (crdt/->LWW clock nil)}}}
        action {:message.crdt/action :message.crdt/remove-reaction
                :message.crdt/delta delta}]
    (apply-action! ctx did mid action)))

(defn flatten-reactions [did mid reactions]
  {:pre [(uuid? did) (uuid? mid)]}
  (mapcat
   (fn [[uid emoji->ts]]
     (keep (fn [[emoji ts]]
             (when ts
               {:reaction/emoji emoji
                :reaction/created_at ts
                :reaction/to_mid mid
                :reaction/by_uid uid
                :reaction/did did}))
           emoji->ts))
   reactions))

(defn count-reactions [reactions]
  {:post [(number? %)]}
  (count (mapcat vals (vals reactions))))


;; TODO: update into discussion
(defn edit-message!

  [{:keys [auth/user-id] :as ctx}
   {:keys [text mid did]}]

  {:pre [(string? text) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (let [now (Date.)
          ;; TODO: use cid
        clock (crdt/new-hlc user-id now)
        delta {:crdt/clock clock
               :message/edits {:message/text text
                               :message/edited_at now}
               :message/text (crdt/->LWW clock text)
               :message/updated_at now}
        action {:message.crdt/action :message.crdt/edit
                :message.crdt/delta delta}]
    (apply-action! ctx did mid action)))

(defn test-node  []
  (xtdb/start-node
   {:xtdb/index-store {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}
    :xtdb/tx-log {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}
    :xtdb/document-store {:kv-store {:xtdb/module 'xtdb.mem-kv/->kv-store}}}))

(deftest db-roundtrip
  (testing "we can store a message and retrieve it"
    (let [node (test-node)
          id (random-uuid)
          doc0 {:xt/id id
                :message/updated_at (crdt/->MaxWins (Date.))}
          r  (xtdb/submit-tx node [[::xtdb/put doc0]])]
      (xtdb/await-tx node (::xtdb/tx-id r))
      (is (= doc0 (juxt-nippy/thaw (juxt-nippy/freeze doc0)))
          "Can roundrobin with juxt's nippy")
      (is (= doc0 (taoensso-nippy/thaw (taoensso-nippy/freeze doc0)))
          "Can roundrobin with nippy")
      (let [doc1 (xtdb/entity (xtdb/db node) id)]
        (is (= doc0 doc1))
        (is (= (class (:message/updated_at doc0))
               (class (:message/updated_at doc1))))))))