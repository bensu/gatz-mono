(ns gatz.db.discussion-test
  (:require [clojure.data]
            [clojure.test :refer [deftest is testing]]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest schemas
  (testing "we can validate all the deltas"
    (let [[uid did mid] (take 3 (repeatedly random-uuid))
          t0 (Date.)
          clock (crdt/new-hlc uid t0)
          mark-message-read-delta {:crdt/clock clock
                                   :discussion/updated_at t0
                                   :discussion/last_message_read {uid (crdt/->LWW clock mid)}}
          archive-delta  {:crdt/clock clock
                          :discussion/updated_at t0
                          :discussion/archived_uids {uid (crdt/->LWW clock true)}}
          subscribe-delta {:crdt/clock clock
                           :discussion/updated_at t0
                           :discussion/subscribers {uid (crdt/->LWW clock true)}}
          add-member-delta {:crdt/clock clock
                            :discussion/updated_at t0
                            :discussion/members {uid (crdt/->LWW clock true)}}
          mention {:xt/id (crdt/random-ulid)
                   :db/type :gatz/mention
                   :db/version 1
                   :mention/to_uid uid
                   :mention/by_uid uid
                   :mention/ts t0
                   :mention/did did
                   :mention/mid mid}
          append-msg-delta {:crdt/clock clock
                            :discussion/latest_message (crdt/lww clock mid)
                            :discussion/latest_activity_ts (crdt/max-wins t0)
                            :discussion/seen_at {uid (crdt/max-wins t0)}
                            :discussion/subscribers {uid (crdt/lww clock true)}
                            :discussion/active_members uid
                            :discussion/mentions {uid (crdt/gos #{mention})}
                            :discussion/updated_at t0}
          unsubscribe-delta {:crdt/clock clock
                             :discussion/updated_at t0
                             :discussion/subscribers {uid (crdt/->LWW clock false)}}]
      (is (malli/validate #'schema/Mention mention mention))
      (is (malli/validate (crdt/grow-only-set-schema #'schema/Mention) (crdt/gos #{mention})))
      (is (malli/validate schema/MarkMessageRead mark-message-read-delta)
          (malli/explain  schema/MarkMessageRead mark-message-read-delta))
      (is (malli/validate schema/AppendMessageDelta append-msg-delta)
          (malli/explain  schema/AppendMessageDelta append-msg-delta))
      (is (malli/validate schema/ArchiveDiscussion archive-delta)
          (malli/explain  schema/ArchiveDiscussion archive-delta))
      (is (malli/validate schema/SubscribeDelta subscribe-delta)
          (malli/explain  schema/SubscribeDelta subscribe-delta))
      (is (malli/validate schema/AddMembersDelta add-member-delta)
          (malli/validate schema/AddMembersDelta add-member-delta))
      (is (malli/validate schema/SubscribeDelta unsubscribe-delta)
          (malli/explain  schema/SubscribeDelta unsubscribe-delta))
      (testing "and as actions"
        (let [actions [{:discussion.crdt/action :discussion.crdt/mark-message-read
                        :discussion.crdt/delta mark-message-read-delta}
                       {:discussion.crdt/action :discussion.crdt/add-members
                        :discussion.crdt/delta add-member-delta}
                       {:discussion.crdt/action :discussion.crdt/append-message
                        :discussion.crdt/delta append-msg-delta}
                       {:discussion.crdt/action :discussion.crdt/archive
                        :discussion.crdt/delta archive-delta}
                       {:discussion.crdt/action :discussion.crdt/subscribe
                        :discussion.crdt/delta subscribe-delta}
                       {:discussion.crdt/action :discussion.crdt/subscribe
                        :discussion.crdt/delta unsubscribe-delta}]]
          (doseq [action actions]
            (is (malli/validate schema/DiscussionAction action)
                (malli/explain schema/DiscussionAction action)))
          (testing "and as events"
            (let [events (mapv (fn [action]
                                 (db.evt/new-evt {:evt/type :discussion.crdt/delta
                                                  :evt/uid uid
                                                  :evt/did did
                                                  :evt/cid uid
                                                  :evt/mid mid
                                                  :evt/data action}))
                               actions)]
              (doseq [evt events]
                (is (malli/validate schema/DiscussionEvt evt)
                    (malli/explain schema/DiscussionEvt evt))))))))))

(deftest open-discussions-crdt
  (testing "we can add members to a discussion with the CRDT"
    (let [[uid did mid cid] (take 4 (repeatedly random-uuid))
          t0 (Date.)
          clock (crdt/new-hlc uid t0)
          add-member-delta {:crdt/clock clock
                            :discussion/updated_at t0
                            :discussion/members {cid (crdt/->LWW clock true)}}
          initial (crdt.discussion/new-discussion
                   {:did did :mid mid :uid uid
                    :originally-from nil :member-uids #{}}
                   {:now t0})
          final (crdt.discussion/->value (crdt.discussion/apply-delta initial add-member-delta))]
      (is (= #{uid cid} (:discussion/members final)))
      (testing "but we are only authorized if the discusion is open"
        (let [action  {:discussion.crdt/action :discussion.crdt/add-members
                       :discussion.crdt/delta add-member-delta}
              open-discussion (assoc initial
                                     :discussion/member_mode :discussion.member_mode/open)]
          (is (not
               (db.discussion/authorized-for-delta? initial {:evt/uid uid
                                                             :evt/data action})))
          (is (db.discussion/authorized-for-delta? open-discussion
                                                   {:evt/uid uid
                                                    :evt/data action}))
          (is (not
               (db.discussion/authorized-for-delta? open-discussion
                                                    {:evt/uid cid
                                                     :evt/data action})))))))
  (testing "group discussions can be open"
    (let [[owner-id admin-id member-id second-member
           did1 did2 did3 did4]
          (take 9 (repeatedly random-uuid))
          gid (crdt/random-ulid)
          t0 (Date.)
          t1 (crdt/inc-time t0)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx
                           :biff/db (xtdb/db node)
                           :auth/user-id uid :auth/cid uid))]
      (db.user/create-user! ctx {:id owner-id
                                 :username "owner"
                                 :phone "+14159499000"
                                 :now t0})
      (db.user/create-user! ctx {:id admin-id
                                 :username "admin"
                                 :phone "+14159499001"
                                 :now t0})
      (db.user/create-user! ctx {:id member-id
                                 :username "member"
                                 :phone "+14159499002"
                                 :now t0})
      (db.user/create-user! ctx {:id second-member
                                 :username "second"
                                 :phone "+14159499003"
                                 :now t0})

      (xtdb/sync node)
      (db.group/create! ctx
                        {:id gid :owner owner-id :now t0
                         :name "test" :members #{admin-id}
                         :settings {:discussion/member_mode :discussion.member_mode/open}})

      (xtdb/sync node)

      (binding [db.discussion/*open-until-testing-date* t2]
        (db/create-discussion-with-message!
         (get-ctx owner-id)
         {:did did1 :group_id gid
          :to_all_contacts true
          :text "Hello only to owner & admin" :now t1}))

      (db/create-discussion-with-message!
       (get-ctx owner-id)
       {:did did2
        :group_id gid
        :to_all_contacts true
        :text "Hello to owner, admin, and in the future, member"
        :now t2})
      (xtdb/sync node)

      (let [db (xtdb/db node)
            d1 (crdt.discussion/->value (db.discussion/by-id db did1))
            d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
        (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
        (is (= #{owner-id admin-id} (:discussion/members d1)))
        (is (= t2 (:discussion/open_until d1)))
        (is (= :discussion.member_mode/open (:discussion/member_mode d2)))
        (is (= #{owner-id admin-id} (:discussion/members d2)))
        (is (= (db.discussion/open-until t2)
               (:discussion/open_until d2))))

      (let [add-member {:xt/id gid
                        :group/by_uid owner-id
                        :group/action :group/add-member
                        :group/delta {:group/updated_at t3
                                      :group/members #{member-id}}}]
        (db.group/apply-action! (get-ctx owner-id) add-member))
      (xtdb/sync node)

      (db/create-discussion-with-message!
       (get-ctx owner-id)
       {:did did3 :group_id gid
        :to_all_contacts true
        :text "Hello to owner, admin, & currently member"
        :now t3})

      (xtdb/sync node)
      (testing "new discussions have the member"
        (let [db (xtdb/db node)
              d3 (crdt.discussion/->value (db.discussion/by-id db did3))]
          (is (= :discussion.member_mode/open (:discussion/member_mode d3)))
          (is (= #{owner-id admin-id member-id} (:discussion/members d3)))))
      (testing "recent discussions now have the member"
        (let [db (xtdb/db node)
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
          (is (= :discussion.member_mode/open (:discussion/member_mode d2)))
          (is (= #{owner-id admin-id member-id} (:discussion/members d2)))))
      (testing "but older discussions don't because their open period is over"
        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))]
          (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
          (is (= #{owner-id admin-id} (:discussion/members d1)))))

      (db/create-discussion-with-message!
       (get-ctx admin-id)
       {:did did4 :group_id gid
        :to_all_contacts true
        :text "Hello from admin, to future users"
        :now t3})
      (xtdb/sync node)

      (testing "adding a second user, they can also see the open posts"

        (let [db (xtdb/db node)
              d4 (crdt.discussion/->value (db.discussion/by-id db did4))]
          (is (= #{owner-id admin-id member-id}
                 (:discussion/members d4))))
        (let [add-member {:xt/id gid
                          :group/by_uid owner-id
                          :group/action :group/add-member
                          :group/delta {:group/updated_at t3
                                        :group/members #{second-member}}}]
          (db.group/apply-action! (get-ctx owner-id) add-member))
        (xtdb/sync node)
        (let [db (xtdb/db node)
              d4 (crdt.discussion/->value (db.discussion/by-id db did4))]
          (is (= #{owner-id admin-id member-id second-member}
                 (:discussion/members d4))))))))

(deftest deltas
  (testing "we can apply the deltas"
    (let [[poster-uid commenter-uid did mid] (take 4 (repeatedly random-uuid))
          now (Date.)
          t0 (crdt/inc-time now)
          t1 (crdt/inc-time t0)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          [cnow c0 c1 c2 c3] (map #(crdt/new-hlc poster-uid %) [now t0 t1 t2 t3])
          initial (crdt.discussion/new-discussion
                   {:did did :mid mid :uid poster-uid
                    :originally-from nil :member-uids #{commenter-uid}}
                   {:now now})
          actions [[poster-uid
                    {:discussion.crdt/action :discussion.crdt/mark-message-read
                     :discussion.crdt/delta
                     {:crdt/clock c0
                      :discussion/updated_at t0
                      :discussion/last_message_read {poster-uid (crdt/->LWW c0 mid)}}}]
                   [poster-uid
                    {:discussion.crdt/action :discussion.crdt/archive
                     :discussion.crdt/delta
                     {:crdt/clock c0
                      :discussion/updated_at t0
                      :discussion/archived_uids {poster-uid (crdt/->LWW c0 true)}}}]
                   [commenter-uid
                    {:discussion.crdt/action :discussion.crdt/archive
                     :discussion.crdt/delta
                     {:crdt/clock c1
                      :discussion/updated_at t1
                      :discussion/archived_uids {commenter-uid (crdt/->LWW c1 true)}}}]
                   [commenter-uid
                    {:discussion.crdt/action :discussion.crdt/subscribe
                     :discussion.crdt/delta
                     {:crdt/clock c2
                      :discussion/updated_at t2
                      :discussion/subscribers {commenter-uid (crdt/->LWW c2 true)}}}]
                   [poster-uid
                    {:discussion.crdt/action :discussion.crdt/subscribe
                     :discussion.crdt/delta
                     {:crdt/clock c3
                      :discussion/updated_at t3
                      :discussion/subscribers {poster-uid (crdt/->LWW c3 false)}}}]]
          deltas (map (comp :discussion.crdt/delta second) actions)
          final-expected {:xt/id did
                          :crdt/clock c3
                          :db/type :gatz/discussion
                          :db/version 3
                          :discussion/did did
                          :discussion/name nil
                          :discussion/created_at now
                          :discussion/group_id nil
                          :discussion/created_by poster-uid
                          :discussion/originally_from nil
                          :discussion/first_message mid
                          :discussion/open_until nil
                          :discussion/member_mode :discussion.member_mode/closed
                          :discussion/public_mode :discussion.public_mode/hidden

                          :discussion/active_members #{poster-uid}
                          :discussion/members #{poster-uid commenter-uid}
                          :discussion/latest_message mid
                          :discussion/latest_activity_ts now
                          :discussion/seen_at {}
                          :discussion/mentions {}
                          :discussion/updated_at t3
                          :discussion/archived_uids #{poster-uid commenter-uid}
                          :discussion/subscribers #{commenter-uid}
                          :discussion/last_message_read {poster-uid mid}}
          final (reduce crdt.discussion/apply-delta initial (shuffle (concat deltas deltas)))]
      (testing "directly via reduce"
        (is-equal {:xt/id did
                   :crdt/clock cnow
                   :db/type :gatz/discussion
                   :db/version 3
                   :discussion/did did
                   :discussion/name nil
                   :discussion/group_id nil
                   :discussion/created_at now
                   :discussion/created_by poster-uid
                   :discussion/originally_from nil
                   :discussion/first_message mid
                   :discussion/open_until nil
                   :discussion/member_mode :discussion.member_mode/closed
                   :discussion/public_mode :discussion.public_mode/hidden
                   :discussion/members #{poster-uid commenter-uid}
                   :discussion/subscribers #{poster-uid}
                   :discussion/active_members #{poster-uid}
                   :discussion/latest_message mid
                   :discussion/last_message_read {}
                   :discussion/latest_activity_ts now
                   :discussion/updated_at now
                   :discussion/mentions {}
                   :discussion/seen_at {}
                   :discussion/archived_uids #{}}
                  (crdt.discussion/->value initial))
        (is-equal final-expected (crdt.discussion/->value final)))
      (testing "via apply-action!"
        (let [uid poster-uid
              system (db.util-test/test-system)
              node (:biff.xtdb/node system)
              ctx (assoc system
                         :auth/user-id uid
                         :auth/cid uid)]
          (xtdb/submit-tx node [[:xtdb.api/put initial]])
          (xtdb/sync node)
          (doseq [[uid action] actions]
            (db.discussion/apply-action! (assoc ctx :biff/db (xtdb/db node)
                                                :auth/user-id uid
                                                :auth/cid uid)
                                         did
                                         action))
          (xtdb/sync node)
          (let [final (db.discussion/by-id (xtdb/db node) did)]
            (is-equal final-expected (crdt.discussion/->value final)))
          (.close node)))
      (testing "via direct functions"
        (let [ctx (db.util-test/test-system)
              node (:biff.xtdb/node ctx)
              get-ctx (fn [uid]
                        (assoc ctx
                               :auth/user-id uid
                               :auth/cid uid
                               :biff/db (xtdb/db node)))]
          (xtdb/submit-tx node [[:xtdb.api/put initial]])
          (xtdb/sync node)

          (db.discussion/mark-message-read! (get-ctx poster-uid) poster-uid did mid)
          (db.discussion/archive! (get-ctx poster-uid) did poster-uid)
          (db.discussion/archive! (get-ctx commenter-uid) did commenter-uid)
          (db.discussion/subscribe! (get-ctx commenter-uid) did commenter-uid)
          (db.discussion/unsubscribe! (get-ctx poster-uid) did poster-uid)
          (xtdb/sync node)
          (let [final (db.discussion/by-id (xtdb/db node) did)
                select-fields (fn [d]
                                (-> d
                                    (select-keys [:xt/id
                                                  :discussion/subscribers
                                                  :discussion/members
                                                  :discussion/active_members
                                                  :discussion/archived_uids
                                                  :discussion/last_message_read
                                                  :discussion/created_at
                                                  :discussion/created_by])))]
            (is-equal (select-fields final-expected)
                      (select-fields (crdt.discussion/->value final))))
          (.close node))))))

(deftest post-to-contacts
  (testing "you can only posts to your own contacts"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx :biff/db (xtdb/db node)
                           :auth/user-id uid :auth/cid uid))
          now (Date.)
          poster-id (random-uuid)
          contact-id (random-uuid)
          stranger-id (random-uuid)]
      (db.user/create-user!
       ctx {:id poster-id :username "poster_000" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id contact-id :username "commenter_000" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id stranger-id :username "stranger_000" :phone "+14159499002" :now now})
      (xtdb/sync node)

      (testing "so when we post to strangers it fails"
        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx poster-id)
                      {:did (random-uuid) :selected_users #{contact-id}
                       :to_all_contacts false
                       :text "Failed" :now now})))
        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx poster-id)
                      {:did (random-uuid)
                       :to_all_contacts false
                       :selected_users #{contact-id stranger-id}
                       :text "Failed"
                       :now now})))
        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx poster-id)
                      {:did (random-uuid)
                       :to_all_contacts false
                       :selected_users #{stranger-id}
                       :text "Failed"
                       :now now}))))

      (testing "but once we add them as contacts, we can post to them"
        (db.contacts/force-contacts! ctx poster-id contact-id)
        (xtdb/sync node)

        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx poster-id)
                      {:did (random-uuid)
                       :selected_users #{contact-id stranger-id}
                       :to_all_contacts false
                       :text "Failed" :now now})))
        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx poster-id)
                      {:did (random-uuid)
                       :selected_users #{stranger-id}
                       :to_all_contacts false
                       :text "Failed" :now now})))

        (db/create-discussion-with-message!
         (get-ctx poster-id)
         {:did (random-uuid)
          :selected_users #{contact-id}
          :to_all_contacts false
          :text "Failed" :now now})))))

(deftest feeds
  (testing "there is a basic chronological feed"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx
                           :biff/db (xtdb/db node)
                           :auth/user-id uid
                           :auth/cid uid))
          now (Date.)
          t1 (crdt/inc-time now)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t3)
          t5 (crdt/inc-time t4)
          t6 (crdt/inc-time t5)
          [uid lid cid sid did1 did2 did3 did4] (take 8 (repeatedly random-uuid))]

      (db.user/create-user!
       ctx {:id uid :username "poster_000" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id cid :username "commenter_000" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id lid :username "lurker_000" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id sid :username "spammer_000" :phone "+14159499003" :now now})
      (xtdb/sync node)
      (doseq [[from to] [[uid cid]
                         [uid lid]
                         [cid lid]
                         [cid sid]]]
        (db.contacts/force-contacts! ctx from to))
      (xtdb/sync node)

      (testing "the feeds start empty"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db uid)))
          (is (empty? (db.discussion/posts-for-user db cid)))
          (is (empty? (db.discussion/posts-for-user db lid)))

          (is (empty? (db.discussion/active-for-user db uid)))
          (is (empty? (db.discussion/active-for-user db cid)))
          (is (empty? (db.discussion/active-for-user db lid)))))

      (testing "the poster only sees their own posts"
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did1 :selected_users #{} :text "Hello to only poster" :now t1})

        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))]
          (is (= #{uid} (:discussion/members d1)))
          (is (= #{uid} (:discussion/active_members d1)))
          (is (= [did1] (db.discussion/posts-for-user db uid)))
          (is (= []     (db.discussion/posts-for-user db cid)))
          (is (= []     (db.discussion/posts-for-user db lid)))

          (is (empty? (db.discussion/active-for-user db uid)))
          (is (empty? (db.discussion/active-for-user db cid)))
          (is (empty? (db.discussion/active-for-user db lid)))))

      (testing "the commenter can put posts in the posters feed too"
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did2
          :selected_users #{cid}
          :to_all_contacts false
          :text "Hello to poster and commenter"
          :now t2})
        (db/create-message!
         (get-ctx cid)
         {:did did2 :text "I see this @poster_000" :now t3})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
          (is (= #{uid} (set (keys (:discussion/mentions d2)))))
          (is (= #{uid cid} (:discussion/members d2)))
          (is (= #{uid cid} (:discussion/active_members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db uid))
              "They come in reverse chronological order")
          (is (= [did2] (db.discussion/posts-for-user db cid)))
          (is (= []     (db.discussion/posts-for-user db lid)))

          (is (= [did2] (db.discussion/mentions-for-user db uid)))
          (is (= [] (db.discussion/mentions-for-user db cid)))

          (testing "and the comment bumps the discussion into the activity feed"
            (is (= [did2] (db.discussion/active-for-user db uid)))
            (is (= [did2] (db.discussion/active-for-user db cid)))
            (is (= []     (db.discussion/active-for-user db lid)))))

        (db/create-discussion-with-message!
         (get-ctx cid)
         {:did did3 :selected_users #{uid}
          :to_all_contacts false
          :text "Hello to poster and commenter. Poster will never comment"
          :now t3})
        (db/create-message!
         (get-ctx uid)
         {:did did1 :text "I tag @commenter_000 but they are not here" :now t4})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))
              d3 (crdt.discussion/->value (db.discussion/by-id db did3))]

          (is (= #{uid cid} (:discussion/members d3)))
          (is (= #{cid}     (:discussion/active_members d3)))

          (is (= [did2] (db.discussion/mentions-for-user db uid)))
          (is (= [] (db.discussion/mentions-for-user db cid)))

          (is (= [did3 did2 did1] (db.discussion/posts-for-user db uid)))
          (is (= [did3 did2]      (db.discussion/posts-for-user db cid)))
          (is (= []               (db.discussion/posts-for-user db lid)))

          (testing "and the comment bumps the discussion into the activity feed"
            (is (= [did1 did2] (db.discussion/active-for-user db uid)))
            (is (= [did2]      (db.discussion/active-for-user db cid)))
            (is (= []          (db.discussion/active-for-user db lid))))))

      (testing "and the lurker has its own feed to the side"
        (db/create-discussion-with-message!
         (get-ctx lid)
         {:did did4 :selected_users #{lid}
          :to_all_contacts false
          :text "Hello to only the lurker"
          :now t4})
        (db/create-message!
         (get-ctx cid)
         {:did did3 :text "I comment on my own post" :now t4})
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (is (= [did3 did2 did1] (db.discussion/posts-for-user db uid)))
          (is (= [did3 did2]      (db.discussion/posts-for-user db cid)))
          (is (= [did4]           (db.discussion/posts-for-user db lid)))

          (testing "and there is a new comment"
             ;; Changed
            (is (= [did1 did2] (db.discussion/active-for-user db uid)))
            (is (= [did3 did2] (db.discussion/active-for-user db cid)))
            (is (= []          (db.discussion/active-for-user db lid)))))

        (db/create-message!
         (get-ctx lid)
         {:did did4 :text "I see my lurker post" :now t5})
        (xtdb/sync node)

        (testing "and the comment bumps the discussion into the activity feed"
          (let [db (xtdb/db node)]
             ;; Changed
            (is (= [did1 did2] (db.discussion/active-for-user db uid)))
            (is (= [did3 did2] (db.discussion/active-for-user db cid)))
            (is (= [did4]      (db.discussion/active-for-user db lid))))))

      (testing "the poster can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []               (db.discussion/posts-for-user db uid {:older-than-ts now})))
          (is (= []               (db.discussion/posts-for-user db uid {:older-than-ts t1})))
          (is (= [did1]           (db.discussion/posts-for-user db uid {:older-than-ts t2})))
          (is (= [did2 did1]      (db.discussion/posts-for-user db uid {:older-than-ts t3})))
          (is (= [did3 did2 did1] (db.discussion/posts-for-user db uid {:older-than-ts t4})))
          (is (= [did3 did2 did1] (db.discussion/posts-for-user db uid {:older-than-ts t5})))

          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts now})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t1})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t2})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t3})))
          (is (= [did2]      (db.discussion/active-for-user db uid {:older-than-ts t4})))
          (is (= [did1 did2] (db.discussion/active-for-user db uid {:older-than-ts t5})))
          (is (= [did1 did2] (db.discussion/active-for-user db uid {:older-than-ts t6})))))

      (testing "the commenter can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []          (db.discussion/posts-for-user db cid {:older-than-ts now})))
          (is (= []          (db.discussion/posts-for-user db cid {:older-than-ts t1})))
          (is (= []          (db.discussion/posts-for-user db cid {:older-than-ts t2})))
          (is (= [did2]      (db.discussion/posts-for-user db cid {:older-than-ts t3})))
          (is (= [did3 did2] (db.discussion/posts-for-user db cid {:older-than-ts t4})))

          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts now})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t1})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t2})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t3})))
          (is (= [did2]      (db.discussion/active-for-user db cid {:older-than-ts t4})))
          (is (= [did3 did2] (db.discussion/active-for-user db cid {:older-than-ts t5})))
          (is (= [did3 did2] (db.discussion/active-for-user db cid {:older-than-ts t6})))))

      (testing "the lurker can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []     (db.discussion/posts-for-user db lid {:older-than-ts now})))
          (is (= []     (db.discussion/posts-for-user db lid {:older-than-ts t1})))
          (is (= []     (db.discussion/posts-for-user db lid {:older-than-ts t2})))
          (is (= []     (db.discussion/posts-for-user db lid {:older-than-ts t3})))
          (is (= []     (db.discussion/posts-for-user db lid {:older-than-ts t4})))
          (is (= [did4] (db.discussion/posts-for-user db lid {:older-than-ts t5})))

          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts now})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t1})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t2})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t3})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t4})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t5})))
          (is (= [did4] (db.discussion/active-for-user db lid {:older-than-ts t6})))))

      (testing "repeated tags don't do anything"
        (db/create-message!
         (get-ctx uid)
         {:did did3 :text "I tag @commenter_000 and they are here now" :now t4})
        (db/create-message!
         (get-ctx uid)
         {:did did3 :text "I tag @poster_000 myself but it doesn't matter" :now t5})
        (db/create-message!
         (get-ctx uid)
         {:did did3 :text "I tag @commenter_000 again but it doesn't matter" :now t5})
        (db/create-message!
         (get-ctx cid)
         {:did did3 :text "I tag @lurker_000 but but they are not a member" :now t5})
        (xtdb/sync node)
        (let [db (xtdb/db node)
              d3 (crdt.discussion/->value (db.discussion/by-id db did3))]
          (is (= #{cid} (set (keys (:discussion/mentions d3)))))
          (is (= []     (db.discussion/mentions-for-user db lid)))
          (is (= [did2] (db.discussion/mentions-for-user db uid)))
          (is (= [did3] (db.discussion/mentions-for-user db cid)))))

      (testing "gives you 20 posts at a time, even if there are 45 there"
        (let [all-dids (take 45 (repeatedly random-uuid))]
          (loop [dids all-dids
                 t now]
            (when-let [did (first dids)]
              (db/create-discussion-with-message!
               (get-ctx sid)
               {:did did :selected_users #{cid sid}
                :to_all_contacts false
                :text "Hello to spammer"
                :now t})
              (db/create-message!
               (get-ctx cid)
               {:did did :text "Comment" :now (crdt/inc-time t)})
              (recur (rest dids) (crdt/inc-time t))))
          (xtdb/sync node)
          (testing "the post feed batches by 20 at a time"
            (let [db (xtdb/db node)
                  first-feed     (db.discussion/posts-for-user db sid)
                  first-last-ts  (:discussion/created_at (db.discussion/by-id db (last first-feed)))
                  second-feed    (db.discussion/posts-for-user db sid {:older-than-ts first-last-ts})
                  second-last-ts (:discussion/created_at (db.discussion/by-id db (last second-feed)))
                  third-feed     (db.discussion/posts-for-user db sid {:older-than-ts second-last-ts})]
              (is (= 20 (count first-feed)))
              (is (= (take 20 (reverse all-dids)) first-feed))
              (is (= 20 (count second-feed)))
              (is (= (take 20 (drop 20 (reverse all-dids))) second-feed))
              (is (= 5 (count third-feed)))
              (is (= (take 20 (drop 40 (reverse all-dids))) third-feed))))

          (testing "the active feed batches by 20 at a time"
            (let [db (xtdb/db node)
                  first-feed     (db.discussion/active-for-user db sid)
                  first-last-ts  (:discussion/latest_activity_ts (db.discussion/by-id db (last first-feed)))
                  second-feed    (db.discussion/active-for-user db sid {:older-than-ts (crdt/-value first-last-ts)})
                  second-last-ts (:discussion/latest_activity_ts (db.discussion/by-id db (last second-feed)))
                  third-feed     (db.discussion/active-for-user db sid {:older-than-ts (crdt/-value second-last-ts)})]
              (is (= 20 (count first-feed)))
              (is (= (take 20 (reverse all-dids)) first-feed))
              (is (= 20 (count second-feed)))
              (is (= (take 20 (drop 20 (reverse all-dids))) second-feed))
              (is (= 5 (count third-feed)))
              (is (= (take 20 (drop 40 (reverse all-dids))) third-feed))))))

      (.close node))))

(deftest group-feeds
  (testing "there is a basic chronological feed"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx :biff/db (xtdb/db node)
                           :auth/user-id uid :auth/cid uid))
          now (Date.)
          t1 (crdt/inc-time now)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t3)
          t5 (crdt/inc-time t4)
          t6 (crdt/inc-time t5)
          t7 (crdt/inc-time t6)
          t8 (crdt/inc-time t7)
          [oid mid aid sid did1 did2 did3 did4 did5 did6]
          (take 10 (repeatedly random-uuid))

          gid (crdt/random-ulid)]

      (db.user/create-user!
       ctx {:id oid :username "owner" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id aid :username "admin" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id mid :username "member" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id sid :username "stranger" :phone "+14159499003" :now now})
      (xtdb/sync node)
      (doseq [[from to] [[oid mid]
                         [oid aid]
                         [mid aid]
                         [oid sid]
                         [mid sid]]]
        (db.contacts/force-contacts! ctx from to))
      (xtdb/sync node)

      (testing "the feeds start empty"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (db.group/create! (get-ctx oid)
                        {:id gid :name "group 1" :owner oid :members #{}})
      (xtdb/sync node)

      (testing "the feeds are still because we haven't posted anything to the group"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "only those in the group see the posts"
        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did1 :group_id gid
          :to_all_contacts true
          :text "Hello to only owner" :now t1})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))]

          (is (= gid (:discussion/group_id d1)))
          (is (= :discussion.member_mode/closed (:discussion/member_mode d1)))
          (is (= :discussion.public_mode/hidden (:discussion/public_mode d1)))

          (is (= #{oid} (:discussion/members d1)))
          (is (= #{oid} (:discussion/active_members d1)))
          (is (= [did1] (db.discussion/posts-for-user db oid)))
          (is (= []     (db.discussion/posts-for-user db mid)))
          (is (= []     (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "once we add somebody to the closed group, they can see new posts but not older"
        (db/create-message!
         (get-ctx oid)
         {:did did1 :text "Owner sees this" :now t2})

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid oid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{aid}
                                               :group/updated_at t1}})
        (xtdb/sync node)

        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did2 :group_id gid
          :to_all_contacts true
          :text "Hello to owner and admin" :now t2})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]

          (is (= gid (:discussion/group_id d2)))

          (is (= #{oid aid} (:discussion/members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db oid))
              "They come in reverse chronological order")
          (is (= [did2] (db.discussion/posts-for-user db aid)))
          (is (= []     (db.discussion/posts-for-user db mid)))

          (is (= [] (db.discussion/mentions-for-user db oid {:group_id gid})))
          (is (= [] (db.discussion/mentions-for-user db aid {:group_id gid})))

          (is (= [did1] (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid))))

        (db/create-message!
         (get-ctx aid)
         {:did did2 :text "@owner and admin see this" :now t3})

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid oid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{mid}
                                               :group/updated_at t2}})
        (xtdb/sync node)

        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did3 :group_id gid
          :to_all_contacts true
          :text "Hello to owner, admin, and member" :now t3})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))
              d3 (crdt.discussion/->value (db.discussion/by-id db did3))]

          (testing "the mentions are shown in the discussion feed"
            (is (= #{oid} (set (keys (:discussion/mentions d2)))))
            (is (= [did2] (db.discussion/mentions-for-user db oid {:group_id gid})))
            (is (= [] (db.discussion/mentions-for-user db aid {:group_id gid}))))

          (is (= gid (:discussion/group_id d3)))

          (is (= #{oid aid} (:discussion/active_members d2)))
          (is (= #{oid aid mid} (:discussion/members d3)))

          (is (= [did3 did2 did1] (db.discussion/posts-for-user db oid))
              "They come in reverse chronological order")
          (is (= [did3 did2] (db.discussion/posts-for-user db aid)))
          (is (= [did3]      (db.discussion/posts-for-user db mid)))
          (is (= []          (db.discussion/posts-for-user db sid)))

          (is (= [did2 did1] (db.discussion/active-for-user db oid)))
          (is (= [did2]      (db.discussion/active-for-user db aid)))
          (is (= []          (db.discussion/active-for-user db mid)))
          (is (= []          (db.discussion/active-for-user db sid))))

        (testing "if they archive a post, they don't see it in the feed"
          (db.discussion/archive! (get-ctx aid) did2 aid)
          (xtdb/sync node)
          (let [db (xtdb/db node)]
            (is (= [did3] (db.discussion/posts-for-user db aid)))
            (is (= []     (db.discussion/active-for-user db aid)))))

        (db.discussion/unarchive! (get-ctx aid) did2 aid)
        (xtdb/sync node)

        (testing "there are feeds specific to the group"
          (db/create-discussion-with-message!
           (get-ctx oid)
           {:did did4 :selected_users #{oid aid mid sid}
            :to_all_contacts false
            :text "Hello to owner, admin, and member, stranger, outside the group"
            :now t4})
          (xtdb/sync node)

          (let [db (xtdb/db node)
                d4 (crdt.discussion/->value (db.discussion/by-id db did4))]

            (is (nil? (:discussion/group_id d4)))

            (is (= [did4 did3 did2 did1] (db.discussion/posts-for-user db oid)))
            (is (= [did4 did3 did2]      (db.discussion/posts-for-user db aid)))
            (is (= [did4 did3]           (db.discussion/posts-for-user db mid)))
            (is (= [did4]                (db.discussion/posts-for-user db sid)))

            (is (= [did2 did1] (db.discussion/active-for-user db oid)))
            (is (= [did2]      (db.discussion/active-for-user db aid)))
            (is (= []          (db.discussion/active-for-user db mid)))
            (is (= []          (db.discussion/active-for-user db sid)))

            (is (= [did3 did2 did1] (db.discussion/posts-for-group db gid oid)))
            (is (= [did3 did2]      (db.discussion/posts-for-group db gid aid)))
            (is (= [did3]           (db.discussion/posts-for-group db gid mid)))
            (is (= []               (db.discussion/posts-for-group db gid sid)))

            (is (= [did2 did1] (db.discussion/active-for-group db gid oid)))
            (is (= [did2]      (db.discussion/active-for-group db gid aid)))
            (is (= []          (db.discussion/active-for-group db gid mid)))
            (is (= []          (db.discussion/active-for-group db gid sid))))))

      (testing "you can have subsets of the users"
        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did5 :group_id gid :selected_users #{oid aid}
          :to_all_contacts false
          :text "Hello to owner and admin, but not member"
          :now t5})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d5 (crdt.discussion/->value (db.discussion/by-id db did5))]
          (is (= #{oid aid} (:discussion/members d5)))
          (is (= gid (:discussion/group_id d5)))

          (is (= [did5 did4 did3 did2 did1] (db.discussion/posts-for-user db oid)))
          (is (= [did5 did4 did3 did2]      (db.discussion/posts-for-user db aid)))
          (is (= [did4 did3]                (db.discussion/posts-for-user db mid)))
          (is (= [did4]                     (db.discussion/posts-for-user db sid)))

          (is (= [did2 did1] (db.discussion/active-for-user db oid)))
          (is (= [did2]      (db.discussion/active-for-user db aid)))
          (is (= []          (db.discussion/active-for-user db mid)))
          (is (= []          (db.discussion/active-for-user db sid)))

          (is (= [did5 did3 did2 did1] (db.discussion/posts-for-group db gid oid)))
          (is (= [did5 did3 did2]      (db.discussion/posts-for-group db gid aid)))
          (is (= [did3]                (db.discussion/posts-for-group db gid mid)))
          (is (= []                    (db.discussion/posts-for-group db gid sid)))

          (is (= [did2 did1] (db.discussion/active-for-group db gid oid)))
          (is (= [did2]      (db.discussion/active-for-group db gid aid)))
          (is (= []          (db.discussion/active-for-group db gid mid)))
          (is (= []          (db.discussion/active-for-group db gid sid)))))

      (testing "if we try to sneak somebody in, it throws an error"
        (is (thrown? java.lang.AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx oid)
                      {:did did6
                       :text "Hello everybody?" :now t4
                       :group_id gid
                       :to_all_contacts false
                       :selected_users #{(str sid)}}))))

      (testing "if a user archives the group, new posts don't show up in their feed"

        (db.group/apply-action! (get-ctx aid)
                                {:xt/id gid
                                 :group/by_uid aid
                                 :group/action :group/archive
                                 :group/delta {:group/updated_at t6}})
        (xtdb/sync node)
        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did6 :group_id gid
          :to_all_contacts true
          :text "Hello to owner and member, to be ignored by admin"
          :now t6})
        (xtdb/sync node)
        (db/create-message!
         (get-ctx mid)
         {:did did6 :text "Owner, member see this, ignored by admin" :now t7})
        (db/create-message!
         (get-ctx aid)
         {:did did6 :text "Admin participates even though they archived" :now t8})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d6 (crdt.discussion/->value (db.discussion/by-id db did6))]
          (testing "the user that archived is a member but also archived the discussion"
            (is (= #{oid mid aid} (:discussion/members d6)))
            (is (= #{aid} (:discussion/archived_uids d6)))
            (is (= gid (:discussion/group_id d6))))

          (is (= [did6 did5 did4 did3 did2 did1] (db.discussion/posts-for-user db oid)))
          (is (= [did5 did4 did3 did2]           (db.discussion/posts-for-user db aid)))
          (is (= [did6 did4 did3]                (db.discussion/posts-for-user db mid)))
          (is (= [did4]                          (db.discussion/posts-for-user db sid)))

          (testing "we hide archived messages from active"
            (is (= [did6 did2 did1] (db.discussion/active-for-user db oid)))
            (is (= [did2]           (db.discussion/active-for-user db aid)))
            (is (= [did6]           (db.discussion/active-for-user db mid)))
            (is (= []               (db.discussion/active-for-user db sid))))

          (testing "we don't hide archived messages when you look into a group's feed"
            (is (= [did6 did5 did3 did2 did1] (db.discussion/posts-for-group db gid oid)))
            (is (= [did6 did5 did3 did2]      (db.discussion/posts-for-group db gid aid)))
            (is (= [did6 did3]                (db.discussion/posts-for-group db gid mid)))
            (is (= []                         (db.discussion/posts-for-group db gid sid)))

            (is (= [did6 did2 did1] (db.discussion/active-for-group db gid oid)))
            (is (= [did6 did2]      (db.discussion/active-for-group db gid aid)))
            (is (= [did6]           (db.discussion/active-for-group db gid mid)))
            (is (= []               (db.discussion/active-for-group db gid sid)))))

        (.close node)))))

(deftest open-group-feeds
  (testing "there is a basic chronological feed"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx :biff/db (xtdb/db node)
                           :auth/user-id uid :auth/cid uid))
          now (Date.)
          t1 (crdt/inc-time now)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t3)
          t5 (crdt/inc-time t4)
          t6 (crdt/inc-time t5)
          t7 (crdt/inc-time t6)
          t8 (crdt/inc-time t7)
          [oid mid aid sid did1 did2 did3 did4 did5 did6]
          (take 10 (repeatedly random-uuid))

          gid (crdt/random-ulid)]

      (db.user/create-user!
       ctx {:id oid :username "owner" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id aid :username "admin" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id mid :username "member" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id sid :username "stranger" :phone "+14159499003" :now now})
      (xtdb/sync node)
      (doseq [[from to] [[oid mid]
                         [oid aid]
                         [mid aid]
                         [oid sid]
                         [mid sid]]]
        (db.contacts/force-contacts! ctx from to))
      (xtdb/sync node)

      (testing "the feeds start empty"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (db.group/create! (get-ctx oid)
                        {:id gid :name "group 1"
                         :owner oid :members #{}
                         :settings {:discussion/member_mode :discussion.member_mode/open}})
      (xtdb/sync node)

      (testing "the feeds are still because we haven't posted anything to the group"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "only those in the group see the posts"
        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did1 :group_id gid
          :to_all_contacts true
          :text "Hello to only owner" :now t1})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))]

          (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
          (is (= :discussion.public_mode/hidden (:discussion/public_mode d1)))
          (is (= gid (:discussion/group_id d1)))

          (is (= #{oid} (:discussion/members d1)))
          (is (= #{oid} (:discussion/active_members d1)))
          (is (= [did1] (db.discussion/posts-for-user db oid)))
          (is (= []     (db.discussion/posts-for-user db mid)))
          (is (= []     (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "once we add somebody to the open group, they can see older posts"
        (db/create-message!
         (get-ctx oid)
         {:did did1 :text "Owner sees this" :now t2})

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid oid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{aid}
                                               :group/updated_at t1}})
        (xtdb/sync node)

        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did2 :group_id gid
          :to_all_contacts true
          :text "Hello to all future members" :now t2})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]

          (is (= #{oid aid} (:discussion/members d1)))
          (is (= #{oid aid} (:discussion/members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db oid))
              "They come in reverse chronological order")
          (is (= [did2 did1] (db.discussion/posts-for-user db aid)))
          (is (= []          (db.discussion/posts-for-user db mid)))

          (is (= [did1] (db.discussion/active-for-user db oid)))
          (is (= []     (db.discussion/active-for-user db aid)))
          (is (= []     (db.discussion/active-for-user db mid))))

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid oid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{mid}
                                               :group/updated_at t2}})
        (db/create-message!
         (get-ctx aid)
         {:did did2 :text "Owner and admin see this as active" :now t3})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]

          (is (= #{oid aid mid} (:discussion/members d1)))
          (is (= #{oid aid mid} (:discussion/members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db oid)))
          (is (= [did2 did1] (db.discussion/posts-for-user db aid)))
          (is (= [did2 did1] (db.discussion/posts-for-user db mid)))

          (is (= [did2 did1] (db.discussion/active-for-user db oid)))
          (is (= [did2]      (db.discussion/active-for-user db aid)))
          (is (= []          (db.discussion/active-for-user db mid))))

        (.close node)))))

(deftest public-group-feeds
  (testing "there is a basic chronological feed"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (assoc ctx :biff/db (xtdb/db node)
                           :auth/user-id uid :auth/cid uid))
          now (Date.)
          t1 (crdt/inc-time now)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t3)
          t5 (crdt/inc-time t4)
          t6 (crdt/inc-time t5)
          t7 (crdt/inc-time t6)
          t8 (crdt/inc-time t7)
          [oid mid aid sid did1 did2 did3 did4 did5 did6]
          (take 10 (repeatedly random-uuid))

          gid (crdt/random-ulid)]

      (db.user/create-user!
       ctx {:id oid :username "owner" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id aid :username "admin" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id mid :username "member" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id sid :username "stranger" :phone "+14159499003" :now now})
      (xtdb/sync node)
      (doseq [[from to] [[oid mid]
                         [oid aid]
                         [mid aid]
                         [oid sid]
                         [mid sid]]]
        (db.contacts/force-contacts! ctx from to))
      (xtdb/sync node)

      (testing "the feeds start empty"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (db.group/create! (get-ctx oid)
                        {:id gid :name "group 1"
                         :owner oid :members #{}
                         :is_public true
                         :settings {:discussion/member_mode :discussion.member_mode/open}})
      (xtdb/sync node)

      (testing "the feeds are still because we haven't posted anything to the group"
        (let [db (xtdb/db node)]
          (is (empty? (db.discussion/posts-for-user db oid)))
          (is (empty? (db.discussion/posts-for-user db mid)))
          (is (empty? (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "only those in the group see the posts"
        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did1 :group_id gid
          :to_all_contacts true
          :text "Hello to only owner" :now t1})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))]

          (is (= :discussion.member_mode/open   (:discussion/member_mode d1)))
          (is (= :discussion.public_mode/public (:discussion/public_mode d1)))
          (is (= gid (:discussion/group_id d1)))

          (is (= #{oid} (:discussion/members d1)))
          (is (= #{oid} (:discussion/active_members d1)))
          (is (= [did1] (db.discussion/posts-for-user db oid)))
          (is (= []     (db.discussion/posts-for-user db mid)))
          (is (= []     (db.discussion/posts-for-user db aid)))

          (is (empty? (db.discussion/active-for-user db oid)))
          (is (empty? (db.discussion/active-for-user db mid)))
          (is (empty? (db.discussion/active-for-user db aid)))))

      (testing "once they add themselves to the group, they can see older posts"
        (db/create-message!
         (get-ctx oid)
         {:did did1 :text "Owner sees this" :now t2})

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid aid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{aid}
                                               :group/updated_at t1}})
        (xtdb/sync node)

        (db/create-discussion-with-message!
         (get-ctx oid)
         {:did did2 :group_id gid
          :to_all_contacts true
          :text "Hello to all future members" :now t2})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]

          (is (= #{oid aid} (:discussion/members d1)))
          (is (= #{oid aid} (:discussion/members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db oid))
              "They come in reverse chronological order")
          (is (= [did2 did1] (db.discussion/posts-for-user db aid)))
          (is (= []          (db.discussion/posts-for-user db mid)))

          (is (= [did1] (db.discussion/active-for-user db oid)))
          (is (= []     (db.discussion/active-for-user db aid)))
          (is (= []     (db.discussion/active-for-user db mid))))

        (db.group/apply-action! (get-ctx oid)
                                {:xt/id gid
                                 :group/by_uid oid
                                 :group/action :group/add-member
                                 :group/delta {:group/members #{mid}
                                               :group/updated_at t2}})
        (db/create-message!
         (get-ctx aid)
         {:did did2 :text "Owner and admin see this as active" :now t3})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did1))
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]

          (is (= #{oid aid mid} (:discussion/members d1)))
          (is (= #{oid aid mid} (:discussion/members d2)))

          (is (= [did2 did1] (db.discussion/posts-for-user db oid)))
          (is (= [did2 did1] (db.discussion/posts-for-user db aid)))
          (is (= [did2 did1] (db.discussion/posts-for-user db mid)))

          (is (= [did2 did1] (db.discussion/active-for-user db oid)))
          (is (= [did2]      (db.discussion/active-for-user db aid)))
          (is (= []          (db.discussion/active-for-user db mid))))

        (.close node)))))
