(ns gatz.api.feed-test
  (:require [clojure.test :refer [deftest testing is]]
            [com.biffweb :as biff]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.api.feed :as api.feed]
            [gatz.db :as db]
            [gatz.db.feed :as db.feed]
            [gatz.db.group :as db.group]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest feed-time-range-test
  (let [now (Date.)
        last-year (Date. (- (.getTime now) (* 365 24 60 60 1000)))
        user-id (random-uuid)
        requester-id (random-uuid)
        new-fi-id (random-uuid)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn [uid]
                  (let [db (xtdb/db node)
                        user (db.user/by-id db uid)]
                    (assoc ctx
                           :auth/user-id uid
                           :auth/user user
                           :auth/cid uid
                           :biff/db db)))]
    (db.user/create-user!
     ctx {:id user-id :username "user" :phone "+14159499000" :now last-year})
    (db.user/create-user!
     ctx {:id requester-id :username "requester" :phone "+14159499001" :now last-year})
    (xtdb/sync node)

    ;; create new discussions
    (doseq [i (range 20)]
      (db/create-discussion-with-message!
       (get-ctx user-id)
       {:to_all_contacts true
        :text (str "Discussion " i)
        :now now}))
    (xtdb/sync node)

    ;; this feed item should show up in the feed because it is within the discussion range
    (db.contacts/apply-request!
     (get-ctx requester-id)
     {:them user-id
      :action :contact_request/requested
      :feed_item_id new-fi-id})
    (xtdb/sync node)
    (testing "we can find the feed item"
      (let [db (xtdb/db node)
            items (db.feed/for-user-with-ts db user-id)]
        (is (= new-fi-id (first (map :xt/id items))))))

    (xtdb/sync node)

    (testing "we can find all the feed item, depending on the time range"
      (let [db (xtdb/db node)]
        (is (= 21 (count (db.feed/for-user-with-ts db user-id {:limit 30}))))
        (is (= 1 (count (db.feed/for-user-with-ts db user-id {:younger-than-ts now :limit 30}))))
        (is (= 0 (count (db.feed/for-user-with-ts db user-id {:older-than-ts last-year
                                                              :limit 30}))))))))

