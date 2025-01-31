(ns gatz.db.group
  (:require [com.biffweb :as biff :refer [q]]
            [crdt.core :as crdt]
            [clojure.set :as set]
            [gatz.db.discussion :as db.discussion]
            [gatz.schema :as schema]
            [malli.util :as mu]
            [malli.core :as m]
            [medley.core :refer [filter-keys dissoc-in]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ======================================================================
;; Data model

(def default-settings
  {:discussion/member_mode :discussion.member_mode/closed
   :invites/mode nil})

(defn new-group

  [{:keys [now id owner members
           name avatar description
           settings is_public]}]

  {:pre [(or (nil? id) (crdt/ulid? id))
         (or (nil? now) (inst? now))
         (uuid? owner)
         (string? name)
         (or (nil? avatar) (string? avatar))
         (or (nil? description) (string? description))
         (set? members) (every? uuid? members)
         (or (nil? is_public) (boolean? is_public))]}

  (when is_public
    (assert (= :discussion.member_mode/open (get settings :discussion/member_mode)))
    (assert (nil? (get settings :invites/mode))))

  (let [id (or id (crdt/random-ulid))
        now (or now (Date.))]
    {:xt/id id
     :db/version 1
     :db/type :gatz/group
     :group/name name
     :group/description description
     :group/avatar avatar
     :group/owner owner
     :group/created_by owner
     :group/is_public (if (boolean? is_public)
                        is_public
                        false)
     :group/members (conj members owner)
     :group/settings (merge default-settings settings)
     :group/archived_uids #{}
     :group/admins #{owner}
     :group/created_at now
     :group/updated_at now
     :group/joined_at {owner now}}))

;; ======================================================================
;; Queries

(def default-fields
  {:group/archived_uids #{}
   :group/is_public false
   :group/settings default-settings})

(defn by-id [db id]
  {:pre [(crdt/ulid? id)]}
  (when-let [e (xtdb/entity db id)]
    (-> (merge default-fields e)
        (update :group/settings #(merge default-settings %)))))

(defn create!
  "Returns the created group"
  [ctx group-opts]
  (let [id (or (:id group-opts) (crdt/random-ulid))
        group (-> group-opts
                  (assoc :id id)
                  new-group)]
    ;; We are going to redirect the user to the entity
    ;; Better to have it ready before they get there
    (biff/submit-tx (assoc ctx :biff.xtdb/retry true)
                    [(-> group
                         (assoc :db/op :create)
                         (assoc :db/doc-type :gatz/group))])
    group))

(defn by-member-uid
  "Returns all the groups the user is a member of"
  [db uid]
  (->> (xtdb/q db
               '{:find [(pull g [*])]
                 :in [uid]
                 :where [[g :db/type :gatz/group]
                         [g :group/members uid]]}
               uid)
       (mapv first)))

(defn ids-with-members-in-common
  "Returns group ids with the two members in common"
  [db aid bid]
  {:pre [(uuid? aid) (uuid? bid)]}
  (->> (xtdb/q db
               '{:find [g]
                 :in [aid bid]
                 :where [[g :db/type :gatz/group]
                         [g :group/members aid]
                         [g :group/members bid]]}
               aid bid)
       (map first)
       set))

(defn with-members-in-common
  "Returns groups with the two members in common"
  [db aid bid]
  {:pre [(uuid? aid) (uuid? bid)]}
  (->> (xtdb/q db
               '{:find [(pull g [*])]
                 :in [aid bid]
                 :where [[g :db/type :gatz/group]
                         [g :group/members aid]
                         [g :group/members bid]]}
               aid bid)
       (mapv first)))

;; ======================================================================
;; Actions

(def ActionTypes
  [:enum
   :group/update-attrs
   :group/remove-member
   :group/add-member
   :group/add-admin
   :group/remove-admin
   :group/leave
   :group/archive
   :group/unarchive
   :group/transfer-ownership])

(def action-types (set (rest ActionTypes)))

(def UpdateAttrsDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]
    [:group/name {:optional true} string?]
    [:group/description {:optional true} string?]
    [:group/avatar {:optional true} string?]]))

(def AddMemberDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]
    [:group/members [:set schema/UserId]]]))

(def RemoveMemberDelta AddMemberDelta)

(def AddAdminDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]
    [:group/admins [:set schema/UserId]]]))

(def RemoveAdminDelta AddAdminDelta)

(def LeaveDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]]))

(def ArchiveDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]]))

(def UnArchiveDelta ArchiveDelta)

