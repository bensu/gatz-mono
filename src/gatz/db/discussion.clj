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
  (:import [java.util Date]
           [java.time Duration]))

;; =======================================================================
;; Utils

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

;; =======================================================================
;; DB & migrations

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

(defn v2->v3 [data]
  (let [archived-uids (keys (or (:discussion/archived_at data) {}))
        clock (:crdt/clock data)]
    (-> data
        (assoc :discussion/archived_uids (crdt/lww-set clock archived-uids))
        (dissoc :discussion/archived_at)
        (assoc :db/version 3
               :db/doc-type :gatz.crdt/discussion
               :db/type :gatz/discussion))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}
   {:from 1 :to 2 :transform v1->v2}
   {:from 2 :to 3 :transform v2->v3}])

(defn by-id [db did]
  (-> (xtdb/entity db did)
      doc->crdt
      (db.util/->latest-version all-migrations)))

;; =======================================================================
;; Open discussions

(def default-open-duration (Duration/ofDays 7))

(def ^:dynamic *open-until-testing-date* nil)

(defn open-until ^Date [^Date created-at]
  (or *open-until-testing-date*
      (Date. (+ (.getTime created-at) (.toMillis default-open-duration)))))

(defn before-ts? [^Date a ^Date b]
  (<= (.getTime a) (.getTime b)))

(defn open? [{:discussion/keys [member_mode open_until]}]
  (and (= :discussion.member_mode/open member_mode)
       (or (nil? open_until)
           (before-ts? (Date.) open_until))))

;; =======================================================================
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
         (only-user-in-map-delta uid (:discussion/archived_uids delta)))))

(defmethod authorized-for-delta? :discussion.crdt/unarchive
  [d evt]
  (let [uid (:evt/uid evt)
        delta (get-in evt [:evt/data :discussion.crdt/delta])]
    (and (user-in-discussion? uid d)
         (only-user-in-map-delta uid (:discussion/archived_uids delta)))))

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

;; TODO: sometimes they are being added automatically, not by the owner
;; TODO: you can't add members after the time has passed
(defmethod authorized-for-delta? :discussion.crdt/add-members
  [d evt]
  (let [open? (= :discussion.member_mode/open (:discussion/member_mode d))
        public? (= :discussion.public_mode/public (:discussion/public_mode d))
        group? (some? (:discussion/group_id d))
        uid (:evt/uid evt)]
    (cond
      public? true
      group? open?
      :else (and open? (= uid (:discussion/created_by d))))))

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

(defn unarchive!
  ([ctx did uid]
   (unarchive! ctx did uid (Date.)))
  ([ctx did uid now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [clock (crdt/new-hlc uid now)
         delta {:crdt/clock clock
                :discussion/updated_at now
                :discussion/archived_uids {uid (crdt/lww clock false)}}
         action {:discussion.crdt/action :discussion.crdt/unarchive
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
                :discussion/archived_uids {uid (crdt/lww clock true)}}
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

;; =======================================================================
;; Queries

(def open-for-contact-opts
  [:map
   [:newer-than-ts inst?]])

(defn open-for-contact

  ([db cid]
   (open-for-contact db cid {:now (Date.)}))

  ([db cid {:keys [now]}]

   {:pre [(uuid? cid) (inst? now)]
    :post [(set? %) (every? uuid? %)]}

   (->> (q db
           '{:find [did]
             :in [cid now-ts]
             :where [[did :db/type :gatz/discussion]
                     [did :discussion/created_by cid]
                     [did :discussion/member_mode :discussion.member_mode/open]
                     [did :discussion/group_id nil]
                     [did :discussion/open_until open-until]
                     [(< now-ts open-until)]]}
           cid now)
        (map first)
        set)))

(def open-for-group-opts
  [:map
   [:newer-than-ts inst?]])

(defn open-for-group

  ([db gid]
   (open-for-group db gid {:now (Date.)}))

  ([db gid {:keys [now]}]

   {:pre [(crdt/ulid? gid) (inst? now)]
    :post [(set? %) (every? uuid? %)]}

   (->> (q db
           '{:find [did]
             :in [gid now-ts]
             :where [[did :db/type :gatz/discussion]
                     [did :discussion/group_id gid]
                     [did :discussion/member_mode :discussion.member_mode/open]
                     [did :discussion/open_until open-until]
                     [(< now-ts open-until)]]}
           gid now)
        (map first)
        set)))

(def posts-for-user-opts
  [:map
   [:older-than-ts inst?]])

(malli/=> posts-for-user
          [:function
           [:=> [:cat any? schema/UserId] [:sequential schema/DiscussionId]]
           [:=> [:cat any? schema/UserId posts-for-user-opts] [:sequential schema/DiscussionId]]])

#_(defn inspect-query-plan [node]
  (let [db (xt/db node)
        plan (xt/with-tx-log node
               (xt/q db {:find '[did]
                :in '[user-id]
                :limit 20
                :order-by '[[mentioned-at :desc]]
                :where '[[did :db/type :gatz/discussion]
                         ;; [did :discussion/mentioned_at user-id]
                         [(get-attr did :discussion/mentioned_at) [uids->ts ...]]
                         [(get uids->ts user-id) mentioned-at]
                         [(some? mentioned-at)]
                         ]}))]
    (clojure.pprint/pprint plan)))

