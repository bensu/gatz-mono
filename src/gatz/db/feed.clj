(ns gatz.db.feed
  (:require [crdt.ulid :as ulid]
            [clojure.set :as set]
            [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn new-feed-item-id []
  (ulid/random-time-uuid))

(def ref-type->validation-fn
  {:gatz/contact uuid?
   :gatz/contact_request uuid?
   :gatz/group ulid/ulid?
   :gatz/discussion uuid?
   :gatz/user uuid?
   :gatz/invite_link ulid/ulid?})

(def feed-type->ref-type
  {:feed.type/new_request :gatz/contact_request
   :feed.type/new_friend :gatz/contact
   :feed.type/new_friend_of_friend :gatz/contact
   :feed.type/new_user_invited_by_friend :gatz/user
   :feed.type/added_to_group :gatz/group
   :feed.type/new_post :gatz/discussion
   :feed.type/mentioned_in_discussion :gatz/discussion
   :feed.type/accepted_invite :gatz/invite_link})

(def feed-types (set (keys feed-type->ref-type)))

(defn validate-item-ref? [{:keys [feed_type ref_type ref] :as _opts}]
  (let [valid? (get ref-type->validation-fn ref_type)
        expected-ref-type (get feed-type->ref-type feed_type)]
    (boolean
     (and valid?
          (valid? ref)
          (some? expected-ref-type)
          (= ref_type expected-ref-type)))))

(defn new-item
  [{:keys [id now uids group_id contact_id contact_request_id feed_type mid] :as opts}]
  {:pre [(or (nil? id) (uuid? id))
         (or (nil? now) (inst? now))
         (or (nil? mid) (uuid? mid))
         (set? uids) (every? uuid? uids)
         (contains? feed-types feed_type)
         (validate-item-ref? opts)]}
  (let [now (or now (Date.))
        {:keys [ref_type ref feed_type]} opts]
    {:xt/id (or id (new-feed-item-id))
     :db/type :gatz/feed_item
     :db/version 1
     :feed/created_at now
     :feed/updated_at now
     :feed/uids uids
     :feed/dismissed_by #{}
     :feed/hidden_for #{}
     :feed/feed_type feed_type
     :feed/seen_at {}
     :feed/mid mid
     :feed/ref_type ref_type
     :feed/ref ref
     :feed/group group_id
     :feed/contact contact_id
     :feed/contact_request contact_request_id}))

(defn new-evt [feed-item]
  {:pre [(uuid? (:xt/id feed-item))]
   :post [(uuid? (:xt/id %))]}
  {:xt/id (new-feed-item-id)
   :db/type :gatz/evt
   :db/version 1
   :evt/uid (:feed/contact feed-item)
   :evt/ts (:feed/created_at feed-item)
   :evt/feed_item (:xt/id feed-item)
   :evt/type :feed_item/new})

(defn- new-cr-item [id contact-request]
  {:pre [(uuid? id)]}
  (let [{:contact_request/keys [to from created_at]} contact-request]
    (new-item {:id id
               :uids #{to}
               :contact_id from
               :now created_at
               :feed_type :feed.type/new_request
               :ref_type :gatz/contact_request
               :ref (:xt/id contact-request)})))

(defn new-cr-item-txn [id contact-request]
  (let [cr-item (new-cr-item id contact-request)]
    [[:xtdb.api/put (-> cr-item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt cr-item) (assoc :db/op :create))]]))

(defn- accepted-cr-item [id now contact-request]
  (let [{:contact_request/keys [to from]} contact-request]
    (new-item {:id id
               :uids #{from} ;; visible to the requester
               :contact_id to ;; about the responder
               :now now
               :feed_type :feed.type/new_friend
               :ref_type :gatz/contact
               :ref to})))

(defn accepted-cr-item-txn [id now contact-request]
  (let [cr-item (accepted-cr-item id now contact-request)]
    [[:xtdb.api/put (-> cr-item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt cr-item) (assoc :db/op :create))]]))

(defn- added-to-group [id now {:keys [members group added_by]}]
  {:pre [(set? members) (every? uuid? members)
         (uuid? id) (inst? now) (uuid? added_by)]}
  (new-item {:id id
             :uids members
             :now now
             :feed_type :feed.type/added_to_group
             :ref_type :gatz/group
             :contact_id added_by
             :group_id (:xt/id group)
             :ref (:xt/id group)}))

(defn added-to-group-txn [id now {:keys [members group added_by]}]
  (let [item (added-to-group id now {:members members :group group :added_by added_by})]
    [[:xtdb.api/put (-> item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt item) (assoc :db/op :create))]]))

(defn- new-user-item [id now {:keys [members uid invited_by_uid]}]
  {:pre [(set? members) (every? uuid? members)
         (uuid? id) (inst? now)
         (uuid? uid) (uuid? invited_by_uid)]}
  (new-item {:id id
             :uids (-> members
                       (disj uid)
                       (disj invited_by_uid))
             :now now
             :feed_type :feed.type/new_user_invited_by_friend
             :ref_type :gatz/user
             :contact_id invited_by_uid
             :ref uid}))