(def TransferOwnershipDelta
  (mu/closed-schema
   [:map
    [:group/updated_at inst?]
    [:group/owner schema/UserId]]))

(def Delta
  [:or
   UpdateAttrsDelta
   AddMemberDelta
   RemoveMemberDelta
   AddAdminDelta
   RemoveAdminDelta
   TransferOwnershipDelta
   LeaveDelta
   ArchiveDelta
   UnArchiveDelta])

(def Action

  [:or
   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/archive]]
    [:group/delta ArchiveDelta]]
   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/unarchive]]
    [:group/delta UnArchiveDelta]]

   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/update-attrs]]
    [:group/delta UpdateAttrsDelta]]

   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/add-member]]
    [:group/delta AddMemberDelta]]
   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/remove-member]]
    [:group/delta RemoveMemberDelta]]

   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/leave]]
    [:group/delta LeaveDelta]]

   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/add-admin]]
    [:group/delta AddAdminDelta]]
   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/remove-admin]]
    [:group/delta RemoveAdminDelta]]

   [:map
    [:xt/id schema/GroupId]
    [:group/by_uid schema/UserId]
    [:group/action [:enum :group/transfer-ownership]]
    [:group/delta TransferOwnershipDelta]]])

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
        to-be-added (:group/members delta)
        new-joined-at (->> to-be-added
                           (map (fn [uid] [uid ts]))
                           (into {}))]
    (if (set/subset? to-be-added (:group/members group))
      group
      (-> group
          (assoc :group/updated_at ts)
          (update :group/members set/union to-be-added)
          (update :group/joined_at merge new-joined-at)))))

(defmethod apply-action :group/remove-member
  [{:group/keys [joined_at] :as group} {:group/keys [delta]}]
  (let [to-be-removed (:group/members delta)
        new-joined-at (filter-keys (complement (partial contains? to-be-removed)) joined_at)]
    (-> group
        (assoc :group/updated_at (:group/updated_at delta))
        (update :group/members set/difference to-be-removed)
        (update :group/admins set/difference to-be-removed)
        (assoc :group/joined_at new-joined-at))))

