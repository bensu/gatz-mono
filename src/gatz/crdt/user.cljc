(ns gatz.crdt.user
  (:require [clojure.string :as str]
            [clojure.test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [medley.core :refer [map-vals filter-vals]]
            #?(:clj [taoensso.nippy :as nippy])
            #?(:clj [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]))
  (:import [java.util Date]))

(def MIN_LENGTH_USERNAME 3)
(def MAX_LENGTH_USERNAME 20)

(defn valid-username? [s]
  (boolean
   (and (string? s)
        (= s (str/lower-case s))
        (<= (count s) MAX_LENGTH_USERNAME)
        (<= MIN_LENGTH_USERNAME (count s))
        (re-matches #"^[a-z0-9._-]+$" s))))

(def user-defaults
  {:db/type :gatz/user
   :db/doc-type :gatz/user
   :user/avatar nil
   :user/push_tokens nil
   :user/is_test false
   :user/is_admin false})

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

(defn notifications-off-crdt [clock]
  (crdt/->lww-map notifications-off clock))

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

(defn notifications-on-crdt [clock]
  (crdt/->lww-map notifications-on clock))

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

(defn new-user [{:keys [id phone username]}]

  {:pre [(valid-username? username)]}

  (let [uid (or id (random-uuid))
        now (Date.)
        clock (crdt/new-hlc uid now)
        u {:xt/id uid
           :db/type :gatz/user
           :db/version 1
           :crdt/clock clock
           :user/created_at now
           :user/is_test false
           :user/is_admin false
           :user/name username
           :user/phone_number phone
           :user/updated_at (crdt/->MaxWins now)
           :user/last_active (crdt/->MaxWins now)
           :user/avatar (crdt/->LWW clock nil)
           :user/push_tokens (crdt/->LWW clock nil)
           :user/settings {:settings/notfications (notifications-off-crdt clock)}}]
    u))


(defn ->value [u]
  (crdt/-value u))

(defn apply-delta [user delta]
  (crdt/-apply-delta user delta))

(defn ->friend [u]
  (select-keys u schema/friend-keys))