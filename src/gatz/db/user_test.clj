(ns gatz.db.user-test
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.test :refer [deftest testing is are]]
            [clojure.java.io :as io]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.user :refer :all]
            [gatz.db.util :as db.util]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest test-valid-username?
  (are [s] (crdt.user/valid-username? s)
    "ameesh" "grantslatton" "sebas" "devon" "tara" "lachy"
    "bensu"  "bensu1" "bensu_1" "bensu-1" "abc123")
  (are [s] (not (crdt.user/valid-username? s))
    "s" "bensu " "bensu 1" "1 1" "1" "123" "1bensu1" "neil.enna"
    "_bensu_" "bensu." "bensu_" "bensu-"))


(deftest migrate-existing-users
  (testing "We can migrate users we already have"
    (let [v0-users (read-string (slurp (io/resource "test/users_v0.edn")))
          v4-users (mapv #(db.util/->latest-version % all-migrations)
                         v0-users)]
      (is (= (count v0-users) (count v4-users)))
      (doseq [user v4-users]
        (is (malli/validate schema/UserCRDT user)
            (vec (:errors (malli/explain schema/UserCRDT user))))))))

(defmacro ok? [expr]
  `(do ~expr))

(deftest unique-users
  (testing "users need unique usernames"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          repeated-username "test_123"
          repeated-phone "4159499932"
          now (Date.)]
      (is (nil? (by-name (xtdb/db node) repeated-username)))
      (is (nil? (by-phone (xtdb/db node) repeated-phone)))
      (is (ok? (create-user! ctx {:id (random-uuid)
                                  :username repeated-username
                                  :phone repeated-phone
                                  :now now})))

      (xtdb/sync node)
      (let [db (xtdb/db node)]
        (is (= (by-name db repeated-username)
               (by-phone db repeated-phone)))
        (is (= repeated-phone
               (:user/phone_number (by-name db repeated-username))))
        (is (= repeated-username
               (:user/name (by-phone db repeated-phone)))))
      (is (thrown? clojure.lang.ExceptionInfo
                   (create-user! ctx {:id (random-uuid)
                                      :username repeated-username
                                      :phone "4159499933"
                                      :now now})))

      (xtdb/sync node)
      (is (thrown? clojure.lang.ExceptionInfo
                   (create-user! ctx {:id (random-uuid)
                                      :username "test_456"
                                      :phone repeated-phone
                                      :now now})))
      (xtdb/sync node)
      (is (thrown? clojure.lang.ExceptionInfo
                   (create-user! ctx {:id (random-uuid)
                                      :username repeated-username
                                      :phone repeated-phone
                                      :now now})))

      (.close node))))

(deftest user-actions
  (testing "The user actions have the right schema"
    (let [now (Date.)
          cid (random-uuid)
          blocked-uid (random-uuid)
          clock (crdt/new-hlc cid now)
          t1 (crdt/inc-time now)
          c1 (crdt/new-hlc cid t1)
          t2 (crdt/inc-time t1)
          c2 (crdt/new-hlc cid t2)
          t3 (crdt/inc-time t2)
          c3 (crdt/new-hlc cid t3)
          t4 (crdt/inc-time t3)
          c4 (crdt/new-hlc cid t4)
          t5 (crdt/inc-time t4)
          c5 (crdt/new-hlc cid t5)
          actions [{:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                    :gatz.crdt.user/delta
                    {:crdt/clock c1
                     :user/updated_at now
                     :user/avatar (crdt/->LWW c1 "https://example.com/avatar.jpg")}}
                   {:gatz.crdt.user/action :gatz.crdt.user/add-push-token
                    :gatz.crdt.user/delta
                    {:crdt/clock clock
                     :user/updated_at now
                     :user/push_tokens (crdt/->LWW clock
                                                   {:push/expo
                                                    {:push/service :push/expo
                                                     :push/token "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                                                     :push/created_at now}})
                     :user/settings {:settings/notifications
                                     (crdt.user/notifications-on-crdt clock)}}}
                   {:gatz.crdt.user/action :gatz.crdt.user/remove-push-token
                    :gatz.crdt.user/delta
                    {:crdt/clock c1
                     :user/updated_at t1
                     :user/push_tokens (crdt/->LWW c1 nil)
                     :user/settings {:settings/notifications (crdt.user/notifications-off-crdt c1)}}}
                   {:gatz.crdt.user/action :gatz.crdt.user/update-notifications
                    :gatz.crdt.user/delta
                    {:crdt/clock c2
                     :user/updated_at t2
                     :user/settings {:settings/notifications
                                     (crdt/->lww-map {:settings.notification/activity :settings.notification/daily}
                                                     c2)}}}
                   {:gatz.crdt.user/action :gatz.crdt.user/block-another-user
                    :gatz.crdt.user/delta {:crdt/clock c3
                                           :user/updated_at t3
                                           :user/blocked_uids (crdt/lww-set-delta c3 #{blocked-uid})}}
                   {:gatz.crdt.user/action :gatz.crdt.user/update-profile
                    :gatz.crdt.user/delta
                    {:crdt/clock c4
                     :user/updated_at t4
                     :user/profile {:profile/full_name (crdt/lww c4 "Test User")
                                    :profile/urls (crdt/->lww-map {:profile.urls/twitter "https://twitter.com/test"}
                                                                  c4)}}}]]
      (doseq [action actions]
        (is (malli/validate schema/UserAction action)
            (malli/explain schema/UserAction action)))

      (testing "we can apply the actions directly"
        (let [uid (random-uuid)
              system (db.util-test/test-system)
              ctx (assoc system
                         :auth/user-id uid
                         :auth/cid uid)
              node (:biff.xtdb/node system)
              get-ctx (fn [uid]
                        (assoc ctx :biff/db (xtdb/db node) :auth/user-id uid))]
          (create-user! ctx {:id uid
                             :username "test_123"
                             :phone "4159499932"
                             :now now})
          (create-user! ctx {:id blocked-uid
                             :username "blocked_user"
                             :phone "4159499931"
                             :now now})
          (xtdb/sync node)

          (let [db (xtdb/db node)
                activity-doc (activity-by-uid db uid)]
            (is-equal {:user_activity/user_id uid
                       :user_activity/last_active now}
                      (select-keys activity-doc [:user_activity/user_id :user_activity/last_active])))

          (let [later (crdt/inc-time now)]
            (mark-active! (assoc ctx :auth/user-id uid) {:now later})
            (xtdb/sync node)
            (let [db (xtdb/db node)
                  activity-doc (activity-by-uid db uid)]
              (is-equal {:user_activity/user_id uid
                         :user_activity/last_active later}
                        (select-keys activity-doc [:user_activity/user_id :user_activity/last_active]))))

          (doseq [action actions]
            (apply-action! (get-ctx uid) action))
          (xtdb/sync node)

          (let [final-user (by-id (xtdb/db node) uid)]
            (is-equal {:db/version 4,
                       :db/doc-type :gatz/user
                       :db/type :gatz/user,
                       :xt/id uid
                       :user/is_test true,
                       :user/is_admin false,
                       :user/name "test_123",
                       :user/avatar "https://example.com/avatar.jpg"
                       :user/push_tokens nil,
                       :user/phone_number "4159499932",
                       :user/created_at now
                       :crdt/clock c4
                       :user/deleted_at nil
                       :user/updated_at t4
                       :user/blocked_uids #{blocked-uid}
                       :user/profile {:profile/full_name "Test User"
                                      :profile/urls {:profile.urls/website nil
                                                     :profile.urls/twitter "https://twitter.com/test"}}
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :friend_accepted false,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}

                      (crdt.user/->value final-user)))

          (apply-action!
           (get-ctx uid)
           {:gatz.crdt.user/action :gatz.crdt.user/mark-deleted
            :gatz.crdt.user/delta {:crdt/clock c5
                                   :user/updated_at t5
                                   :user/deleted_at t5
                                   :user/profile {:profile/full_name (crdt/lww c5 nil)
                                                  :profile/urls (crdt/->lww-map {:profile.urls/twitter nil
                                                                                 :profile.urls/website nil}
                                                                                c5)}}})
          (xtdb/sync node)

          (let [deleted-user (by-id (xtdb/db node) uid)]
            (is-equal {:db/version 4,
                       :db/doc-type :gatz/user
                       :db/type :gatz/user,
                       :xt/id uid
                       :user/is_test true,
                       :user/is_admin false,
                       :user/name "[deleted]",
                       :user/avatar nil
                       :user/push_tokens nil,
                       :user/phone_number nil
                       :user/created_at now
                       :crdt/clock c5
                       :user/deleted_at t5
                       :user/updated_at t5
                       :user/blocked_uids #{blocked-uid}
                       :user/profile {:profile/full_name nil
                                      :profile/urls {:profile.urls/website nil
                                                     :profile.urls/twitter nil}}
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :friend_accepted false,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}

                      (crdt.user/->value deleted-user)))

          (.close node)))

      (testing "we can apply the actions through named functions"
        (let [uid (random-uuid)
              system (db.util-test/test-system)
              ctx (assoc system
                         :auth/user-id uid
                         :auth/cid uid)
              node (:biff.xtdb/node system)
              get-ctx (fn [uid]
                        (assoc ctx :biff/db (xtdb/db node) :auth/user-id uid))
              t1 (crdt/inc-time now)
              t2 (crdt/inc-time t1)
              t3 (crdt/inc-time t2)
              t4 (crdt/inc-time t3)
              t5 (crdt/inc-time t4)
              t6 (crdt/inc-time t5)
              t7 (crdt/inc-time t6)
              t8 (crdt/inc-time t7)
              [_c1 _c2 _c3 _c4 _c5 _c6 c7 c8] (mapv (partial crdt/new-hlc uid) [t1 t2 t3 t4 t5 t6 t7 t8])]
          (create-user! ctx {:id uid
                             :username "test_456"
                             :phone "4159499932"
                             :now now})
          (create-user! ctx {:id blocked-uid
                             :username "blocked_user"
                             :phone "4159499931"
                             :now now})
          (xtdb/sync node)

          (testing "the created user gets a corresponding contact lists"
            (let [db (xtdb/db node)
                  contacts (db.contacts/by-uid db uid)]
              (is-equal {:contacts/user_id uid
                         :contacts/ids #{}}
                        (select-keys contacts [:contacts/user_id :contacts/ids :contacts/requests_made :contacts/requests_received]))
              (testing "and if you try to create additional contact lists you fail"
                (is (thrown? clojure.lang.ExceptionInfo
                             (biff/submit-tx ctx [(new-contacts-txn {:uid uid :now now})]))))))

          (mark-active! (get-ctx uid) {:now t1})
          (update-avatar! (get-ctx uid) "https://example.com/avatar.jpg" {:now t2})
          (add-push-token! (get-ctx uid)
                           {:push-token {:push/expo
                                         {:push/service :push/expo
                                          :push/token "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                                          :push/created_at now}}}
                           {:now t3})
          (remove-push-tokens! (get-ctx uid) {:now t4})
          (edit-notifications! (get-ctx uid)
                               {:settings.notification/activity :settings.notification/daily}
                               {:now t5})
          (block-user! (get-ctx uid) blocked-uid {:now t6})
          (edit-profile! (get-ctx uid) {:profile/full_name "Test User"
                                        :profile/urls {:profile.urls/twitter "https://twitter.com/test"}}
                         {:now t7})
          (xtdb/sync node)

          (let [final-user (by-id (xtdb/db node) uid)]
            (is-equal {:xt/id uid
                       :db/type :gatz/user,
                       :user/is_test true,
                       :user/is_admin false,
                       :user/name "test_456",
                       :user/avatar "https://example.com/avatar.jpg"
                       :db/doc-type :gatz/user
                       :user/blocked_uids #{blocked-uid}
                       :db/version 4,
                       :user/push_tokens nil,
                       :user/phone_number "4159499932",
                       :user/created_at now
                       :crdt/clock c7
                       :user/deleted_at nil
                       :user/updated_at t7
                       :user/profile {:profile/full_name "Test User"
                                      :profile/urls {:profile.urls/website nil
                                                     :profile.urls/twitter "https://twitter.com/test"}}
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :friend_accepted false,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}
                      (crdt.user/->value final-user)))

          (mark-deleted! (get-ctx uid) {:now t8})
          (xtdb/sync node)

          (let [deleted-user (by-id (xtdb/db node) uid)]
            (is-equal {:xt/id uid
                       :db/type :gatz/user,
                       :user/is_test true,
                       :user/is_admin false,
                       :user/name "[deleted]",
                       :user/avatar nil
                       :db/doc-type :gatz/user
                       :user/blocked_uids #{blocked-uid}
                       :db/version 4,
                       :user/push_tokens nil,
                       :user/phone_number nil
                       :user/created_at now
                       :crdt/clock c8
                       :user/deleted_at t8
                       :user/updated_at t8
                       :user/profile {:profile/full_name nil
                                      :profile/urls {:profile.urls/website nil
                                                     :profile.urls/twitter nil}}
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :friend_accepted false,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}

                      (crdt.user/->value deleted-user)))

          (.close node))))))


