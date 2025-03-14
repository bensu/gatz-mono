(ns gatz.api.feed-test
  (:require [clojure.test :refer [deftest testing is]]
            [com.biffweb :as biff]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db :as db]
            [gatz.db.feed :as db.feed]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest feed-time-range-test
  (let [now (Date.)
        t1 (crdt/inc-time now)
        last-year (Date. (- (.getTime now) (* 365 24 60 60 1000)))
        user-id (random-uuid)
        requester-id (random-uuid)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn [uid]
                  (let [db (xtdb/db node)
                        user (db.user/by-id db uid)]
                    (assoc ctx
                           :auth/user-id uid
                           :auth/user user
                           :auth/cid uid
                           :biff/db db)))

        _ (db.user/create-user!
           ctx {:id user-id :username "user" :phone "+14159499000" :now last-year})
        _ (db.user/create-user!
           ctx {:id requester-id :username "requester" :phone "+14159499001" :now last-year})
        _ (xtdb/sync node)

        ;; create new discussions
        _ (doseq [i (range 20)]
            (db/create-discussion-with-message!
             (get-ctx user-id)
             {:to_all_contacts true
              :text (str "Discussion " i)
              :now now}))
        _ (xtdb/sync node)

        ;; this feed item should show up in the feed because it is within the discussion range
        new-fi-id (random-uuid)
        {:keys [request]} (db.contacts/apply-request!
                           (get-ctx requester-id)
                           {:them user-id
                            :action :contact_request/requested
                            :feed_item_id new-fi-id})
        _ (xtdb/sync node)


     ;; But these older feed items should not show up in the fed
        cr (assoc request :contact_request/created_at last-year)]

    (testing "we can find the feed item"
      (let [db (xtdb/db node)
            items (db.feed/for-user-with-ts db user-id)]
        (is (= new-fi-id (first (map :xt/id items))))))

    (dotimes [_i 20]
      (let [fi (db.feed/new-cr-item (random-uuid) cr)]
        (biff/submit-tx (get-ctx user-id) [[:xtdb.api/put (assoc fi :db/doc-type :gatz/feed_item)]])))
    (xtdb/sync node)

    (testing "we can find all the feed item, depending on the time range"
      (let [db (xtdb/db node)]
        (is (= 21 (count (db.feed/for-user-with-ts db user-id {:limit 30}))))
        (is (= 20 (count (db.feed/for-user-with-ts db user-id {:older-than-ts now :limit 30}))))
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

