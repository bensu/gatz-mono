(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.util :as db.util]
            [gatz.schema :as schema]
            [malli.core :as m]
            [medley.core :refer [map-vals]]
            [xtdb.api :as xtdb]))

;; ======================================================================
;; Migrations

(def migration-client-id #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95")

(defn v0->v1 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> (merge crdt.user/user-defaults data)
        (assoc :crdt/clock clock
               :db/version 1
               :db/doc-type :gatz.crdt/user
               :db/type :gatz/user)
        (update :user/updated_at #(crdt/->MinWins %))
        (update :user/last_active #(crdt/->MaxWins %))
        (update :user/avatar #(crdt/->LWW clock %))
        (update :user/push_tokens #(crdt/->LWW clock %))
        (update-in [:user/settings :settings/notfications]
                   (fn [np]
                     (map-vals  #(crdt/->LWW clock %) np))))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}])

;; ====================================================================== 
;; User

(defn by-name [db username]
  {:pre [(string? username) (not (empty? username))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [username]
                   :where [[u :user/name username]
                           [u :db/type :gatz/user]]}
                 username)]
    ;; TODO: there is a way to guarantee uniqueness of usernames with biff
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first
         (db.util/->latest-version all-migrations))))

(defn by-phone [db phone]
  {:pre [(string? phone) (not (empty? phone))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [phone]
                   :where [[u :user/phone_number phone]
                           [u :db/type :gatz/user]]}
                 phone)]
    ;; TODO: there is a way to guarantee uniqueness of phones with biff
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first
         (db.util/->latest-version all-migrations))))

(defn get-all-users [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/user]]}))


(defn create-user!
  [{:keys [biff/db] :as ctx} {:keys [username phone id]}]

  {:pre [(crdt.user/valid-username? username)]}

  (assert (nil? (by-name db username)))

  (let [user (crdt.user/new-user {:id id :phone phone :username username})]
    (biff/submit-tx ctx [(assoc user :db/doc-type :gatz.crdt/user)])
    user))

(defn by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (-> (xtdb/entity db user-id)
      (db.util/->latest-version all-migrations)))

(defn mark-user-active!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id) (some? db)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/last_active (java.util.Date.))
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))


(defn add-push-token!
  [{:keys [biff/db] :as ctx} {:keys [user-id push-token]}]

  {:pre [(uuid? user-id)
         (m/validate schema/PushTokens push-token)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens push-token)
                           (update :user/settings assoc :settings/notifications crdt.user/notifications-on)
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn remove-push-tokens!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens nil)
                           (update :user/settings assoc :settings/notifications crdt.user/notifications-off)
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn turn-off-notifications! [{:keys [biff/db] :as ctx} uid]
  {:pre [(uuid? uid)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (update :user/settings assoc :settings/notifications crdt.user/notifications-off)
                         (crdt.user/update-user))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn edit-notifications!
  [{:keys [biff/db] :as ctx} uid notification-settings]
  {:pre [(uuid? uid)
         ;; TODO: This should allow a subset of the notification-preferences schema
         #_(m/validate schema/notification-preferences notification-settings)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (crdt.user/update-user)
                         (update-in [:user/settings :settings/notifications] #(merge % notification-settings)))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn update-user-avatar!

  [{:keys [biff/db] :as ctx} user-id avatar–url]
  {:pre [(uuid? user-id) (string? avatar–url)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/avatar avatar–url)
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

(defn user-last-active [db uid]

  {:pre [(uuid? uid)]
   :post [(or (nil? %) (inst? %))]}

  (let [r (q db '{:find [activity-ts]
                  :in [user-id]
                  :order-by [[activity-ts :desc]]
                  :where [[uid :xt/id user-id]
                          [uid :db/type :gatz/user]
                          [uid :user/last_active activity-ts]]}
             uid)]
    (ffirst r)))