(defmethod apply-action :group/leave
  [group {:group/keys [by_uid delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (update :group/members disj by_uid)
      (update :group/admins disj by_uid)
      (dissoc-in [:group/joined_at by_uid])))

(defmethod apply-action :group/archive
  [group {:group/keys [by_uid delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (update :group/archived_uids conj by_uid)))

(defmethod apply-action :group/unarchive
  [group {:group/keys [by_uid delta]}]
  (-> group
      (assoc :group/updated_at (:group/updated_at delta))
      (update :group/archived_uids disj by_uid)))

(defmethod apply-action :group/add-admin
  [group {:group/keys [delta]}]
  (let [to-be-added (:group/admins delta)]
    (-> group
        (assoc :group/updated_at (:group/updated_at delta))
        (update :group/admins set/union to-be-added))))

(defmethod apply-action :group/remove-admin
  [group {:group/keys [delta]}]
  (let [to-be-removed (:group/admins delta)]
    (-> group
        (assoc :group/updated_at (:group/updated_at delta))
        (update :group/admins set/difference to-be-removed))))

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
  [{:group/keys [admins owner]} {:group/keys [by_uid]}]
  (or (= by_uid owner)
      (contains? admins by_uid)))

;; Any admin can add or remove members
;; You can autojoin public groups
(defmethod authorized-for-action? :group/add-member
  [{:group/keys [admins is_public]} {:group/keys [by_uid delta]}]
  (let [new-members (:group/members delta)]
    (if is_public
      (or (= #{by_uid} new-members)
          (contains? admins by_uid))
      (contains? admins by_uid))))

(defmethod authorized-for-action? :group/remove-member
  [{:group/keys [admins owner]} {:group/keys [by_uid delta]}]
  (let [to-be-removed (:group/members delta)
        admins-removed (set/intersection admins to-be-removed)]
    (and
     ;; The owner can't leave
     (not (contains? to-be-removed owner))
     ;; Only the owner can remove admins
     (or (= by_uid owner)
         (empty? admins-removed))
     ;; The member can remove themselves if they want to
     (or (= #{by_uid} to-be-removed)
         (contains? admins by_uid)))))

(defmethod authorized-for-action? :group/leave
  [{:group/keys [members owner]} {:group/keys [by_uid]}]
  (and (not= owner by_uid)
       (contains? members by_uid)))

(defmethod authorized-for-action? :group/archive
  [{:group/keys [members]} {:group/keys [by_uid]}]
  (contains? members by_uid))

(defmethod authorized-for-action? :group/unarchive
  [{:group/keys [members]} {:group/keys [by_uid]}]
  (contains? members by_uid))

;; Only owners can add or remove admins
(defmethod authorized-for-action? :group/add-admin
  [{:group/keys [members owner]} {:group/keys [by_uid delta]}]
  ;; You can only make one of the existing members an admin
  (let [to-be-added (:group/admins delta)]
    (and (= by_uid owner)
         (set/subset? to-be-added members))))

(defmethod authorized-for-action? :group/remove-admin
  [{:group/keys [owner]} {:group/keys [by_uid delta]}]
  ;; Owner can't stop being an admin
  (let [to-be-removed (:group/admins delta)]
    (and (= by_uid owner)
         (not (contains? to-be-removed owner)))))

;; Only owners can transfer ownership
(defmethod authorized-for-action? :group/transfer-ownership
  [{:group/keys [owner admins]} {:group/keys [by_uid delta]}]
  ;; They already need to be an admin
  (let [to-be-transferred (:group/owner delta)]
    (and (= by_uid owner) (contains? admins to-be-transferred))))

(defn apply-action-txn [xtdb-ctx {:keys [action] :as _args}]
  (assert action)
  (let [{:keys [xt/id]} action
        db (xtdb.api/db xtdb-ctx)
        group (gatz.db.group/by-id db id)]
    (when (m/validate Action action)
      (assert (authorized-for-action? group action))

      (when (authorized-for-action? group action)
        (let [updated-group (apply-action group action)]
          [[:xtdb.api/put updated-group]])))))

(def apply-action-expr
  '(fn apply-action-fn [xtdb-ctx args]
     (gatz.db.group/apply-action-txn xtdb-ctx args)))

(defn add-to-group-and-discussions-txn
  [xtdb-ctx {:keys [action]}]
  (let [db (xtdb/db xtdb-ctx)
        {:group/keys [by_uid delta]} action
        gid (:xt/id action)
        group (by-id db gid)
        {:group/keys [updated_at members]} delta]
    (when (authorized-for-action? group action)
      (vec
       (concat
        [[:xtdb.api/fn :gatz.db.group/apply-action {:action action}]]
        (db.discussion/add-member-to-group-txn xtdb-ctx
                                               {:gid gid :now updated_at
                                                :by-uid by_uid :members members}))))))

(def add-to-group-and-discussions-expr
  '(fn add-to-group-and-discussions-fn [xtdb-ctx args]
     (gatz.db.group/add-to-group-and-discussions-txn xtdb-ctx args)))

(def tx-fns
  {:gatz.db.group/apply-action apply-action-expr
   :gatz.db.group/add-to-group-and-discussions add-to-group-and-discussions-expr})

(defn apply-action!

  [{:keys [biff/db] :as ctx} action]

  {:post [(some? %)]}

  (let [id (:xt/id action)
        group (by-id db id)]
    (if (true? (m/validate Action action))
      (if (authorized-for-action? group action)
        (let [txns (if (= :group/add-member (:group/action action))
                     [[:xtdb.api/fn :gatz.db.group/add-to-group-and-discussions {:action action}]]
                     [[:xtdb.api/fn :gatz.db.group/apply-action {:action action}]])]
          (if-let [db-after (xtdb.api/with-tx db txns)]
            (do
              (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txns)
              {:group (by-id db-after id)})
            (assert false "Transaction would've been invalid")))
        (assert false "Unauthorized action"))
      (assert false "Invalid action"))))

(defn update-avatar! [{:keys [auth/user-id] :as ctx} group_id url]
  {:pre [(crdt/ulid? group_id) (string? url)]}
  (apply-action! ctx {:xt/id group_id
                      :group/by_uid user-id
                      :group/action :group/update-attrs
                      :group/delta {:group/updated_at (Date.)
                                    :group/avatar url}}))

;; ======================================================================
;; Public groups

(defn all-public-group-ids [db]
  (set
   (q db '{:find ?gid
           :where [[?gid :db/type :gatz/group]
                   [?gid :group/is_public true]]})))

(defn all-public-groups [db]
  (vec
   (q db '{:find (pull ?gid [*])
           :where [[?gid :db/type :gatz/group]
                   [?gid :group/is_public true]]})))


;; ======================================================================
;; Crews

(defn mark-crew [group]
  (assoc-in group [:group/settings :invites/mode] :group.invites/crew))
