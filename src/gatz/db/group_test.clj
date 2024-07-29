(ns gatz.db.group-test
  (:require [clojure.test :as test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.db.group :as db.group]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [xtdb.api :as xtdb]))

(deftest basic-flow
  (testing "we can create group and do actions on them"
    (let [owner (random-uuid)
          member (random-uuid)
          non-member (random-uuid)
          bad-admin (random-uuid)
          gid (crdt/random-ulid)
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
                                  :group/members #{member}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t4
                                  :group/members #{non-member}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t4
                                  :group/members #{bad-admin}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t5
                                  :group/admins #{bad-admin}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t5
                                  :group/admins #{non-member}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/remove-admin
                    :group/delta {:group/updated_at t6
                                  :group/admins #{non-member}}}
                    ;; bad-admin is leaving, even though they are also an admin
                   {:xt/id gid
                    :group/by_uid bad-admin
                    :group/action :group/leave
                    :group/delta {:group/updated_at t7}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/remove-member
                    :group/delta {:group/updated_at t7
                                  :group/members #{non-member}}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/add-admin
                    :group/delta {:group/updated_at t8
                                  :group/admins #{member}}}
                   {:xt/id gid
                    :group/by_uid member
                    :group/action :group/archive
                    :group/delta {:group/updated_at t9}}
                   {:xt/id gid
                    :group/by_uid member
                    :group/action :group/unarchive
                    :group/delta {:group/updated_at t9}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/archive
                    :group/delta {:group/updated_at t9}}
                   {:xt/id gid
                    :group/by_uid owner
                    :group/action :group/transfer-ownership
                    :group/delta {:group/updated_at t9
                                  :group/owner member}}]
          expected-initial {:xt/id gid
                            :db/version 1
                            :db/type :gatz/group
                            :group/name "test"
                            :group/description nil
                            :group/avatar nil
                            :group/owner owner
                            :group/created_by owner
                            :group/is_public false
                            :group/archived_uids #{}
                            :group/members #{owner}
                            :group/admins #{owner}
                            :group/created_at now
                            :group/updated_at now
                            :group/joined_at {owner now}
                            :group/settings {:discussion/member_mode :discussion.member_mode/closed}}

          expected-final {:xt/id gid
                          :db/version 1
                          :db/type :gatz/group
                          :group/name "test_updated_again"
                          :group/description "new description"
                          :group/avatar "new avatar"
                          :group/owner member
                          :group/is_public false
                          :group/archived_uids #{owner}
                          :group/members #{owner member}
                          :group/admins #{owner member}
                          :group/created_by owner
                          :group/created_at now
                          :group/updated_at t9
                          :group/joined_at {owner now member t3}
                          :group/settings {:discussion/member_mode :discussion.member_mode/closed}}
          final-group (reduce db.group/apply-action initial-group actions)]

      (doseq [action actions]
        (is (malli/validate db.group/Action action)))

      (doseq [action actions]
        (when-not (= :group/transfer-ownership (:group/action action))
          (let [bad-action (assoc-in action [:group/delta :group/owner] non-member)]
            (is (not (malli/validate db.group/Action bad-action))))))

      (testing "we can't remove the owner from the group"
        (doseq [action [{:xt/id gid
                         :group/action :group/remove-member
                         :group/by_uid owner
                         :group/delta {:group/members #{owner}}}
                        {:xt/id gid
                         :group/action :group/remove-admin
                         :group/by_uid owner
                         :group/delta {:group/admins #{owner}}}]]
          (is (not (db.group/authorized-for-action? initial-group action)))))

      (testing "the owner can't remove themselves"
        (let [action {:xt/id gid
                      :group/action :group/leave
                      :group/by_uid owner
                      :group/delta {}}]
          (is (not (db.group/authorized-for-action? initial-group action)))))

      (testing "we can't transfer ownership to a non member"
        (let [action {:xt/id gid
                      :group/action :group/transfer-ownership
                      :group/by_uid owner
                      :group/delta {:group/owner non-member}}]
          (is (not (db.group/authorized-for-action? initial-group action)))))

      (testing "we can't transfer ownership to a non-admin"
        (let [action {:xt/id gid
                      :group/action :group/transfer-ownership
                      :group/by_uid owner
                      :group/delta {:group/owner member}}]
          (is (not (db.group/authorized-for-action? final-group action)))))

      (testing "we can't make an admin out of a non-member"
        (let [action {:xt/id gid
                      :group/action :group/add-admin
                      :group/by_uid owner
                      :group/delta {:group/admins #{non-member}}}]
          (is (not (db.group/authorized-for-action? initial-group action)))))

      (testing "admins can't remove each other"
        (let [action {:xt/id gid
                      :group/action :group/remove-admin
                      :group/by_uid member
                      :group/delta {:group/admins #{bad-admin}}}
              group-with-admins (assoc initial-group :group/admins #{owner member bad-admin})]
          (is (not (db.group/authorized-for-action? group-with-admins action)))))

      (testing "admins can't remove each other"
        (let [action {:xt/id gid
                      :group/action :group/remove-member
                      :group/by_uid member
                      :group/delta {:group/members #{bad-admin}}}
              group-with-admins (assoc initial-group :group/admins #{owner member bad-admin})]
          (is (not (db.group/authorized-for-action? group-with-admins action)))))

      ;; Some of the actions are not authorized on the initial group
      (testing "we can check if the actions are authorized"
        (doseq [action actions]
          (when-not (contains? #{:group/transfer-ownership :group/add-admin :group/leave}
                               (:group/action action))
            (is (db.group/authorized-for-action? initial-group (assoc action :group/by_uid owner))))))

      (testing "we can check if the actions are authorized"
        (doseq [action actions]
          (let [member-action (assoc action :group/by_uid member)]
            (is (not (db.group/authorized-for-action? initial-group member-action))))
          (let [non-member-action (assoc action :group/by_uid non-member)]
            ;; The non-member _can_ remove themselves
            (when-not (= :group/remove-member (:group/action non-member-action))
              (is (not (db.group/authorized-for-action? initial-group non-member-action)))))))

      (testing "All the actions are authorized on their respective group"
        (loop [actions actions
               group initial-group]
          (when-let [action (first actions)]
            (do
              (is (db.group/authorized-for-action? group action))
              (recur (rest actions)
                     (db.group/apply-action group action))))))

      (is (malli/validate schema/Group initial-group))
      (is (malli/validate schema/Group expected-final))

      (is (empty? (:errors (malli/explain schema/Group initial-group))))

      (is-equal expected-initial initial-group)

      ;; Notice there is nothing re non-member
      ;; Notice there is nothing re bad-admin
      (is-equal expected-final final-group)

      (testing "and we can do all with the database"

        (let [ctx (db.util-test/test-system)
              node (:biff.xtdb/node ctx)
              get-ctx (fn []
                        (-> ctx
                            (assoc :biff/db (xtdb/db node))
                            (assoc :auth/user-id owner)))
              group (db.group/create! ctx
                                      {:id gid :owner owner :now now
                                       :name "test" :members #{}})]

          (is-equal initial-group group)

          (xtdb/sync node)

          (let [db (xtdb/db node)
                owner-groups (db.group/by-member-uid db owner)]
            (is (= 1 (count owner-groups)))
            (is (= initial-group (first owner-groups)))
            (is (empty? (db.group/by-member-uid db member))))

          (doseq [action actions]
          ;; not all the actions can be done by the owner
            (db.group/apply-action! (get-ctx) action)
            (xtdb/sync node))

          (let [db (xtdb/db node)
                final-group (db.group/by-id db gid)
                owner-groups (db.group/by-member-uid db owner)
                member-groups (db.group/by-member-uid db member)
                non-member-groups (db.group/by-member-uid db non-member)]
            (is-equal expected-final final-group)
            (is (= [final-group]
                   (db.group/with-members-in-common db owner member)
                   (db.group/with-members-in-common db member owner)
                   owner-groups
                   member-groups))
            (is (empty? non-member-groups))
            (is (empty? (db.group/with-members-in-common db owner non-member)))
            (is (empty? (db.group/with-members-in-common db member non-member)))))))))

(deftest public-groups
  (testing "we can list the public groups"
    (let [owner (random-uuid)
          member (random-uuid)
          non-member (random-uuid)
          bad-admin (random-uuid)
          public-gid (crdt/random-ulid)
          private-gid (crdt/random-ulid)
          now (java.util.Date.)
          t0 (crdt/inc-time now)
          t1 (crdt/inc-time t0)
          ;; TODO: make the group
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx :biff/db (xtdb/db node) :auth/user-id uid))]

      (db.group/create!
       ctx
       {:id public-gid :owner owner :now now
        :settings {:discussion/member_mode :discussion.member_mode/open}
        :name "public" :members #{} :is_public true})
      (db.group/create! ctx
                        {:id private-gid :owner owner :now now
                         :name "private" :members #{} :is_public false})
      (db.user/create-user!
       ctx {:id member :username "user_id" :phone "+14159499000" :now now})

      (xtdb/sync node)

      (testing "the groups are what we expect"
        (let [db (xtdb/db node)
              pu-group (db.group/by-id db public-gid)
              pr-group (db.group/by-id db private-gid)]
          (is (= #{owner} (:group/members pu-group)))
          (is (= #{owner} (:group/members pr-group)))
          (is (= #{owner} (:group/admins pu-group)))
          (is (= #{owner} (:group/admins pr-group)))
          (is (= owner (:group/owner pu-group)))
          (is (= owner (:group/owner pr-group)))
          (is (true? (:group/is_public pu-group)))
          (is (false? (:group/is_public pr-group)))))

      (testing "we can list the public groups"
        (let [db (xtdb/db node)
              gids (db.group/all-public-group-ids db)
              public-groups (db.group/all-public-groups db)]
          (is (= #{public-gid} gids))
          (is (every? :group/is_public public-groups))
          (is (= [public-gid] (map :xt/id public-groups)))))

      (let [action {:xt/id public-gid
                    :group/by_uid member
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t0
                                  :group/members #{member}}}]
        (db.group/apply-action! (get-ctx member) action))

      (let [action {:xt/id private-gid
                    :group/by_uid member
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t0
                                  :group/members #{member}}}]
        (is (thrown?
             java.lang.AssertionError
             (db.group/apply-action! (get-ctx member) action))))

      (let [action {:xt/id public-gid
                    :group/by_uid member
                    :group/action :group/add-member
                    :group/delta {:group/updated_at t0
                                  :group/members #{non-member}}}]
        (is (thrown?
             java.lang.AssertionError
             (db.group/apply-action! (get-ctx member) action))))

      (xtdb/sync node)

      (testing "the groups are what we expect"
        (let [db (xtdb/db node)
              pu-group (db.group/by-id db public-gid)
              pr-group (db.group/by-id db private-gid)]
          (is (= #{owner member} (:group/members pu-group)))
          (is (= #{owner} (:group/members pr-group)))
          (is (= owner (:group/owner pu-group)))
          (is (= owner (:group/owner pr-group)))
          (is (true? (:group/is_public pu-group)))
          (is (false? (:group/is_public pr-group))))))))
