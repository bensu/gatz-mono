(ns gatz.db.group
  (:require [com.biffweb :as biff :refer [q]]
            [gatz.schema :as schema]
            [malli.util :as mu]
            [malli.core :as m]
            [medley.core :refer [dissoc-in]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ======================================================================
;; Data model

(defn new-group
  [{:keys [now id owner members
           name avatar description]}]

  {:pre [(or (nil? id) (uuid? id))
         (or (nil? now) (inst? now))
         (uuid? owner)
         (string? name)
         (or (nil? avatar) (string? avatar))
         (or (nil? description) (string? description))
         (set? members) (every? uuid? members)]}

  (let [id (or id (random-uuid))
        now (or now (Date.))]
    {:xt/id id
     :db/version 1
     :db/type :gatz/group
     :group/name name
     :group/description description
     :group/avatar avatar
     :group/owner owner
     :group/created_by owner
     :group/members (conj members owner)
     :group/admins #{owner}
     :group/created_at now
     :group/updated_at now
     :group/joined_at {owner now}}))

;; ======================================================================
;; Queries

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (xtdb/entity db id))

(defn create! [{:keys [biff.xtdb/node] :as ctx} group-opts]
  (let [id (or (:id group-opts) (random-uuid))]
    (biff/submit-tx ctx [(-> (assoc group-opts :id id)
                             new-group
                             (assoc :db/op :create)
                             (assoc :db/doc-type :gatz/group))])
    (by-id (xtdb/db node) id)))

(defn by-member-uid [db uid]
  (xtdb/q db
          '{:find (pull g [*])
            :in [uid]
            :where [[g :db/type :gatz/group]
                    [g :group/members uid]]}
          uid))

(defn members-in-common [db aid bid]
  {:pre [(uuid? aid) (uuid? bid)]}
  (xtdb/q db
          '{:find (pull g [*])
            :in [aid bid]
            :where [[g :db/type :gatz/group]
                    [g :group/members aid]
                    [g :group/members bid]]}
          aid bid))

;; ======================================================================
;; Actions

(def Action
  [:or
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/update-attrs]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/name {:optional true} string?]
                    [:group/description {:optional true} string?]
                    [:group/avatar {:optional true} string?]])]]
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/remove-member]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/members schema/UserId]])]]
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/add-member]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/members schema/UserId]])]]
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/remove-admin]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/admins schema/UserId]])]]
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/add-admin]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/admins schema/UserId]])]]
   [:map
    [:xt/id schema/GroupId]
    [:group/action [:enum :group/transfer-ownership]]
    [:group/by_uid schema/UserId]
    [:group/delta (mu/closed-schema
                   [:map
                    [:group/updated_at inst?]
                    [:group/owner schema/UserId]])]]])


(defmulti apply-action
  (fn [_group action]
    (:group/action action)))

(defmethod apply-action :group/update-attrs
  [group {:group/keys [delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (merge (select-keys delta [:group/name
                                 :group/description
                                 :group/avatar]))))

(defmethod apply-action :group/add-member
  [group {:group/keys [delta]}]
  (let [ts (:group/updated_at delta)
        to-be-added (:group/members delta)]
    (if (contains? (:group/members group) to-be-added)
      group
      (-> group
          (assoc :group/updated_at ts)
          (update :group/members conj to-be-added)
          (assoc-in [:group/joined_at to-be-added] ts)))))

(defmethod apply-action :group/remove-member
  [group {:group/keys [delta]}]
  (let [to-be-removed (:group/members delta)]
    (-> group
        (assoc :group/updated_at (:group/updated_at delta))
        (update :group/members disj to-be-removed)
        (update :group/admins disj to-be-removed)
        (dissoc-in [:group/joined_at to-be-removed]))))

(defmethod apply-action :group/add-admin
  [group {:group/keys [delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (update :group/admins conj (:group/admins delta))))

(defmethod apply-action :group/remove-admin
  [group {:group/keys [delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (update :group/admins disj (:group/admins delta))))

(defmethod apply-action :group/transfer-ownership
  [group {:group/keys [delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (assoc :group/owner (:group/owner delta))))

;; ======================================================================
;; Permissions

(defmulti authorized-for-action?
  (fn [_group action]
    (:group/action action)))

;; Any admin can edit the group's attributes
(defmethod authorized-for-action? :group/update-attrs
  [{:group/keys [admins]} {:group/keys [by_uid]}]
  (contains? admins by_uid))

;; Any admin can add or remove members
(defmethod authorized-for-action? :group/add-member
  [{:group/keys [admins]} {:group/keys [by_uid]}]
  (contains? admins by_uid))

;; Members can leave the group, the owner can't
(defmethod authorized-for-action? :group/remove-member
  [{:group/keys [admins owner]} {:group/keys [by_uid delta]}]
  ;; The member can remove themselves if they want to
  (let [to-be-removed (:group/members delta)]
    (and (not= owner to-be-removed)
         (or (= by_uid to-be-removed)
             (contains? admins by_uid)))))

;; Only owners can add or remove admins
(defmethod authorized-for-action? :group/add-admin
  [{:group/keys [members owner]} {:group/keys [by_uid delta]}]
  ;; You can only make one of the existing members an admin
  (let [to-be-added (:group/admins delta)]
    (and (= by_uid owner) (contains? members to-be-added))))

(defmethod authorized-for-action? :group/remove-admin
  [{:group/keys [owner]} {:group/keys [by_uid delta]}]
  ;; Owner can't stop being an admin
  (let [to-be-removed (:group/admins delta)]
    (and (not= owner to-be-removed)
         (= by_uid owner))))

;; Only owners can transfer ownership
(defmethod authorized-for-action? :group/transfer-ownership
  [{:group/keys [owner admins]} {:group/keys [by_uid delta]}]
  ;; They already need to be an admin
  (let [to-be-transferred (:group/owner delta)]
    (and (= by_uid owner) (contains? admins to-be-transferred))))

(defn apply-action-txn [xtdb-ctx {:keys [action] :as _args}]
  (let [{:keys [xt/id]} action
        db (xtdb.api/db xtdb-ctx)
        group (gatz.db.group/by-id db id)]
    (when (m/validate Action action)
      (when (authorized-for-action? group action)
        (let [updated-group (apply-action group action)]
          [[:xtdb.api/put updated-group]])))))

(def apply-action-expr
  '(fn apply-action-fn [xtdb-ctx args]
     (gatz.db.group/apply-action-txn xtdb-ctx args)))

(def tx-fns
  {:gatz.db.group/apply-action apply-action-expr})

(defn apply-action!

  [{:keys [biff/db auth/user-id] :as ctx} gid action]

  {:pre [(uuid? gid)]}

  (let [attributed-action (assoc action :group/by_uid user-id)]
    (if (true? (m/validate Action attributed-action))
      (let [txn [[:xtdb.api/fn :gatz.db.group/apply-action {:action attributed-action}]]]
        (if-let [db-after (xtdb.api/with-tx db txn)]
          (do
            (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txn)
            {:group (by-id db-after gid)})
          (assert false "Transaction would've been invalid")))
      (assert false "Invalid action"))))