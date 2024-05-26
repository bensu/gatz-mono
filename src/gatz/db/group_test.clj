(ns gatz.db.group-test
  (:require [clojure.test :as test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.db.util-test :as util-test :refer [is-equal]]
            [gatz.db.group :as db.group]
            [malli.core :as malli]))

(deftest basic-flow
  (testing "we can create group and do actions on them"
    (let [owner (random-uuid)
          member (random-uuid)
          non-member (random-uuid)
          bad-admin (random-uuid)
          gid (random-uuid)
          now (java.util.Date.)
          initial-group (db.group/new-group
                         {:id gid :owner owner :now now
                          :name "test" :members #{}})
          t0 (crdt/inc-time now)
          t1 (crdt/inc-time t0)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t2)
          t5 (crdt/inc-time t2)
          t6 (crdt/inc-time t2)
          t7 (crdt/inc-time t2)
          t8 (crdt/inc-time t2)
          t9 (crdt/inc-time t2)
          actions [{:xt/id gid
                    :group/by_uid owner
                    :group/action :group/update-attrs
                    :group/delta {:group/updated_at t0
                                  :group/name "test_updated"}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/update-attrs
                    :group/delta {:group/updated_at t1
                                  :group/avatar "new avatar"
                                  :group/name "test_updated"}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/update-attrs
                    :group/delta {:group/updated_at t2
                                  :group/description "new description"
                                  :group/name "test_updated_again"}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t3
                                  :group/members member}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t4
                                  :group/members non-member}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t4
                                  :group/members bad-admin}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t5
                                  :group/admins bad-admin}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t5
                                  :group/admins non-member}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/remove-admin
                    :group/delta {:group/updated_at t6
                                  :group/admins non-member}}
                    ;; We are removing bad-admin as a member, even though
                    ;; they are also an admin
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/remove-member
                    :group/delta {:group/updated_at t7
                                  :group/members bad-admin}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/remove-member
                    :group/delta {:group/updated_at t7
                                  :group/members non-member}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t8
                                  :group/admins member}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/transfer-ownership
                    :group/delta {:group/updated_at t9
                                  :group/owner member}}]
          final-group (reduce db.group/apply-action initial-group actions)]

      (doseq [action actions]
        (is (malli/validate db.group/Action action)))

      (doseq [action actions]
        (when-not (= :group/transfer-ownership (:group/action action))
          (let [bad-action (assoc-in action [:group/delta :group/owner] non-member)]
            (is (not (malli/validate db.group/Action bad-action))))))

      ;; Some of the actions are not authorized on the initial group
      (testing "we can check if the actions are authorized"
        (doseq [action actions]
          (when-not (contains? #{:group/transfer-ownership :group/add-admin}
                               (:group/action action))
            (is (db.group/authorized-for-action? initial-group action)))))

      (testing "we can check if the actions are authorized"
        (doseq [action actions]
          (let [member-action (assoc action :group/by_uid member)]
            (is (not (db.group/authorized-for-action? initial-group member-action))))
          (let [non-member-action (assoc action :group/by_uid non-member)]
            ;; The non-member _can_ remove themselves
            (when-not (= :group/remove-member (:group/action non-member-action))
              (is (not (db.group/authorized-for-action? initial-group non-member-action)))))))

      (testing "All the actions on their respective group"
        (loop [actions actions
               group initial-group]
          (when-let [action (first actions)]
            (do
              (is (db.group/authorized-for-action? group action))
              (recur (rest actions)
                     (db.group/apply-action group action))))))

      (is-equal {:xt/id gid
                 :db/doc-type :gatz/group
                 :db/version 1
                 :db/type :gatz/group
                 :group/name "test"
                 :group/description nil
                 :group/avatar nil
                 :group/owner owner
                 :group/members #{owner}
                 :group/admins #{owner}
                 :group/created_at now
                 :group/updated_at now
                 :group/joined_at {owner now}}
                initial-group)

      ;; Notice there is nothing re non-member
      ;; Notice there is nothing re bad-admin
      (is-equal {:xt/id gid
                 :db/doc-type :gatz/group
                 :db/version 1
                 :db/type :gatz/group
                 :group/name "test_updated_again"
                 :group/description "new description"
                 :group/avatar "new avatar"
                 :group/owner member
                 :group/members #{owner member}
                 :group/admins #{owner member}
                 :group/created_at now
                 :group/updated_at t9
                 :group/joined_at {owner now member t3}}
                final-group))))