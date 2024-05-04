(ns gatz.db.user-test
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [clojure.test :refer [deftest testing is]]
            [clojure.java.io :as io]
            [clojure.data :as data]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.util :as db.util]
            [gatz.db.util-test :as db.util-test :refer [is-equal test-system]]
            [gatz.db.evt :as db.evt]
            [gatz.db.user :refer :all]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [malli.util :as mu]
            [medley.core :refer [map-vals]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest migrate-existing-users
  (testing "We can migrate users we already have"
    (let [v0-users (read-string (slurp (io/resource "test/users_v0.edn")))
          v1-users (mapv #(db.util/->latest-version % all-migrations)
                         v0-users)]
      (is (= (count v0-users) (count v1-users)))
      (doseq [user v1-users]
        (is (malli/validate schema/UserCRDT user)
            (vec (:errors (malli/explain schema/UserCRDT user))))))))

(deftest user-actions
  (testing "The user actions have the right schema"
    (let [now (Date.)
          cid (random-uuid)
          clock (crdt/new-hlc cid now)
          t1 (crdt/inc-time now)
          c1 (crdt/new-hlc cid t1)
          t2 (crdt/inc-time t1)
          c2 (crdt/new-hlc cid t2)
          actions [{:gatz.crdt.user/action :gatz.crdt.user/mark-active
                    :gatz.crdt.user/delta {:crdt/clock clock
                                           :user/updated_at now
                                           :user/last_active now}}
                   {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
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
                                                     c2)}}}]]
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
              user (create-user! ctx {:id uid
                                      :username "test_123"
                                      :phone "4159499932"
                                      :now now})]
          (doseq [action actions]
            (apply-action! (assoc ctx :biff/db (xtdb/db node))
                           uid
                           action))
          (xtdb/sync node)
          (let [final-user (by-id (xtdb/db node) uid)]
            (is-equal {:crdt/clock c2
                       :xt/id uid
                       :db/type :gatz/user,
                       :user/is_test false,
                       :user/is_admin false,
                       :user/name "test_123",
                       :user/avatar "https://example.com/avatar.jpg",
                       :db/version 1,
                       :user/push_tokens nil,
                       :user/phone_number "4159499932",
                       :user/created_at now
                       :user/last_active now
                       :user/updated_at t2
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}

                      (crdt.user/->value final-user)))
          (.close node)))

      (testing "we can apply the actions through named functions"
        (let [uid (random-uuid)
              system (db.util-test/test-system)
              ctx (assoc system
                         :auth/user-id uid
                         :auth/cid uid)
              node (:biff.xtdb/node system)
              user (create-user! ctx {:id uid
                                      :username "test_456"
                                      :phone "4159499932"
                                      :now now})
              t1 (crdt/inc-time now)
              t2 (crdt/inc-time t1)
              t3 (crdt/inc-time t2)
              t4 (crdt/inc-time t3)
              t5 (crdt/inc-time t4)
              c1 (crdt/new-hlc uid t1)
              c2 (crdt/new-hlc uid t2)
              c3 (crdt/new-hlc uid t3)
              c4 (crdt/new-hlc uid t4)
              c5 (crdt/new-hlc uid t5)]
          (do
            ;; await for all the tx functions to be in the database
            (xtdb/sync node)
            (mark-active! (assoc ctx :biff/db (xtdb/db node)) uid {:now t1})
            (update-avatar! (assoc ctx :biff/db (xtdb/db node))
                            uid
                            "https://example.com/avatar.jpg"
                            {:now t2})
            (add-push-token! (assoc ctx :biff/db (xtdb/db node))
                             uid
                             {:push-token {:push/expo
                                           {:push/service :push/expo
                                            :push/token "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                                            :push/created_at now}}}
                             {:now t3})
            (remove-push-tokens! (assoc ctx :biff/db (xtdb/db node))
                                 uid
                                 {:now t4})
            (edit-notifications! (assoc ctx :biff/db (xtdb/db node))
                                 uid
                                 {:settings.notification/activity :settings.notification/daily}
                                 {:now t5})
            ;; await for all transactions before checking the state of the user
            (xtdb/sync node))
          (let [final-user (by-id (xtdb/db node) uid)]
            (is-equal {:crdt/clock c5
                       :xt/id uid
                       :db/type :gatz/user,
                       :user/is_test false,
                       :user/is_admin false,
                       :user/name "test_456",
                       :user/avatar "https://example.com/avatar.jpg",
                       :db/version 1,
                       :user/push_tokens nil,
                       :user/phone_number "4159499932",
                       :user/created_at now
                       :user/last_active t1
                       :user/updated_at t5
                       :user/settings
                       #:settings{:notifications
                                  #:settings.notification{:overall false,
                                                          :activity :settings.notification/daily,
                                                          :subscribe_on_comment false,
                                                          :suggestions_from_gatz false}}}

                      (crdt.user/->value final-user)))
          (.close node))))))


