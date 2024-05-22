(ns gatz.db.discussion-test
  (:require [clojure.data]
            [clojure.test :refer [deftest is testing]]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :refer :all]
            [gatz.db.evt :as db.evt]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [xtdb.api :as xtdb]
            [gatz.db :as db])
  (:import [java.util Date]))

(deftest schemas
  (testing "we can validate all the deltas"
    (let [uid (random-uuid)
          did (random-uuid)
          mid (random-uuid)
          t0 (Date.)
          clock (crdt/new-hlc uid t0)
          mark-message-read-delta {:crdt/clock clock
                                   :discussion/updated_at t0
                                   :discussion/last_message_read {uid (crdt/->LWW clock mid)}}
          archive-delta  {:crdt/clock clock
                          :discussion/updated_at t0
                          :discussion/archived_at {uid (crdt/->LWW clock t0)}}
          subscribe-delta {:crdt/clock clock
                           :discussion/updated_at t0
                           :discussion/subscribers {uid (crdt/->LWW clock true)}}
          unsubscribe-delta {:crdt/clock clock
                             :discussion/updated_at t0
                             :discussion/subscribers {uid (crdt/->LWW clock false)}}]
      (is (malli/validate schema/MarkMessageRead mark-message-read-delta)
          (malli/explain  schema/MarkMessageRead mark-message-read-delta))
      (is (malli/validate schema/ArchiveDiscussion archive-delta)
          (malli/explain  schema/ArchiveDiscussion archive-delta))
      (is (malli/validate schema/SubscribeDelta subscribe-delta)
          (malli/explain  schema/SubscribeDelta subscribe-delta))
      (is (malli/validate schema/SubscribeDelta unsubscribe-delta)
          (malli/explain  schema/SubscribeDelta unsubscribe-delta))
      (testing "and as actions"
        (let [actions [{:discussion.crdt/action :discussion.crdt/mark-message-read
                        :discussion.crdt/delta mark-message-read-delta}
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
                      :discussion/archived_at {poster-uid (crdt/->LWW c0 t0)}}}]
                   [commenter-uid
                    {:discussion.crdt/action :discussion.crdt/archive
                     :discussion.crdt/delta
                     {:crdt/clock c1
                      :discussion/updated_at t1
                      :discussion/archived_at {commenter-uid (crdt/->LWW c1 t1)}}}]
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
                          :db/version 2
                          :discussion/did did
                          :discussion/name nil
                          :discussion/created_at now
                          :discussion/created_by poster-uid
                          :discussion/originally_from nil
                          :discussion/first_message mid

                          :discussion/active_members #{poster-uid}
                          :discussion/members #{poster-uid commenter-uid}
                          :discussion/latest_message mid
                          :discussion/latest_activity_ts now
                          :discussion/seen_at {}

                          :discussion/updated_at t3
                          :discussion/archived_at {poster-uid t0 commenter-uid t1}
                          :discussion/subscribers #{commenter-uid}
                          :discussion/last_message_read {poster-uid mid}}
          final (reduce crdt.discussion/apply-delta initial (shuffle (concat deltas deltas)))]
      (testing "directly via reduce"
        (is-equal {:xt/id did
                   :crdt/clock cnow
                   :db/type :gatz/discussion
                   :db/version 2
                   :discussion/did did
                   :discussion/name nil
                   :discussion/created_at now
                   :discussion/created_by poster-uid
                   :discussion/originally_from nil
                   :discussion/first_message mid
                   :discussion/members #{poster-uid commenter-uid}
                   :discussion/subscribers #{poster-uid}
                   :discussion/active_members #{poster-uid}
                   :discussion/latest_message mid
                   :discussion/last_message_read {}
                   :discussion/latest_activity_ts now
                   :discussion/updated_at now
                   :discussion/seen_at {}
                   :discussion/archived_at {}}
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
            (apply-action! (assoc ctx :biff/db (xtdb/db node)
                                  :auth/user-id uid
                                  :auth/cid uid)
                           did
                           action))
          (xtdb/sync node)
          (let [final (by-id (xtdb/db node) did)]
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

          (mark-message-read! (get-ctx poster-uid) poster-uid did mid)
          (archive! (get-ctx poster-uid) did poster-uid)
          (archive! (get-ctx commenter-uid) did commenter-uid)
          (subscribe! (get-ctx commenter-uid) did commenter-uid)
          (unsubscribe! (get-ctx poster-uid) did poster-uid)
          (xtdb/sync node)
          (let [final (by-id (xtdb/db node) did)
                select-fields (fn [d]
                                (-> d
                                    (select-keys [:xt/id
                                                  :discussion/subscribers
                                                  :discussion/members
                                                  :discussion/active_members
                                                  :discussion/archived_at
                                                  :discussion/last_message_read
                                                  :discussion/created_at
                                                  :discussion/created_by])
                                    (update :discussion/archived_at #(set (keys %)))))]
            (is-equal (select-fields final-expected)
                      (select-fields (crdt.discussion/->value final))))
          (.close node))))))


(deftest feeds
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
      (db.contacts/request-contact! ctx {:from uid :to cid})
      (db.contacts/request-contact! ctx {:from uid :to lid})
      (db.contacts/request-contact! ctx {:from cid :to lid})
      (db.contacts/request-contact! ctx {:from cid :to sid})
      (xtdb/sync node)
      (db.contacts/decide-on-request! ctx {:from uid :to cid
                                           :decision :contact_request/accepted})
      (db.contacts/decide-on-request! ctx {:from uid :to lid
                                           :decision :contact_request/accepted})
      (db.contacts/decide-on-request! ctx {:from cid :to lid
                                           :decision :contact_request/accepted})
      (db.contacts/decide-on-request! ctx {:from cid :to sid
                                           :decision :contact_request/accepted})
      (xtdb/sync node)

      (testing "the feeds start empty"
        (let [db (xtdb/db node)]
          (is (empty? (posts-for-user db uid)))
          (is (empty? (posts-for-user db cid)))
          (is (empty? (posts-for-user db lid)))

          (is (empty? (active-for-user db uid)))
          (is (empty? (active-for-user db cid)))
          (is (empty? (active-for-user db lid)))))

      (testing "the poster only sees their own posts"
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did1 :selected_users #{} :text "Hello to only poster" :now t1})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (by-id db did1))]
          (is (= #{uid} (:discussion/members d1)))
          (is (= #{uid} (:discussion/active_members d1)))
          (is (= [did1] (posts-for-user db uid)))
          (is (= []     (posts-for-user db cid)))
          (is (= []     (posts-for-user db lid)))

          (is (empty? (active-for-user db uid)))
          (is (empty? (active-for-user db cid)))
          (is (empty? (active-for-user db lid)))))

      (testing "the commenter can put posts in the posters feed too"
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did2 :selected_users #{cid}
          :text "Hello to poster and commenter"
          :now t2})
        (db/create-message!
         (get-ctx cid)
         {:did did2 :text "I see this" :now t3})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d2 (crdt.discussion/->value (by-id db did2))]
          (is (= #{uid cid} (:discussion/members d2)))
          (is (= #{uid cid} (:discussion/active_members d2)))

          (is (= [did2 did1] (posts-for-user db uid))
              "They come in reverse chronological order")
          (is (= [did2] (posts-for-user db cid)))
          (is (= []     (posts-for-user db lid)))

          (testing "and the comment bumps the discussion into the activity feed"
            (is (= [did2] (active-for-user db uid)))
            (is (= [did2] (active-for-user db cid)))
            (is (= []     (active-for-user db lid)))))

        (db/create-discussion-with-message!
         (get-ctx cid)
         {:did did3 :selected_users #{uid}
          :text "Hello to poster and commenter. Poster will never comment"
          :now t3})
        (db/create-message!
         (get-ctx uid)
         {:did did1 :text "I see the first post" :now t4})
        (xtdb/sync node)

        (let [db (xtdb/db node)
              d3 (crdt.discussion/->value (by-id db did3))]
          (is (= #{uid cid} (:discussion/members d3)))
          (is (= #{cid}     (:discussion/active_members d3)))

          (is (= [did3 did2 did1] (posts-for-user db uid)))
          (is (= [did3 did2]      (posts-for-user db cid)))
          (is (= []               (posts-for-user db lid)))

          (testing "and the comment bumps the discussion into the activity feed"
            (is (= [did1 did2] (active-for-user db uid)))
            (is (= [did2]      (active-for-user db cid)))
            (is (= []          (active-for-user db lid))))))

      (testing "and the lurker has its own feed to the side"
        (db/create-discussion-with-message!
         (get-ctx lid)
         {:did did4 :selected_users #{lid}
          :text "Hello to only the lurker"
          :now t4})
        (db/create-message!
         (get-ctx cid)
         {:did did3 :text "I comment on my own post" :now t4})
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (is (= [did3 did2 did1] (posts-for-user db uid)))
          (is (= [did3 did2]      (posts-for-user db cid)))
          (is (= [did4]           (posts-for-user db lid)))

          (testing "and there is a new comment"
             ;; Changed
            (is (= [did1 did2] (active-for-user db uid)))
            (is (= [did3 did2] (active-for-user db cid)))
            (is (= []          (active-for-user db lid)))))

        (db/create-message!
         (get-ctx lid)
         {:did did4 :text "I see my lurker post" :now t5})
        (xtdb/sync node)

        (testing "and the comment bumps the discussion into the activity feed"
          (let [db (xtdb/db node)]
             ;; Changed
            (is (= [did1 did2] (active-for-user db uid)))
            (is (= [did3 did2] (active-for-user db cid)))
            (is (= [did4]      (active-for-user db lid))))))

      (testing "the poster can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []               (posts-for-user db uid {:older-than-ts now})))
          (is (= []               (posts-for-user db uid {:older-than-ts t1})))
          (is (= [did1]           (posts-for-user db uid {:older-than-ts t2})))
          (is (= [did2 did1]      (posts-for-user db uid {:older-than-ts t3})))
          (is (= [did3 did2 did1] (posts-for-user db uid {:older-than-ts t4})))
          (is (= [did3 did2 did1] (posts-for-user db uid {:older-than-ts t5})))

          (is (= []          (active-for-user db uid {:older-than-ts now})))
          (is (= []          (active-for-user db uid {:older-than-ts t1})))
          (is (= []          (active-for-user db uid {:older-than-ts t2})))
          (is (= []          (active-for-user db uid {:older-than-ts t3})))
          (is (= [did2]      (active-for-user db uid {:older-than-ts t4})))
          (is (= [did1 did2] (active-for-user db uid {:older-than-ts t5})))
          (is (= [did1 did2] (active-for-user db uid {:older-than-ts t6})))))

      (testing "the commenter can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []          (posts-for-user db cid {:older-than-ts now})))
          (is (= []          (posts-for-user db cid {:older-than-ts t1})))
          (is (= []          (posts-for-user db cid {:older-than-ts t2})))
          (is (= [did2]      (posts-for-user db cid {:older-than-ts t3})))
          (is (= [did3 did2] (posts-for-user db cid {:older-than-ts t4})))

          (is (= []          (active-for-user db cid {:older-than-ts now})))
          (is (= []          (active-for-user db cid {:older-than-ts t1})))
          (is (= []          (active-for-user db cid {:older-than-ts t2})))
          (is (= []          (active-for-user db cid {:older-than-ts t3})))
          (is (= [did2]      (active-for-user db cid {:older-than-ts t4})))
          (is (= [did3 did2] (active-for-user db cid {:older-than-ts t5})))
          (is (= [did3 did2] (active-for-user db cid {:older-than-ts t6})))))

      (testing "the lurker can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []     (posts-for-user db lid {:older-than-ts now})))
          (is (= []     (posts-for-user db lid {:older-than-ts t1})))
          (is (= []     (posts-for-user db lid {:older-than-ts t2})))
          (is (= []     (posts-for-user db lid {:older-than-ts t3})))
          (is (= []     (posts-for-user db lid {:older-than-ts t4})))
          (is (= [did4] (posts-for-user db lid {:older-than-ts t5})))

          (is (= []     (active-for-user db lid {:older-than-ts now})))
          (is (= []     (active-for-user db lid {:older-than-ts t1})))
          (is (= []     (active-for-user db lid {:older-than-ts t2})))
          (is (= []     (active-for-user db lid {:older-than-ts t3})))
          (is (= []     (active-for-user db lid {:older-than-ts t4})))
          (is (= []     (active-for-user db lid {:older-than-ts t5})))
          (is (= [did4] (active-for-user db lid {:older-than-ts t6})))))

      (testing "gives you 20 posts at a time, even if there are 45 there"
        (let [all-dids (take 45 (repeatedly random-uuid))]
          (loop [dids all-dids
                 t now]
            (when-let [did (first dids)]
              (db/create-discussion-with-message!
               (get-ctx sid)
               {:did did :selected_users #{cid sid}
                :text "Hello to spammer"
                :now t})
              (db/create-message!
               (get-ctx cid)
               {:did did :text "Comment" :now (crdt/inc-time t)})
              (recur (rest dids) (crdt/inc-time t))))
          (xtdb/sync node)
          (testing "the post feed batches by 20 at a time"
            (let [db (xtdb/db node)
                  first-feed     (posts-for-user db sid)
                  first-last-ts  (:discussion/created_at (by-id db (last first-feed)))
                  second-feed    (posts-for-user db sid {:older-than-ts first-last-ts})
                  second-last-ts (:discussion/created_at (by-id db (last second-feed)))
                  third-feed     (posts-for-user db sid {:older-than-ts second-last-ts})]
              (is (= 20 (count first-feed)))
              (is (= (take 20 (reverse all-dids)) first-feed))
              (is (= 20 (count second-feed)))
              (is (= (take 20 (drop 20 (reverse all-dids))) second-feed))
              (is (= 5 (count third-feed)))
              (is (= (take 20 (drop 40 (reverse all-dids))) third-feed))))

          (testing "the active feed batches by 20 at a time"
            (let [db (xtdb/db node)
                  first-feed     (active-for-user db sid)
                  first-last-ts  (:discussion/latest_activity_ts (by-id db (last first-feed)))
                  second-feed    (active-for-user db sid {:older-than-ts (crdt/-value first-last-ts)})
                  second-last-ts (:discussion/latest_activity_ts (by-id db (last second-feed)))
                  third-feed     (active-for-user db sid {:older-than-ts (crdt/-value second-last-ts)})]
              (is (= 20 (count first-feed)))
              (is (= (take 20 (reverse all-dids)) first-feed))
              (is (= 20 (count second-feed)))
              (is (= (take 20 (drop 20 (reverse all-dids))) second-feed))
              (is (= 5 (count third-feed)))
              (is (= (take 20 (drop 40 (reverse all-dids))) third-feed))))))

      (.close node))))