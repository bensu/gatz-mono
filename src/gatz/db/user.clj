(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.message :as crdt.message]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.message :as db.message]
            [gatz.schema :as schema]
            [malli.core :as m]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]))

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
           ;; XXX: we can't guarantee uniqueness of usernames
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first)))

(defn by-phone [db phone]
  {:pre [(string? phone) (not (empty? phone))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [phone]
                   :where [[u :user/phone_number phone]
                           [u :db/type :gatz/user]]}
                 phone)]
           ;; XXX: we can't guarantee uniqueness of phones
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first)))

(defn get-all-users [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/user]]}))


(def MIN_LENGTH_USERNAME 3)
(def MAX_LENGTH_USERNAME 20)

(defn valid-username? [s]
  (boolean
   (and (string? s)
        (= s (str/lower-case s))
        (<= (count s) MAX_LENGTH_USERNAME)
        (<= MIN_LENGTH_USERNAME (count s))
        (re-matches #"^[a-z0-9._-]+$" s))))

(def notifications-off
  {:settings.notification/overall false
   :settings.notification/activity :settings.notification/none
   :settings.notification/subscribe_on_comment false
   :settings.notification/suggestions_from_gatz false

   ;; :settings.notification/comments_to_own_post false
   ;; :settings.notification/reactions_to_own_post false
   ;; :settings.notification/replies_to_comment false
   ;; :settings.notification/reactions_to_comment false
   ;; :settings.notification/at_mentions false
   })

(def notifications-on
  {:settings.notification/overall true
   :settings.notification/activity :settings.notification/daily
   :settings.notification/subscribe_on_comment true
   :settings.notification/suggestions_from_gatz true

   ;; :settings.notification/comments_to_own_post true
   ;; :settings.notification/reactions_to_own_post true
   ;; :settings.notification/replies_to_comment true
   ;; :settings.notification/reactions_to_comment true
   ;; :settings.notification/at_mentions true
   })

(def user-defaults
  {:db/type :gatz/user
   :db/doc-type :gatz/user
   :user/avatar nil
   :user/push_tokens nil
   :user/is_test false
   :user/is_admin false})

(defn update-user
  ([u] (update-user u (java.util.Date.)))
  ([u now]
   (cond-> (merge user-defaults
                  {:user/last_active now}
                  u)

     (nil? (:user/settings u))
     (update-in [:user/settings :settings/notifications]
                #(merge (if (:user/push_tokens u)
                          notifications-on
                          notifications-off)
                        %))

     true (assoc :db/doc-type :gatz/user)
     true (assoc :user/updated_at now))))

(defn create-user! [{:keys [biff/db] :as ctx} {:keys [username phone id]}]

  {:pre [(valid-username? username)]}

  (assert (nil? (by-name db username)))

  (let [now (java.util.Date.)
        user-id (or id (random-uuid))
        user {:xt/id user-id
              :user/name username
              :user/phone_number phone
              :user/created_at now}]
    (biff/submit-tx ctx [(update-user user now)])
    user))

(defn by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (xtdb/entity db user-id))

(defn mark-user-active!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id) (some? db)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/last_active (java.util.Date.))
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))


(defn add-push-token!
  [{:keys [biff/db] :as ctx} {:keys [user-id push-token]}]

  {:pre [(uuid? user-id)
         (m/validate schema/push-tokens push-token)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens push-token)
                           (update :user/settings assoc :settings/notifications notifications-on)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn remove-push-tokens!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens nil)
                           (update :user/settings assoc :settings/notifications notifications-off)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn turn-off-notifications! [{:keys [biff/db] :as ctx} uid]
  {:pre [(uuid? uid)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (update :user/settings assoc :settings/notifications notifications-off)
                         (update-user))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn edit-notifications!
  [{:keys [biff/db] :as ctx} uid notification-settings]
  {:pre [(uuid? uid)
         ;; TODO: This should allow a subset of the notification-preferences schema
         #_(m/validate schema/notification-preferences notification-settings)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (update-user)
                         (update-in [:user/settings :settings/notifications] #(merge % notification-settings)))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn update-user-avatar!

  [{:keys [biff/db] :as ctx} user-id avatar–url]
  {:pre [(uuid? user-id) (string? avatar–url)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/avatar avatar–url)
                           (update-user))]
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