;; There is only one mention per discussion, the first one
;; The mention includes the message where you were mentioned

;; TODO: does this scan every discussion by the user to find the mentions?
(defn mentions-for-user
  ([db uid]
   (->> (q db {:find '[did mentioned-at]
                :in '[user-id]
                :limit 20
                :order-by '[[mentioned-at :desc]]
                :where '[[did :db/type :gatz/discussion]
                         [did :discussion/members user-id]
                         [did :discussion/mentioned_at uids->ts]
                         [(get uids->ts user-id) mentioned-at]
                         [(some? mentioned-at)]
                         ]}
           uid)
        (map first))))

(defn posts-for-user
  ([db uid]
   (posts-for-user db uid {}))
  ([db uid {:keys [older-than-ts contact_id group_id]}]
   {:pre [(uuid? uid)
          (or (nil? older-than-ts) (inst? older-than-ts))
          (or (nil? contact_id) (uuid? contact_id))
          (or (nil? group_id) (crdt/ulid? group_id))]}
   (let [exclude-archive? (and (not group_id) (not contact_id))]
     (->> (q db {:find '[did created-at]
                 :in '[user-id older-than-ts cid gid]
                 :limit 20
                 :order-by '[[created-at :desc]]
                 :where (cond-> '[[did :db/type :gatz/discussion]
                                  [did :discussion/members user-id]
                                  [did :discussion/created_at created-at]]
                          contact_id       (conj '[did :discussion/created_by cid])
                          group_id         (conj '[did :discussion/group_id gid])
                          exclude-archive? (conj '(not [did :discussion/archived_uids user-id]))
                          older-than-ts    (conj '[(< created-at older-than-ts)]))}
             uid older-than-ts contact_id group_id)
          (map first)))))

(defn posts-for-group
  ([db gid uid]
   (posts-for-user db uid {:group_id gid}))
  ([db gid uid opts]
   (posts-for-user db uid (assoc opts :group_id gid))))

(def active-for-user-opts
  [:map
   [:older-than-ts inst?]])

(malli/=> active-for-user
          [:function
           [:=> [:cat any? schema/UserId] [:sequential schema/DiscussionId]]
           [:=> [:cat any? schema/UserId active-for-user-opts] [:sequential schema/DiscussionId]]])

(defn active-for-user
  ([db uid]
   (active-for-user db uid {}))
  ([db uid {:keys [older-than-ts contact_id group_id]}]
   {:pre [(uuid? uid)
          (or (nil? older-than-ts) (inst? older-than-ts))
          (or (nil? contact_id) (uuid? contact_id))
          (or (nil? group_id) (crdt/ulid? group_id))]}
   (let [exclude-archive? (and (not group_id) (not contact_id))]
     (->> (q db {:find '[did latest-activity-ts]
                 :in '[user-id older-than-ts cid gid]
                 :limit 20
                 :order-by '[[latest-activity-ts :desc]]
                 :where (cond-> '[[did :db/type :gatz/discussion]
                                  [did :discussion/active_members user-id]
                                  [did :discussion/first_message first-mid]
                                  [did :discussion/latest_message latest-mid]
                                  [(not= first-mid latest-mid)]
                                  [did :discussion/latest_activity_ts latest-activity-ts]]
                          group_id         (conj '[did :discussion/group_id gid])
                          contact_id       (conj '[did :discussion/created_by cid])
                          exclude-archive? (conj '(not [did :discussion/archived_uids user-id]))
                          older-than-ts    (conj '[(< latest-activity-ts older-than-ts)]))}
             uid older-than-ts contact_id group_id)
          (map first)))))

(defn active-for-group
  ([db gid uid]
   (active-for-user db uid {:group_id gid}))
  ([db gid uid opts]
   (active-for-user db uid (assoc opts :group_id gid))))

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

;; ======================================================================
;; Actions over many discussions

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
              ;; TODO: should dids be a set to avoid duplicating txns?
              dids)]
    (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txns)))

(defn add-member-to-dids-txn
  "Adds a user to a set of discussions"
  [_xtdb-ctx {:keys [now by-uid members dids]}]
  {:pre [(inst? now) (uuid? by-uid)
         (set? members) (every? uuid? members)
         (set? dids) (every? uuid? dids)]}
  (let [clock (crdt/new-hlc by-uid now)
        delta {:crdt/clock clock
               :discussion/updated_at now
               :discussion/members (crdt/lww-set-delta clock members)}
        action {:discussion.crdt/action :discussion.crdt/add-members
                :discussion.crdt/delta delta}]
    (mapv (fn [did]
            (let [evt (db.evt/new-evt
                       {:evt/type :discussion.crdt/delta
                        :evt/uid by-uid
                        :evt/mid nil
                        :evt/did did
                        :evt/cid by-uid
                        :evt/data action})]
              [:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]))
          (set dids))))

(defn add-member-to-group-txn
  [xtdb-ctx {:keys [gid now by-uid members]}]
  (let [db (xtdb/db xtdb-ctx)
        dids (open-for-group db gid {:now now})]
    (add-member-to-dids-txn xtdb-ctx
                            {:now now
                             :by-uid by-uid
                             :members members
                             :dids dids})))
