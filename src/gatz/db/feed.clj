(ns gatz.db.feed
  (:require [crdt.ulid :as ulid]
            [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn new-feed-item-id []
  (ulid/random-time-uuid))

(def ref-type->validation-fn
  {:gatz/contact uuid?
   :gatz/contact_request uuid?
   :gatz/group ulid/ulid?
   :gatz/user uuid?})

(def feed-type->ref-type
  {:feed.type/new_request :gatz/contact_request
   :feed.type/new_friend :gatz/contact
   :feed.type/new_friend_of_friend :gatz/contact
   :feed.type/new_user_invited_by_friend :gatz/user
   :feed.type/added_to_group :gatz/group})

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
  [{:keys [id now uids group_id contact_id contact_request_id feed_type] :as opts}]
  {:pre [(or (nil? id) (uuid? id))
         (or (nil? now) (inst? now))
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
     :feed/ref_type ref_type
     :feed/ref ref
     :feed/group group_id
     :feed/contact contact_id
     :feed/contact_request contact_request_id}))

(defn new-cr-item [id contact-request]
  {:pre [(uuid? id)]}
  (let [{:contact_request/keys [to from created_at]} contact-request]
    (new-item {:id id
               :uids #{to}
               :contact_id from
               :now created_at
               :feed_type :feed.type/new_request
               :ref_type :gatz/contact_request
               :ref (:xt/id contact-request)})))

(defn accepted-cr-item [id now contact-request]
  (let [{:contact_request/keys [to from]} contact-request]
    (new-item {:id id
               :uids #{from} ;; visible to the requester
               :contact_id to ;; about the responder
               :now now
               :feed_type :feed.type/new_friend
               :ref_type :gatz/contact
               :ref to})))

(defn added-to-group [id now {:keys [members group added_by]}]
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

(defn new-user-item [id now {:keys [members uid invited_by_uid]}]
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

;; ======================================================================
;; Transactions

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (xtdb/entity db id))

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

(def tx-fns
  {:gatz.db.feed/dismiss-item dismiss-item-expr})

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
                     