(defn new-user-item-txn [id now {:keys [members uid invited_by_uid]}]
  (let [item (new-user-item id now {:members members :uid uid :invited_by_uid invited_by_uid})]
    [[:xtdb.api/put (-> item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt item) (assoc :db/op :create))]]))

(defn- new-post [id now {:keys [members cid gid did] :as _opts}]
  {:pre [(set? members) (every? uuid? members)
         (uuid? id) (inst? now)
         (uuid? cid) (or (nil? gid) (ulid/ulid? gid))
         (uuid? did)]}
  (new-item {:id id
             :uids (conj members cid)
             :now now
             :group_id gid
             :contact_id cid
             :ref did
             :ref_type :gatz/discussion
             :feed_type :feed.type/new_post}))

(defn new-post-txn [id now opts]
  (let [item (new-post id now opts)]
    [[:xtdb.api/put (-> item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt item) (assoc :db/op :create))]]))

(defn- new-mention [id now {:keys [by_uid to_uid did gid mid]}]
  {:pre [(uuid? id)
         (inst? now)
         (uuid? by_uid) (uuid? to_uid)
         (uuid? did) (or (nil? gid) (ulid/ulid? gid))]}
  (new-item {:id id
             :uids #{to_uid}
             :now now
             :contact_id by_uid
             :mid mid
             :group_id gid
             :feed_type :feed.type/mentioned_in_discussion
             :ref_type :gatz/discussion
             :ref did}))

(defn- accepted-invite-item [id now {:keys [uid invite_link_id contact_id]}]
  {:pre [(uuid? id)
         (inst? now)
         (uuid? uid)
         (ulid/ulid? invite_link_id)
         (uuid? contact_id)]}
  (new-item {:id id
             :uids #{uid}
             :now now
             :contact_id contact_id
             :feed_type :feed.type/accepted_invite
             :ref_type :gatz/invite_link
             :ref invite_link_id}))

(defn accepted-invite-item-txn [id now {:keys [uid invite_link_id contact_id]}]
  (let [item (accepted-invite-item id now {:uid uid :invite_link_id invite_link_id :contact_id contact_id})]
    [[:xtdb.api/put (-> item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt item) (assoc :db/op :create))]]))

(defn new-mention-txn [id now {:keys [by_uid to_uid did gid mid]}]
  (let [item (new-mention id now {:by_uid by_uid :to_uid to_uid :did did :gid gid :mid mid})]
    [[:xtdb.api/put (-> item (assoc :db/op :create))]
     [:xtdb.api/put (-> (new-evt item) (assoc :db/op :create))]]))

;; ======================================================================
;; Transactions

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (xtdb/entity db id))

(defn all-by-did [db did]
  {:pre [(uuid? did)]}
  (q db '{:find [feed-item created-at]
          :in [did]
          :where [[feed-item :db/type :gatz/feed_item]
                  [feed-item :feed/ref did]
                  [feed-item :feed/created_at created-at]
                  [feed-item :feed/ref_type :gatz/discussion]]}
     did))

(defn last-by-did [db did]
  {:pre [(uuid? did)]}
  (when-let [fi-id (some->> (all-by-did db did)
                            (sort-by (comp #(.getTime %) second))
                            (last)
                            (first))]
    (by-id db fi-id)))

(defn by-new-post [db did]
  {:pre [(uuid? did)]}
  (first
   (q db '{:find feed-item
           :in [did]
           :where [[feed-item :db/type :gatz/feed_item]
                   [feed-item :feed/ref did]
                   [feed-item :feed/feed_type :feed.type/new_post]
                   [feed-item :feed/ref_type :gatz/discussion]]}
      did)))

(comment
  (defn by-uid-did [db uid did]
    {:pre [(uuid? uid) (uuid? did)]}
    (first
     (q db '{:find feed-item
             :in [user-id did]
             :where [[feed-item :db/type :gatz/feed_item]
                     [feed-item :feed/uids user-id]
                     [feed-item :feed/mid mid]
                     [feed-item :feed/ref_type :gatz/discussion]
                     [feed-item :feed/ref did]]}
        uid did)))


  (defn add-mention-txn-fn
    [xtdb-ctx {:keys [feed_item] :as _args}]
    (let [db (xtdb.api/db xtdb-ctx)
          {:feed/keys [uids ref]} feed_item
        ;; we only support one to_uid for mentions
          to_uid (first uids)
          existing-mention (by-uid-did db to_uid ref)]
    ;; This means that if multiple people mention me in a discussion,
    ;; only the first one counts as mentioning me
      (when-not (some? existing-mention)
        [[:xtdb.api/put (assoc feed_item :db/op :create)]])))


  (def ^{:doc "This function will be stored in the db which is why it is an expression"}
    add-mention-expr
    '(fn add-mention-fn [ctx args]
       (gatz.db.feed/add-mention-txn-fn ctx args))))


