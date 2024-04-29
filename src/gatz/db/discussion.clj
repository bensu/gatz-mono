(ns gatz.db.discussion
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [xtdb.api :as xtdb]))

(defn seen-by-user?
  "Has the user seen this discussion?
 
  Should be kept in-sync with the client version of this function"
  [user-id d]
  {:pre [(uuid? user-id)]
   :post [(boolean? %)]}
  (let [seen-at (get-in d [:discussion/seen_at user-id])
        updated-at (get-in d [:discussion/updated_at])]
    (boolean (or (nil? seen-at)
                 (< seen-at updated-at)))))

(defn by-id [db did]
  (xtdb/entity db did))

(def discussion-defaults
  {:discussion/seen_at {}
   :discussion/archived_at {}
   :discussion/last_message_read {}
   :discussion/subscribers #{}
   :discussion/originally_from nil
   :discussion/first_message nil
   :discussion/latest_message nil})

(defn update-discussion
  ([d] (update-discussion d (java.util.Date.)))
  ([d now]
   (-> (merge discussion-defaults
              ;; TODO: remove when migration is complete
              {:discussion/latest_activity_ts now}
              d)
       (assoc :db/doc-type :gatz/discussion)
       (assoc :discussion/updated_at now))))

(defn mark-as-seen! [{:keys [biff/db] :as ctx} uid dids now]
  {:pre [(every? uuid? dids) (uuid? uid) (inst? now)]}
  (let [txns (mapv (fn [did]
                     (let [d (by-id db did)
                           seen-at (-> (:discussion/seen_at d {})
                                       (assoc uid now))]
                       (-> d
                           (assoc :discussion/seen_at seen-at)
                           (update-discussion))))
                   dids)]
    (biff/submit-tx ctx txns)))

(defn mark-message-seen!
  [{:keys [biff/db] :as ctx} uid did mid now]
  {:pre [(uuid? mid) (uuid? uid) (uuid? did) (inst? now)]}
  (let [d (by-id db did)
        new-d (-> d
                  (update :discussion/last_message_read assoc uid mid)
                  (update-discussion now))]
    (biff/submit-tx ctx [new-d])
    new-d))

(defn archive! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (by-id db did)
        archive-at (:discussion/archived_at d {})
        d (assoc d :discussion/archived_at (assoc archive-at uid now))]
    (biff/submit-tx ctx [(update-discussion d now)])
    d))

(defn subscribe!
  ([ctx uid did]
   (subscribe! ctx uid did (java.util.Date.)))
  ([{:keys [biff/db] :as ctx} uid did now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [d (by-id db did)
         _ (assert d)
         updated-d (-> d
                       (update :discussion/subscribers conj uid)
                       (update-discussion now))]
     (biff/submit-tx ctx [updated-d])
     updated-d)))

(defn unsubscribe! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (by-id db did)
        _ (assert d)
        updated-d (-> d
                      (update :discussion/subscribers disj uid)
                      (update-discussion now))]
    (biff/submit-tx ctx [updated-d])
    updated-d))

(defn add-member!
  [{:keys [biff/db] :as ctx} p]
  (let [d (by-id db (:discussion/id p))
        new-d (-> d
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members conj (:user/id p)))]
    (biff/submit-tx ctx [(update-discussion new-d)])))

(defn remove-members!
  [{:keys [biff/db] :as ctx} did uids]
  {:pre [(uuid? did) (every? uuid? uids)]}
  (let [d (by-id db did)
        new-d (-> d
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members set/difference (set uids)))]
    (biff/submit-tx ctx [(update-discussion new-d)])))

