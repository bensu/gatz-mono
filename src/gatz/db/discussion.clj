(ns gatz.db.discussion
  (:require [com.biffweb :as biff :refer [q]]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.util :as db.util]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [medley.core :refer [map-vals]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn seen-by-user?
  "Has the user seen this discussion?
 
  Should be kept in-sync with the client version of this function"
  [uid d]
  {:pre [(uuid? uid)]
   :post [(boolean? %)]}
  (let [seen-at (get-in d [:discussion/seen_at uid])
        updated-at (get-in d [:discussion/updated_at])]
    (boolean (or (nil? seen-at)
                 (< seen-at updated-at)))))

(defn crdt->doc [dcrdt]
  #_{:pre [(malli/validate schema/DiscussionCRDT dcrdt)]
     :post [(malli/validate schema/DiscussionDoc %)]}
  (-> dcrdt
      crdt.discussion/->value
      (select-keys schema/discussion-indexed-fields)
      (assoc :db/full-doc dcrdt)))

(defn doc->crdt [ddoc]
  #_{:pre [(malli/validate schema/DiscussionDoc ddoc)]
     :post [(malli/validate schema/DiscussionCRDT %)]}
  (if (contains? ddoc :db/full-doc)
    (:db/full-doc ddoc)
    ddoc))

(def migration-client-id #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95")

(defn v0->v1 [data]
  ;; {:post [(malli/validate schema/DiscussionCRDT %)]}
  (let [clock (crdt/new-hlc migration-client-id)
        v1
        (-> (merge crdt.discussion/discussion-defaults data)
            (assoc :db/version 1
                   :crdt/clock clock
                   :db/doc-type :gatz.crdt/discussion
                   :db/type :gatz/discussion)
            (update :discussion/members #(crdt/lww-set clock %))
            (update :discussion/subscribers #(crdt/lww-set clock %))
            (update :discussion/latest_message #(if (nil? %)
                                                  nil
                                                  (crdt/lww clock %)))
            (update :discussion/last_message_read #(crdt/->lww-map % clock))
            (update :discussion/updated_at crdt/max-wins)
            (update :discussion/latest_activity_ts crdt/max-wins)
            (update :discussion/seen_at (fn [seen-at]
                                          (map-vals crdt/max-wins seen-at)))
            (update :discussion/archived_at #(crdt/->lww-map % clock)))]
    #_(assert (malli/validate schema/DiscussionCRDT v1)
              (malli/explain schema/DiscussionCRDT v1))
    v1))

(defn v1->v2 [data]
  (let [clock (crdt/new-hlc migration-client-id)
        active-members (crdt/gos (crdt/-value (:discussion/subscribers data)))]
    (-> data
        (assoc :discussion/active_members active-members)
        (assoc :db/version 2
               :crdt/clock clock
               :db/doc-type :gatz.crdt/discussion
               :db/type :gatz/discussion))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}
   {:from 1 :to 2 :transform v1->v2}])

(defn by-id [db did]
  (-> (xtdb/entity db did)
      doc->crdt
      (db.util/->latest-version all-migrations)))

;; Actions

(defmulti authorized-for-delta?
  (fn [_d evt]
    (get-in evt [:evt/data :discussion.crdt/action])))

(defn user-in-discussion? [uid {:keys [discussion/members] :as _d}]
  {:pre [(uuid? uid) (set? members) (every? uuid? members)]
   :post [(boolean? %)]}
  (contains? members uid))

(defn only-user-in-map-delta [uid map-delta]
  {:pre [(uuid? uid) (map? map-delta) (every? uuid? (keys map-delta))]
   :post [(boolean? %)]}
  (= #{uid} (set (keys map-delta))))

(defmethod authorized-for-delta? :discussion.crdt/archive
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    (and (user-in-discussion? uid d)
         (only-user-in-map-delta uid (:discussion/archived_at delta)))))

(defmethod authorized-for-delta? :discussion.crdt/mark-message-read
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    (and (user-in-discussion? uid d)
         (only-user-in-map-delta uid (:discussion/last_message_read delta)))))

(defmethod authorized-for-delta? :discussion.crdt/subscribe
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    (and (user-in-discussion? uid d)
         (only-user-in-map-delta uid (:discussion/subscribers delta)))))

(defmethod authorized-for-delta? :discussion.crdt/mark-as-seen
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    (and (user-in-discussion? uid d)
         (only-user-in-map-delta uid (:discussion/seen_at delta)))))

(defmethod authorized-for-delta? :discussion.crdt/append-message
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    ;; TODO: in the future, check if the message is in the user
    (and (user-in-discussion? uid d)
         (or (empty? (:discussion/subscribers delta))
             (only-user-in-map-delta uid (:discussion/subscribers delta))))))

(defn apply-delta-xtdb
  [ctx {:keys [evt] :as _args}]
  (let [did (:evt/did evt)
        db (xtdb.api/db ctx)]
    (when-let [d (gatz.db.discussion/by-id db did)]
      (when (gatz.db.discussion/authorized-for-delta? (crdt.discussion/->value d) evt)
        (let [delta (get-in evt [:evt/data :discussion.crdt/delta])
              new-d (gatz.crdt.discussion/apply-delta d delta)]
          [[:xtdb.api/put evt]
           [:xtdb.api/put (-> new-d
                              (crdt->doc)
                              (assoc :db/doc-type :gatz.doc/discussion))]])))))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  apply-delta-expr
  '(fn discussion-apply-delta-fn [ctx args]
     (gatz.db.discussion/apply-delta-xtdb ctx args)))

