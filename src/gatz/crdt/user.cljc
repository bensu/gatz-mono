(ns gatz.crdt.user
  (:require [clojure.string :as str]
            [clojure.test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.schema :as schema])
  (:import [java.util Date]))

(def MIN_LENGTH_USERNAME 3)
(def MAX_LENGTH_USERNAME 20)

(defn valid-username? [s]
  (boolean
   (and (string? s)
        (= s (str/lower-case s))
        (<= (count s) MAX_LENGTH_USERNAME)
        (<= MIN_LENGTH_USERNAME (count s))
        (re-matches #"^[a-z][a-z0-9_-]+[a-z0-9]$" s))))

(def user-defaults
  {:db/type :gatz/user
   :db/doc-type :gatz/user
   :user/avatar nil
   :user/deleted_at (crdt/min-wins nil)
   :user/blocked_uids (crdt/lww-set)
   :user/push_tokens nil
   :user/is_test false
   :user/is_admin false})

(def notifications-off
  {:settings.notification/overall false
   :settings.notification/activity :settings.notification/none
   :settings.notification/subscribe_on_comment false
   :settings.notification/suggestions_from_gatz false
   :settings.notification/friend_accepted false

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
   :settings.notification/friend_accepted true

   ;; :settings.notification/comments_to_own_post true
   ;; :settings.notification/reactions_to_own_post true
   ;; :settings.notification/replies_to_comment true
   ;; :settings.notification/reactions_to_comment true
   ;; :settings.notification/at_mentions true
   })

(defn empty-links [clock]
  {:profile.urls/website (crdt/lww clock nil)
   :profile.urls/twitter (crdt/lww clock nil)})

(defn notifications-on-crdt [clock]
  (crdt/->lww-map notifications-on clock))

(defn ^:deprecated
  update-user
  ([u] (update-user u (Date.)))
  ([u now]
   (assert false)
   (cond-> (merge user-defaults u)

     (nil? (:user/settings u))
     (update :user/settings
             (fn [settings]
               (update settings :settings/notifications
                       #(merge (if (:user/push_tokens u)
                                 notifications-on
                                 notifications-off)
                               %))))

     (nil? (:user/profile u))
     (update :user/profile
             (fn [profile]
               (update profile :profile/urls #(merge (empty-links now) %))))

     true (assoc :db/doc-type :gatz/user)
     true (assoc :user/updated_at now))))

(defn new-user [{:keys [id phone username now]}]

  {:pre [(valid-username? username)]}

  (let [uid (or id (random-uuid))
        _ (assert (uuid? uid))
        now (or now (Date.))
        _ (assert (inst? now))
        clock (crdt/new-hlc uid now)]
    {:xt/id uid
     :db/type :gatz/user
     :db/version 3
     :crdt/clock clock
     :user/created_at now
     :user/is_test false
     :user/is_admin false
     :user/deleted_at (crdt/min-wins nil)
     :user/name username
     :user/phone_number phone
     :user/updated_at (crdt/max-wins now)
     :user/blocked_uids (crdt/lww-set clock #{})
     :user/avatar (crdt/lww clock nil)
     :user/push_tokens (crdt/lww clock nil)
     :user/settings {:settings/notifications (notifications-off-crdt clock)}
     :user/profile {:profile/urls {:profile.urls/website (crdt/lww clock nil)
                                   :profile.urls/twitter (crdt/lww clock nil)}}}))


(defn ->value [u]
  (crdt/-value u))

(defn apply-delta [user delta]
  (crdt/-apply-delta user delta))

(defn ->friend [u]
  (select-keys u schema/friend-keys))

(deftest user-crdt
  (testing "We can apply changes in any order"
    (let [t0 (Date.)
          now t0
          uid (random-uuid)
          initial (new-user {:id uid :now now :phone "111" :username "test"})
          clock (crdt/new-hlc uid now)
          [_ t1 t2 t3 t4 t5] (reduce (fn [acc _] (conj acc (crdt/inc-time (last acc)))) [now] (range 5))
          [c1 c2 c3 c4 c5] (mapv #(crdt/new-hlc uid %) [t1 t2 t3 t4 t5])
          avatar "https://assets.gatz.chat/test-profile-pic"
          push-tokens {:push/expo {:push/token "EXPO[TOKEN]"
                                   :push/created_at t3
                                   :push/service :push/expo}}
          np-t4 {:settings.notification/overall true
                 :settings.notification/friend_accepted true
                 :settings.notification/activity :settings.notification/daily}
          np-t5 {:settings.notification/subscribe_on_comment false
                 :settings.notification/suggestions_from_gatz true}
          deltas [{:crdt/clock c1
                   :user/updated_at t1
                   :user/push_tokens (crdt/->LWW c1 {:push/expo {:push/token "EXPO!"
                                                                 :push/created_at t1
                                                                 :push/service :push/expo}})
                   :user/avatar (crdt/->LWW c1 avatar)}
                  {:crdt/clock c2
                   :user/updated_at t2
                   :user/settings {:settings/notifications (crdt/->lww-map np-t4 c2)}}
                  {:crdt/clock c3
                   :user/updated_at t3
                   :user/settings {:settings/notifications (crdt/->lww-map np-t5 c3)}
                   :user/push_tokens (crdt/->LWW c3 push-tokens)}
                  {:crdt/clock c4
                   :user/updated_at t4
                   :user/settings {:settings/notifications (crdt/->lww-map np-t4 c4)}}
                  {:crdt/clock c5
                   :user/updated_at t5
                   :user/settings {:settings/notifications (crdt/->lww-map np-t5 c5)}}]
          final (reduce apply-delta initial (shuffle deltas))]
      (is (= {:xt/id uid
              :db/type :gatz/user
              :db/version 3
              :crdt/clock clock
              :user/created_at t0
              :user/is_test false
              :user/is_admin false
              :user/name "test"
              :user/phone_number "111"
              :user/updated_at now
              :user/avatar nil
              :user/push_tokens nil
              :user/blocked_uids #{}
              :user/deleted_at nil
              :user/profile {:profile/urls {:profile.urls/website nil
                                            :profile.urls/twitter nil}}
              :user/settings {:settings/notifications notifications-off}}
             (->value initial)))
      (is (= {:xt/id uid
              :db/type :gatz/user
              :db/version 3
              :crdt/clock c5
              :user/created_at t0
              :user/is_test false
              :user/is_admin false
              :user/name "test"
              :user/phone_number "111"
              :user/updated_at t5
              :user/avatar avatar
              :user/blocked_uids #{}
              :user/push_tokens push-tokens
              :user/deleted_at nil
              :user/profile {:profile/urls {:profile.urls/website nil
                                            :profile.urls/twitter nil}}
              :user/settings {:settings/notifications (merge np-t4 np-t5)}}
             (->value final)
             (->value (reduce apply-delta initial (shuffle (shuffle deltas)))))))))