(defn posts-for-user
  ([db uid]
   (posts-for-user db uid {}))
  ([db uid opts]
   (->> (db.feed/for-user-with-ts db uid opts)
        (filter #(= :feed.type/new_post (:feed/feed_type %)))
        (map :feed/ref)
        (map :xt/id))))

(defn mentions-for-user
  ([db uid]
   (mentions-for-user db uid {}))
  ([db uid opts]
   (->> (db.feed/for-user-with-ts db uid opts)
        (filter #(= :feed.type/mentioned_in_discussion (:feed/feed_type %)))
        (map :feed/ref)
        (map :xt/id))))

(deftest posts-in-feed
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
          (is (empty? (posts-for-user db uid)))
          (is (empty? (posts-for-user db cid)))
          (is (empty? (posts-for-user db lid)))

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
          (is (= [did1] (posts-for-user db uid)))
          (is (= []     (posts-for-user db cid)))
          (is (= []     (posts-for-user db lid)))

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

          (is (= [did2 did1] (posts-for-user db uid))
              "They come in reverse chronological order")
          (is (= [did2] (posts-for-user db cid)))
          (is (= []     (posts-for-user db lid)))

          (is (= [did2] (mentions-for-user db uid)))
          (is (= [] (mentions-for-user db cid)))

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

          (is (= [did2] (mentions-for-user db uid)))
          (is (= [] (mentions-for-user db cid)))

          (is (= [did3 did2 did1] (posts-for-user db uid)))
          (is (= [did3 did2]      (posts-for-user db cid)))
          (is (= []               (posts-for-user db lid)))

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
          (is (= [did3 did2 did1] (posts-for-user db uid)))
          (is (= [did3 did2]      (posts-for-user db cid)))
          (is (= [did4]           (posts-for-user db lid)))

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
          (is (= []               (posts-for-user db uid {:older-than-ts now})))
          (is (= []               (posts-for-user db uid {:older-than-ts t1})))
          (is (= [did1]           (posts-for-user db uid {:older-than-ts t2})))
          (is (= [did2 did1]      (posts-for-user db uid {:older-than-ts t3})))
          (is (= [did3 did2 did1] (posts-for-user db uid {:older-than-ts t4})))
          (is (= [did3 did2 did1] (posts-for-user db uid {:older-than-ts t5})))

          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts now})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t1})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t2})))
          (is (= []          (db.discussion/active-for-user db uid {:older-than-ts t3})))
          (is (= [did2]      (db.discussion/active-for-user db uid {:older-than-ts t4})))
          (is (= [did1 did2] (db.discussion/active-for-user db uid {:older-than-ts t5})))
          (is (= [did1 did2] (db.discussion/active-for-user db uid {:older-than-ts t6})))))

      (testing "the commenter can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []          (posts-for-user db cid {:older-than-ts now})))
          (is (= []          (posts-for-user db cid {:older-than-ts t1})))
          (is (= []          (posts-for-user db cid {:older-than-ts t2})))
          (is (= [did2]      (posts-for-user db cid {:older-than-ts t3})))
          (is (= [did3 did2] (posts-for-user db cid {:older-than-ts t4})))

          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts now})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t1})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t2})))
          (is (= []          (db.discussion/active-for-user db cid {:older-than-ts t3})))
          (is (= [did2]      (db.discussion/active-for-user db cid {:older-than-ts t4})))
          (is (= [did3 did2] (db.discussion/active-for-user db cid {:older-than-ts t5})))
          (is (= [did3 did2] (db.discussion/active-for-user db cid {:older-than-ts t6})))))

      (testing "the lurker can ask for older posts"
        (let [db (xtdb/db node)]
          (is (= []     (posts-for-user db lid {:older-than-ts now})))
          (is (= []     (posts-for-user db lid {:older-than-ts t1})))
          (is (= []     (posts-for-user db lid {:older-than-ts t2})))
          (is (= []     (posts-for-user db lid {:older-than-ts t3})))
          (is (= []     (posts-for-user db lid {:older-than-ts t4})))
          (is (= [did4] (posts-for-user db lid {:older-than-ts t5})))

          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts now})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t1})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t2})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t3})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t4})))
          (is (= []     (db.discussion/active-for-user db lid {:older-than-ts t5})))
          (is (= [did4] (db.discussion/active-for-user db lid {:older-than-ts t6})))))

      (testing "repeated tags continue to add mentions"
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
          (is (= []     (mentions-for-user db lid)))
          (is (= [did2] (mentions-for-user db uid)))
          (is (= [did3 did3] (mentions-for-user db cid)))))

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
                  first-feed     (posts-for-user db sid)
                  first-last-ts  (:discussion/created_at (db.discussion/by-id db (last first-feed)))
                  second-feed    (posts-for-user db sid {:older-than-ts first-last-ts})
                  second-last-ts (:discussion/created_at (db.discussion/by-id db (last second-feed)))
                  third-feed     (posts-for-user db sid {:older-than-ts second-last-ts})]
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

