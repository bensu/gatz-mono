(ns gatz.db.message
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.crdt.message :as crdt.message]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [taoensso.nippy :as taoensso-nippy]
            [medley.core :refer [dissoc-in map-vals]]
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
                            uid->emoji->ts))))))

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

;; TODO: can't query messages
(defn by-id [db mid]
  {:pre [(uuid? mid)]}
  (let [raw-msg (xtdb/entity db mid)]
    ;; This could be any version of the message
    (->latest-version raw-msg)))

;; TODO: can't query messages
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

(defn delete-message!
  "Marks a message as deleted with :message/deleted_at"
  [{:keys [biff/db auth/user-id] :as ctx} mid]
  {:pre [(uuid? mid) (uuid? user-id)]}
  (if-let [m (by-id db mid)]
    (let [now (Date.)
          clock (crdt/new-hlc user-id now)
          ;; TODO: this delta could go in the event system
          delta {:crdt/clock clock
                 :message/deleted_at now
                 :message/updated_at now}
          updated-m (crdt.message/apply-delta m delta)]
      (biff/submit-tx ctx [(assoc updated-m :db/doc-type :gatz.crdt/message)])
      updated-m)
    (assert false "Tried to delete a non-existing message")))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :evt/ts (Date.)
          :db/type :gatz/evt
          :evt/id (random-uuid)}
         evt))

;; TODO: update into discussion
(defn react-to-message!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (if-let [msg (by-id db mid)]
    (let [now (Date.)
          ;; TODO: use cid instead
          clock (crdt/new-hlc user-id now)
          full-reaction {:reaction/emoji reaction
                         :reaction/created_at now
                         :reaction/did did
                         :reaction/to_mid mid
                         :reaction/by_uid user-id}
          delta {:message/updated_at now
                 :message/reactions {user-id {reaction (crdt/->LWW clock now)}}}
          updated-m (crdt.message/apply-delta msg delta)
          evt (new-evt
               {:evt/type :evt.message/add-reaction
                :evt/uid user-id
                :evt/did did
                :evt/mid mid
                :evt/data {:reaction full-reaction}})]
      (biff/submit-tx ctx [(assoc updated-m :db/doc-type :gatz.crdt/message)
                           evt])
      {:message updated-m :reaction full-reaction :evt evt})
    (assert false "Tried to update a non-existent message")))


;; TODO: update into discussion
(defn undo-react!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (if-let [msg (by-id db mid)]
    (let [now (java.util.Date.)
          ;; TODO: use cid instead
          clock (crdt/new-hlc user-id now)
          delta {:message/updated_at now
                 :message/reactions {user-id {reaction (crdt/->LWW clock nil)}}}
          updated-m (crdt.message/apply-delta msg delta)]
      (biff/submit-tx ctx [(assoc updated-m :db/doc-type :gatz.crdt/message)])
      updated-m)
    (assert false "Tried to update a non-existent message")))

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

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [text mid did]}]

  {:pre [(string? text) (uuid? mid) (uuid? did) (uuid? user-id)]}
  (if-let [msg (by-id db mid)]
    (let [now (java.util.Date.)
          new-edit {:message/text text
                    :message/edited_at now}
          first-edit? (empty? (:message/edits msg))
          original-edit {:message/text (:message/text msg)
                         :message/edited_at (:message/created_at msg)}
          new-msg (cond-> msg
                    first-edit? (update :message/edits (fnil conj []) original-edit))
          new-msg (-> new-msg
                      (update :message/edits conj new-edit)
                      (assoc :message/text text)
                      (update-message now))]
      (biff/submit-tx ctx [new-msg])
      new-msg)
    (assert false "Tried to update a non-existent message")))

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