(ns gatz.db.discussion
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
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

(def migration-client-id #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95")

(defn v0->v1 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> (merge crdt.discussion/discussion-defaults data)
        (assoc :db/version 1
               :crdt/clock clock
               :db/doc-type :gatz.crdt/discussion
               :db/type :gatz/discussion)
        (update :discussion/members #(crdt/lww-set clock %))
        (update :discussion/subscribers #(crdt/lww-set clock %))
        (update :discussion/latest_message #(crdt/->LWW clock %))
        (update :discussion/last_message_read #(crdt/->lww-map clock %))
        (update :discussion/updated_at crdt/->MaxWins)
        (update :discussion/latest_activity_ts crdt/->MaxWins)
        (update :discussion/seen_at (fn [seen-at]
                                      (map-vals crdt/->MaxWins seen-at)))
        (update :discussion/archived_at #(crdt/->lww-map clock %)))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}])

(defn by-id [db did]
  (-> (xtdb/entity db did)
      (db.util/->latest-version all-migrations)))

;; Actions

(defmulti authorized-for-delta?
  (fn [_d evt]
    (get-in evt [:evt/data :discussion.crdt/action])))

(defn user-in-discussion? [uid {:keys [discussion/members] :as d}]
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

(defn apply-delta-xtdb
  [ctx {:keys [evt] :as _args}]
  (let [did (:evt/did evt)
        db (xtdb.api/db ctx)]
    (when-let [d (gatz.db.discussion/by-id db did)]
      (when (gatz.db.discussion/authorized-for-delta? (crdt.discussion/->value d) evt)
        (let [delta (get-in evt [:evt/data :discussion.crdt/delta])
              new-d (gatz.crdt.discussion/apply-delta d delta)]
          [[:xtdb.api/put evt]
           [:xtdb.api/put new-d]])))))

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
            (biff/submit-tx ctx txs)
            {:evt (xtdb.api/entity db-after (:evt/id evt))
             :discussion (by-id db-after did)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

;; Wrappers over actions

(defn mark-as-seen! [{:keys [biff/db] :as ctx} uid dids now]
  {:pre [(every? uuid? dids) (uuid? uid) (inst? now)]}
  (let [txns (mapv (fn [did]
                     (let [d (by-id db did)
                           seen-at (-> (:discussion/seen_at d {})
                                       (assoc uid now))]
                       (-> d
                           (assoc :discussion/seen_at seen-at)
                           (crdt.discussion/update-discussion))))
                   dids)]
    (biff/submit-tx ctx txns)))

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