(deftest feed-item-hide-and-restore-test
  (testing "feed items can be hidden and restored properly"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (let [db (xtdb/db node)]
                      (assoc ctx
                             :biff/db db
                             :auth/user-id uid
                             :auth/user (db.user/by-id db uid)
                             :auth/cid uid)))
          now (Date.)
          [user-id friend-id] (take 2 (repeatedly random-uuid))
          feed-item-id (random-uuid)]

      ;; Create users
      (db.user/create-user! ctx
                            {:id user-id
                             :username "user"
                             :phone "+14159499000"
                             :now now})
      (db.user/create-user! ctx
                            {:id friend-id
                             :username "friend"
                             :phone "+14159499001"
                             :now now})
      (xtdb/sync node)

      ;; Create feed item
      (let [feed-item {:xt/id feed-item-id
                       :db/type :gatz/feed_item
                       :db/version 1
                       :feed/created_at now
                       :feed/updated_at now
                       :feed/uids #{user-id}
                       :feed/dismissed_by #{}
                       :feed/hidden_for #{}
                       :feed/feed_type :feed.type/new_request
                       :feed/seen_at {}
                       :feed/ref_type :gatz/contact_request
                       :feed/ref friend-id
                       :feed/contact friend-id}]
        (biff/submit-tx ctx [[:xtdb.api/put (assoc feed-item :db/op :create)]]))
      (xtdb/sync node)

      (testing "feed item is initially visible"
        (let [db (xtdb/db node)
              user-feed (db.feed/for-user-with-ts db user-id)]
          (is (= 1 (count user-feed)))
          (is (= feed-item-id (:xt/id (first user-feed))))
          (is (= #{} (:feed/dismissed_by (first user-feed))))
          (is (= #{} (:feed/hidden_for (first user-feed))))))

      (testing "feed item can be hidden (dismissed)"
        (db.feed/dismiss! (get-ctx user-id) user-id feed-item-id)
        (xtdb/sync node)

        (let [db (xtdb/db node)
              item (db.feed/by-id db feed-item-id)]
          (is (= #{user-id} (:feed/dismissed_by item)))
          (is (not= now (:feed/updated_at item))) ; updated_at should change

          ;; Feed should still return the item since we're just getting all items
          (let [user-feed (db.feed/for-user-with-ts db user-id)]
            (is (= 1 (count user-feed)))
            (is (= feed-item-id (:xt/id (first user-feed))))
            (is (= #{user-id} (:feed/dismissed_by (first user-feed)))))))

      (testing "feed item can be restored"
        (db.feed/restore! (get-ctx user-id) user-id feed-item-id)
        (xtdb/sync node)

        (let [db (xtdb/db node)
              item (db.feed/by-id db feed-item-id)]
          (is (= #{} (:feed/dismissed_by item)))
          (is (not= now (:feed/updated_at item))) ; updated_at should change again

          (let [user-feed (db.feed/for-user-with-ts db user-id)]
            (is (= 1 (count user-feed)))
            (is (= feed-item-id (:xt/id (first user-feed))))
            (is (= #{} (:feed/dismissed_by (first user-feed)))))))

      ;; Cleanup
      (.close node))))

(deftest feed-api-dismiss-and-restore-test
  (testing "API endpoints for feed item dismissal and restoration work properly"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (let [db (xtdb/db node)
                          user (db.user/by-id db uid)]
                      (assoc ctx
                             :biff/db db
                             :auth/user-id uid
                             :auth/user user
                             :auth/cid uid)))
          now (Date.)
          [user-id friend-id] (take 2 (repeatedly random-uuid))
          feed-item-id (random-uuid)]

      ;; Create users
      (db.user/create-user! ctx
                            {:id user-id
                             :username "user"
                             :phone "+14159499000"
                             :now now})
      (db.user/create-user! ctx
                            {:id friend-id
                             :username "friend"
                             :phone "+14159499001"
                             :now now})
      (xtdb/sync node)

      ;; Create feed item
      (let [feed-item {:xt/id feed-item-id
                       :db/type :gatz/feed_item
                       :db/version 1
                       :feed/created_at now
                       :feed/updated_at now
                       :feed/uids #{user-id}
                       :feed/dismissed_by #{}
                       :feed/hidden_for #{}
                       :feed/feed_type :feed.type/new_request
                       :feed/seen_at {}
                       :feed/ref_type :gatz/contact_request
                       :feed/ref friend-id
                       :feed/contact friend-id}]
        (biff/submit-tx ctx [[:xtdb.api/put (assoc feed-item :db/op :create)]]))
      (xtdb/sync node)

      (testing "dismiss API endpoint works properly"
        (let [ctx (get-ctx user-id)
              resp (api.feed/dismiss! (assoc ctx :params {:id (str feed-item-id)}))]
          (is (= 200 (:status resp)))
          (xtdb/sync node)

          (let [db (xtdb/db node)
                item (db.feed/by-id db feed-item-id)]
            (is (= #{user-id} (:feed/dismissed_by item))))))

      (testing "restore API endpoint works properly"
        (let [ctx (get-ctx user-id)
              resp (api.feed/restore! (assoc ctx :params {:id (str feed-item-id)}))]
          (is (= 200 (:status resp)))
          (xtdb/sync node)

          (let [db (xtdb/db node)
                item (db.feed/by-id db feed-item-id)]
            (is (= #{} (:feed/dismissed_by item))))))

      (testing "dismiss and restore API endpoints handle invalid parameters"
        (let [ctx (get-ctx user-id)
              dismiss-resp (api.feed/dismiss! (assoc ctx :params {}))
              restore-resp (api.feed/restore! (assoc ctx :params {}))]
          (is (= "invalid_params" (get-in dismiss-resp [:body :error])))
          (is (= "invalid_params" (get-in restore-resp [:body :error])))))

      ;; Cleanup
      (.close node))))

(deftest location-feeds
  (testing "posts are filtered by location in feeds"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (let [db (xtdb/db node)]
                      (assoc ctx
                             :biff/db db
                             :auth/user-id uid
                             :auth/user (db.user/by-id db uid)
                             :auth/cid uid)))
          now (Date.)
          t1 (crdt/inc-time now)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          t4 (crdt/inc-time t3)
          [uid1 uid2 uid3] (take 3 (repeatedly random-uuid))
          [did1 did2 did3 did4 did5] (take 5 (repeatedly random-uuid))
          miami-location "US/MIA"
          nyc-location "US/NYC"]

      ;; Create users
      (db.user/create-user!
       ctx {:id uid1 :username "miami_user" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id uid2 :username "nyc_user" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id uid3 :username "other_user" :phone "+14159499002" :now now})
      (xtdb/sync node)

      ;; Set up contacts
      (doseq [[from to] [[uid1 uid2]
                         [uid1 uid3]
                         [uid2 uid1]
                         [uid2 uid3]
                         [uid3 uid1]
                         [uid3 uid2]]]
        (db.contacts/force-contacts! ctx from to))
      (xtdb/sync node)

      (testing "posts from different locations are properly filtered"
        ;; Create posts in different locations
        (db/create-discussion-with-message!
         (get-ctx uid1)
         {:did did1
          :location_id miami-location
          :to_all_contacts true
          :text "Hello from Miami"
          :now t1})
        (db/create-discussion-with-message!
         (get-ctx uid2)
         {:did did2
          :location_id nyc-location
          :to_all_contacts true
          :text "Hello from NYC"
          :now t2})
        (db/create-discussion-with-message!
         (get-ctx uid3)
         {:did did3
          :location_id miami-location
          :to_all_contacts true
          :text "Another Miami post"
          :now t3})
        (db/create-discussion-with-message!
         (get-ctx uid1)
         {:did did4
          :to_all_contacts true
          :text "No location post"
          :now t4})
        (xtdb/sync node)

        (let [db (xtdb/db node)]
          (testing "miami feed shows only miami posts"
            (let [miami-feed (db.feed/for-user-with-ts db uid1 {:location_id miami-location})]
              (is (= [did3 did1] (map (comp :xt/id :feed/ref) miami-feed))
                  "Miami feed should only show posts from Miami")))

          (testing "nyc feed shows only nyc posts"
            (let [nyc-feed (db.feed/for-user-with-ts db uid2 {:location_id nyc-location})]
              (is (= [did2] (map (comp :xt/id :feed/ref) nyc-feed))
                  "NYC feed should only show posts from NYC")))

          (testing "no location filter shows all posts"
            (let [all-feed (db.feed/for-user-with-ts db uid1)]
              (is (= [did4 did3 did2 did1] (map (comp :xt/id :feed/ref) all-feed))
                  "Unfiltered feed should show all posts")))

          (testing "all friends get these location posts"
            (let [all-feed (db.feed/for-user-with-ts db uid3)]
              (is (= [did4 did3 did2 did1] (map (comp :xt/id :feed/ref) all-feed))
                  "Unfiltered feed should show all posts")))

          (testing "posts are properly ordered by creation time"
            (let [miami-feed (db.feed/for-user-with-ts db uid1 {:location_id miami-location})]
              (is (= [did3 did1] (map (comp :xt/id :feed/ref) miami-feed))
                  "Posts should be ordered by creation time, newest first")))))

      #_(testing "location filtering works with pagination"
          (let [db (xtdb/db node)
              ;; Get first page with 1 post
                first-page (db.feed/for-user-with-ts db uid1 {:location_id miami-location :limit 1})
                last-from-first-page (last first-page)
                first-last-ts (:discussion/created_at (db.discussion/by-id db last-from-first-page))
              ;; Get second page
                second-page (db.feed/for-user-with-ts db uid1 {:location_id miami-location :limit 1 :older-than-ts first-last-ts})]
            (is (= [did3] (map (comp :xt/id :feed/ref) first-page)) "First page should have newest Miami post")
            (is (= [did1] (map (comp :xt/id :feed/ref) second-page)) "Second page should have older Miami post")))

      (testing "location posts with selected users only go to selected users"
        ;; Create a post in Miami but only select uid2 (NYC user)
        (db/create-discussion-with-message!
         (get-ctx uid1)
         {:did did5
          :location_id miami-location
          :selected_users [uid2]
          :text "Miami post for NYC user"
          :now (crdt/inc-time t4)})
        (xtdb/sync node)

        (let [db (xtdb/db node)]

          ;; NYC user should see the post in their NYC feed
          (let [nyc-feed (db.feed/for-user-with-ts db uid2 {:location_id nyc-location})]
            (is (= [did2] (map (comp :xt/id :feed/ref) nyc-feed))
                "NYC feed should only show NYC posts"))

          ;; NYC user should see the post in their unfiltered feed
          (let [all-feed (db.feed/for-user-with-ts db uid2)]
            (is (= [did5 did4 did3 did2 did1] (map (comp :xt/id :feed/ref) all-feed))
                "Unfiltered feed should only show posts they're selected for"))

          ;; Miami user should not see the post in their Miami feed
          (let [miami-feed (db.feed/for-user-with-ts db uid1 {:location_id miami-location})]
            (is (= [did5 did3 did1] (map (comp :xt/id :feed/ref) miami-feed))
                "Miami feed should not show posts they're not selected for"))

          (testing "location respects selected users, did5 is not included"
            (let [all-feed (db.feed/for-user-with-ts db uid3)]
              (is (= [did4 did3 did2 did1] (map (comp :xt/id :feed/ref) all-feed))
                  "Unfiltered feed should show all posts")))

          ;; Miami user should see the post in their unfiltered feed
          (let [all-feed (db.feed/for-user-with-ts db uid1)]
            (is (= [did5 did4 did3 did2 did1] (map (comp :xt/id :feed/ref) all-feed))
                "Unfiltered feed should show all posts"))))

      (testing "cannot create a discussion with both group and location"
        (let [gid (crdt/random-ulid)]
          ;; Create a group first
          (db.group/create! (get-ctx uid1)
                            {:id gid :name "test group"
                             :owner uid1
                             :members #{uid2}
                             :now now})
          (xtdb/sync node)

          ;; Try to create a discussion with both group and location
          (is (thrown? java.lang.AssertionError
                       (db/create-discussion-with-message!
                        (get-ctx uid1)
                        {:did (random-uuid)
                         :group_id gid
                         :location_id miami-location
                         :to_all_contacts true
                         :text "This should fail"
                         :now (crdt/inc-time t4)}))
              "Should not be able to create a discussion with both group and location")))

      (.close node))))