(def tx-fns
  {:gatz.db.discussion/apply-delta apply-delta-expr})

(defn apply-action!
  "Applies a delta to the discussion and stores it"
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} did action] ;; TODO: use cid
  {:pre [(uuid? did) (uuid? user-id)]}
  (let [evt (db.evt/new-evt {:evt/type :discussion.crdt/delta
                             :evt/uid user-id
                             :evt/mid nil
                             :evt/did did
                             :evt/cid cid
                             :evt/data action})]
    (if (true? (malli/validate schema/DiscussionEvt evt))
      (let [txs [[:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]]]
        ;; Try the transaction before submitting it
        (if-let [db-after (xtdb.api/with-tx db txs)]
          (do
            (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txs)
            {:evt (xtdb.api/entity db-after (:evt/id evt))
             :discussion (by-id db-after did)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

;; Wrappers over actions

(defn mark-as-seen!
  [ctx uid dids now]
  {:pre [(every? uuid? dids) (uuid? uid) (inst? now)]}
  (let [clock (crdt/new-hlc uid now)
        txns (mapv
              (fn [did]
                (let [delta {:crdt/clock clock
                             :discussion/updated_at now
                             :discussion/seen_at {uid (crdt/->MaxWins now)}}
                      action {:discussion.crdt/action :discussion.crdt/mark-as-seen
                              :discussion.crdt/delta delta}
                      evt  (db.evt/new-evt {:evt/type :discussion.crdt/delta
                                            :evt/uid uid
                                            :evt/mid nil
                                            :evt/did did
                                            :evt/cid uid
                                            :evt/data action})]
                  [:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]))
              dids)]
    (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txns)))

(defn mark-message-read!
  ([ctx uid did mid]
   (mark-message-read! ctx uid did mid (Date.)))
  ([ctx uid did mid now]
   {:pre [(uuid? mid) (uuid? uid) (uuid? did) (inst? now)]}
   (let [now (Date.)
         clock (crdt/new-hlc uid now)
         delta {:crdt/clock clock
                :discussion/updated_at now
                :discussion/last_message_read {uid (crdt/->LWW clock mid)}}
         action {:discussion.crdt/action :discussion.crdt/mark-message-read
                 :discussion.crdt/delta delta}]
     (apply-action! ctx did action))))

(defn archive!
  ([ctx did uid]
   (archive! ctx did uid (Date.)))
  ([ctx did uid now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [clock (crdt/new-hlc uid now)
         delta {:crdt/clock clock
                :discussion/updated_at now
                :discussion/archived_at {uid (crdt/->LWW clock now)}}
         action {:discussion.crdt/action :discussion.crdt/archive
                 :discussion.crdt/delta delta}]
     (apply-action! ctx did action))))

(defn subscribe!
  ([ctx did uid]
   (subscribe! ctx did uid (Date.)))
  ([ctx did uid now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [now (Date.)
         clock (crdt/new-hlc uid now)
         delta {:crdt/clock clock
                :discussion/updated_at now
                :discussion/subscribers {uid (crdt/->LWW clock true)}}
         action {:discussion.crdt/action :discussion.crdt/subscribe
                 :discussion.crdt/delta delta}]
     (apply-action! ctx did action))))

(defn unsubscribe!
  ([ctx did uid]
   (unsubscribe! ctx did uid (Date.)))
  ([ctx did uid now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [now (Date.)
         clock (crdt/new-hlc uid now)
         delta {:crdt/clock clock
                :discussion/updated_at now
                :discussion/subscribers {uid (crdt/->LWW clock false)}}
         action {:discussion.crdt/action :discussion.crdt/subscribe
                 :discussion.crdt/delta delta}]
     (apply-action! ctx did action))))

;; ====================================================================== 
;; Queries

(def posts-for-user-opts
  [:map
   [:older-than-ts inst?]])

(malli/=> posts-for-user
          [:function
           [:=> [:cat any? schema/UserId] [:sequential schema/DiscussionId]]
           [:=> [:cat any? schema/UserId posts-for-user-opts] [:sequential schema/DiscussionId]]])

(defn posts-for-user
  ([db uid]
   (->> (q db '{:find [did created-at]
                :in [user-id]
                :limit 20
                :order-by [[created-at :desc]]
                :where [[did :db/type :gatz/discussion]
                        [did :discussion/members user-id]
                        [did :discussion/created_at created-at]]}
           uid)
        (map first)))
  ([db uid {:keys [older-than-ts]}]
   {:pre [(uuid? uid) (inst? older-than-ts)]}
   (->> (q db '{:find [did created-at]
                :in [user-id older-than-ts]
                :limit 20
                :order-by [[created-at :desc]]
                :where [[did :db/type :gatz/discussion]
                        [did :discussion/members user-id]
                        [did :discussion/created_at created-at]
                        [(< created-at older-than-ts)]]}
           uid older-than-ts)
        (map first))))

(def active-for-user-opts
  [:map
   [:older-than-ts inst?]])

(malli/=> active-for-user
          [:function
           [:=> [:cat any? schema/UserId] [:sequential schema/DiscussionId]]
           [:=> [:cat any? schema/UserId active-for-user-opts] [:sequential schema/DiscussionId]]])

(defn active-for-user
  ([db uid]
   (->> (q db '{:find [did latest-activity-ts]
                :in [user-id]
                :limit 20
                :order-by [[latest-activity-ts :desc]]
                :where [[did :db/type :gatz/discussion]
                        [did :discussion/active_members user-id]
                        [did :discussion/first_message first-mid]
                        [did :discussion/latest_message latest-mid]
                        [(not= first-mid latest-mid)]
                        [did :discussion/latest_activity_ts latest-activity-ts]]}
           uid)
        (map first)))
  ([db uid {:keys [older-than-ts]}]
   {:pre [(uuid? uid) (inst? older-than-ts)]}
   (->> (q db '{:find [did latest-activity-ts]
                :in [user-id older-than-ts]
                :limit 20
                :order-by [[latest-activity-ts :desc]]
                :where [[did :db/type :gatz/discussion]
                        [did :discussion/active_members user-id]
                        [did :discussion/first_message first-mid]
                        [did :discussion/latest_message latest-mid]
                        [(not= first-mid latest-mid)]
                        [did :discussion/latest_activity_ts latest-activity-ts]
                        [(< latest-activity-ts older-than-ts)]]}
           uid older-than-ts)
        (map first))))


(defn all-ids [db]
  (q db
     '{:find  d
       :where [[d :db/type :gatz/discussion]]}))

(defn posts-in-common [db aid bid]
  {:pre [(uuid? aid) (uuid? bid)]
   :post [(vector? %) (every? uuid? %)]}
  (->> (q db '{:find [did created-at]
               :in [aid bid]
               :limit 5
               :order-by [[created-at :desc]]
               :where [[did :db/type :gatz/discussion]
                       [did :discussion/members aid]
                       [did :discussion/members bid]
                       [did :discussion/created_at created-at]]}
          aid bid)
       (mapv first)))