(defn dismiss-item-txn-fn [xtdb-ctx {:keys [id uid now]}]
  (let [db (xtdb/db xtdb-ctx)]
    (when-let [item (by-id db id)]
      [[:xtdb.api/put (-> item
                          (assoc :feed/updated_at now)
                          (update :feed/dismissed_by conj uid)
                          (assoc :db/op :update))]])))


(def dismiss-item-expr
  '(fn dismiss-item-fn [xtdb-ctx args]
     (gatz.db.feed/dismiss-item-txn-fn xtdb-ctx args)))

(defn dismiss! [{:keys [biff/db] :as ctx} uid id]
  {:pre [(uuid? uid) (uuid? id)]}
  (let [args {:id id :uid uid :now (Date.)}
        txns  [[:xtdb.api/fn :gatz.db.feed/dismiss-item args]]
        db-after (xtdb/with-tx db txns)]
    (assert (some? db-after) "Transaction would've failed")
    (biff/submit-tx ctx txns)
    {:item (by-id db-after id)}))

(defn max-date [^Date a ^Date b]
  (if (.after a b) a b))

(defn mark-seen-txn-fn [xtdb-ctx {:keys [ids uid now]}]
  (let [db (xtdb/db xtdb-ctx)]
    (->> ids
         (map (partial by-id db))
         (mapv (fn [item]
                 [:xtdb.api/put (-> item
                                    (assoc :feed/updated_at now)
                                    (update :feed/seen_at #(update (or % {}) uid (fn [d]
                                                                                   (if d
                                                                                     (max-date d now)
                                                                                     now))))
                                    (assoc :db/op :update))])))))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  mark-seen-expr
  '(fn mark-seen-fn [xtdb-ctx args]
     (gatz.db.feed/mark-seen-txn-fn xtdb-ctx args)))

(defn mark-many-seen! [ctx uid ids now]
  {:pre [(uuid? uid) (set? ids) (every? uuid? ids)]}
  (let [args {:ids ids :uid uid :now now}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.feed/mark-seen args]])))

(defn add-uids-txn [xtdb-ctx {:keys [id uids]}]
  {:pre [(uuid? id) (set? uids) (every? uuid? uids)]}
  (let [db (xtdb/db xtdb-ctx)
        item (by-id db id)]
    [:xtdb.api/put (-> item
                       (update :feed/uids set/union uids)
                       (assoc :db/op :update))]))

(defn add-uids-to-dids-items-txn [xtdb-ctx {:keys [dids uids] :as _args}]
  {:pre [(set? dids) (every? uuid? dids)
         (set? uids) (every? uuid? uids)]}
  (let [db (xtdb/db xtdb-ctx)]
    (->> dids
         (keep (fn [did]
                 (when-let [fi-id (by-new-post db did)]
                   (add-uids-txn xtdb-ctx {:id fi-id :uids uids}))))
         vec)))

(def add-uids-to-dids-items-expr
  '(fn add-uids-to-dids-items-fn [xtdb-ctx args]
     (gatz.db.feed/add-uids-to-dids-items-txn xtdb-ctx args)))

(def tx-fns
  {:gatz.db.feed/dismiss-item dismiss-item-expr
   :gatz.db.feed/add-uids-to-dids add-uids-to-dids-items-expr
   :gatz.db.feed/mark-seen mark-seen-expr})

;; ======================================================================
;; Queries

;; TODO: this should have the contact_request
(defn for-user-with-ts
  ([db user-id]
   (for-user-with-ts db user-id {}))
  ([db user-id {:keys [older-than-ts younger-than-ts contact_id group_id limit]}]
   {:pre [(uuid? user-id)
          (or (nil? limit) (pos-int? limit))
          (or (nil? older-than-ts) (inst? older-than-ts))
          (or (nil? younger-than-ts) (inst? younger-than-ts))
          (or (nil? contact_id) (uuid? contact_id))
          (or (nil? group_id) (ulid/ulid? group_id))]}
   (let [limit (or limit 20)]
     (->> (q db {:find '[created-at (pull id [*]) (pull ref [*])]
                 :in '[uid cid gid older-than-ts younger-than-ts]
                 :limit limit
                 :order-by '[[created-at :desc]]
                 :where (cond-> '[[id :db/type :gatz/feed_item]
                                  [id :feed/uids uid]
                                  [id :feed/created_at created-at]
                                  [id :feed/ref ref]]
                          contact_id (conj '[id :feed/contact cid])
                          group_id (conj '[id :feed/group gid])
                          older-than-ts (conj '[(< created-at older-than-ts)])
                          younger-than-ts (conj '[(< younger-than-ts created-at)]))}
             user-id contact_id group_id older-than-ts younger-than-ts)
          (map (fn [[_created-at item ref]]
                 (if ref
                   (assoc item :feed/ref ref)
                   item)))))))
                     