(ns gatz.db.message
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.schema :as schema]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.util :as db.util]
            [malli.core :as malli]
            [medley.core :refer [map-vals]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))


(defn extract-mentions [text]
  {:pre [(string? text)]
   :post [(every? string? %)]}
  (or (->> (re-seq #"(?:^|(?<![\w@]))@([a-z][a-z0-9_]*)(?:(?=\W|$)|(?=@))"
                   (str/lower-case text))
           (map second))
      []))

;; ========================================================================
;; DB & migrations

(defn crdt->doc [mcrdt]
  #_{:pre [(malli/validate schema/MessageCRDT mcrdt)]
     :post [(malli/validate schema/MessageDoc %)]}
  (-> mcrdt
      crdt.message/->value
      (select-keys schema/message-indexed-fields)
      (assoc :db/full-doc mcrdt)))

(defn doc->crdt [ddoc]
  #_{:pre [(malli/validate schema/MessageDoc ddoc)]
     :post [(malli/validate schema/MessageCRDT %)]}
  (if (contains? ddoc :db/full-doc)
    (:db/full-doc ddoc)
    ddoc))

;; ========================================================================
;; Versions

(def message-defaults
  {:message/media nil
   :message/reply_to nil
   :message/deleted_at nil
   :message/edits []
   :message/reactions {}
   :message/mentions {}
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
    (-> (merge message-defaults data)
        (assoc :crdt/clock clock
               :db/version 1
               :db/doc-type :gatz.crdt/message
               :db/type :gatz/message)
        (update :message/updated_at #(crdt/->MaxWins %))
        (update :message/deleted_at #(crdt/->MinWins %))
        (update :message/posted_as_discussion #(crdt/->GrowOnlySet (or (set %) #{})))
        (update :message/edits #(crdt/->GrowOnlySet (or (set %) #{})))
        (update :message/text #(crdt/->LWW clock %))
        (update :message/reactions
                (fn [uid->emoji->ts]
                  (map-vals (fn [emoji->ts]
                              (map-vals (fn [ts] (crdt/->LWW clock ts)) emoji->ts))
                            (or uid->emoji->ts {})))))))

(defn v1->v2
  "This migration will put the messages inside of db/full-doc"
  [data]
  (-> data
      (assoc :db/version 2)))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}
   {:from 1 :to 2 :transform v1->v2}])

(defn by-id [db mid]
  {:pre [(uuid? mid)]}
  (when-let [raw-msg (xtdb/entity db mid)]
    ;; This could be any version of the message
    (merge crdt.message/message-defaults
           (db.util/->latest-version (doc->crdt raw-msg) all-migrations))))

(defn by-did [db did]
  {:pre [(uuid? did)]}
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
  (fn msg-action [_d _m evt]
    (get-in evt [:evt/data :message.crdt/action])))

(defmethod authorized-for-message-delta? :default
  [_d _m _evt]
  (assert false))

(defn reactions-belongs-to-user? [uid uid->emoji->ts]
  (= #{uid} (set (keys uid->emoji->ts))))

(defmethod authorized-for-message-delta? :message.crdt/add-reaction
  [d _m {:keys [evt/uid evt/data] :as _evt}]
  (and (contains? (:discussion/members d) uid)
       (let [reactions (get-in data [:message.crdt/delta :message/reactions])]
         (reactions-belongs-to-user? uid reactions))))

(defmethod authorized-for-message-delta? :message.crdt/remove-reaction
  [d _m {:keys [evt/uid evt/data] :as _evt}]
  (and (contains? (:discussion/members d) uid)
       (let [reactions (get-in data [:message.crdt/delta :message/reactions])]
         (reactions-belongs-to-user? uid reactions))))

(defmethod authorized-for-message-delta? :message.crdt/edit
  [d m {:keys [evt/uid] :as _evt}]
  (and (= uid (:message/user_id m))
       (contains? (:discussion/members d) uid)))

(defmethod authorized-for-message-delta? :message.crdt/delete
  [d m {:keys [evt/uid] :as _evt}]
  (and (= uid (:message/user_id m))
       (contains? (:discussion/members d) uid)))

(defmethod authorized-for-message-delta? :message.crdt/posted-as-discussion
  [d _m {:keys [evt/uid] :as _evt}]
  (contains? (:discussion/members d) uid))

(defmethod authorized-for-message-delta? :message.crdt/flag
  [d m {:keys [evt/uid] :as _evt}]
  ;; commenter can't flag their own post
  (and (not= uid (:message/user_id m))
       (contains? (:discussion/members d) uid)))

(defn discussion-by-id
  [db did]
  (xtdb/entity db did))

(defn message-apply-delta
  "Used in the expression below"
  [ctx {:keys [evt] :as _args}]
  (let [mid (:evt/mid evt)
        did (:evt/did evt)
        db (xtdb.api/db ctx)
        d (crdt.discussion/->value (gatz.db.discussion/by-id db did))
        msg (gatz.db.message/by-id db mid)]
    (when (gatz.db.message/authorized-for-message-delta? d msg evt)
      (let [delta (get-in evt [:evt/data :message.crdt/delta])
            new-msg (gatz.crdt.message/apply-delta msg delta)]
        [[:xtdb.api/put evt]
         [:xtdb.api/put (-> new-msg
                            (crdt->doc)
                            (assoc :db/doc-type :gatz.doc/message))]]))))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  message-apply-delta-expr
  '(fn message-apply-delta-fn [ctx args]
     (gatz.db.message/message-apply-delta ctx args)))

(def tx-fns
  {:gatz.db.message/apply-delta message-apply-delta-expr})

(defn apply-action!
  "Applies a delta to the message and stores it"
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} did mid action] ;; TODO: use cid
  {:pre [(uuid? did) (uuid? mid) (uuid? user-id)]}
  (let [evt (db.evt/new-evt {:evt/type :message.crdt/delta
                             :evt/uid user-id
                             :evt/did did
                             :evt/mid mid
                             :evt/cid cid
                             :evt/data action})]
    (if (true? (malli/validate schema/MessageEvent evt))
      (let [txs [[:xtdb.api/fn :gatz.db.message/apply-delta {:evt evt}]]]
        ;; Try the transaction before submitting it
        (if-let [db-after (xtdb.api/with-tx db txs)]
          (do
            (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txs)
            {:evt (xtdb.api/entity db-after (:xt/id evt))
             :message (by-id db-after mid)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

;; ====================================================================== 
;; Pre-CRDT clients

(defn flag!
  "Blocks some content for the user"
  [{:keys [auth/user-id] :as ctx}
   did
   mid]
  ;; TODO: use cid
  {:pre [(uuid? did) (uuid? mid) (uuid? user-id)]}
  (let [now (Date.)
        clock (crdt/new-hlc user-id now)
        delta {:crdt/clock clock
               :message/updated_at now
               :message/flagged_uids (crdt/lww-set-delta clock #{user-id})}
        action {:message.crdt/action :message.crdt/flag
                :message.crdt/delta delta}]
    (apply-action! ctx did mid action)))

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
                :reaction/created_at (crdt/-value ts)
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

