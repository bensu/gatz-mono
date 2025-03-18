(ns gatz.api.invite-link-test
  (:require [clojure.data.json :as json]
            [clojure.test :as t :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.discussion :as db.discussion]
            [gatz.db :as db]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [gatz.db.group :as db.group]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.feed :as db.feed]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn- select-feed-item [feed-item]
  (-> feed-item
      (update :feed/ref :xt/id)
      (select-keys [:feed/ref :feed/feed_type])))

(defn parse-resp [resp]
  (json/read-str (:body resp) {:key-fn keyword}))

(deftest crew
  (testing "accepting a crew invite link makes you contacts with everyone"
    (let
     [gid (crdt/random-ulid)
      [uid cid cid2 sid did did2 did3] (take 7 (repeatedly random-uuid))
      now (Date.)
      ctx (db.util-test/test-system)
      node (:biff.xtdb/node ctx)
      get-ctx (fn [uid]
                (-> ctx
                    (assoc :biff/db (xtdb/db node))
                    (assoc :auth/user-id uid)))]

      (db.user/create-user!
       ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id cid :username "contact" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id cid2 :username "second_contact" :phone "+14159499003" :now now})
      (db.user/create-user!
       ctx {:id sid :username "stranger" :phone "+14159499002" :now now})
      (xtdb/sync node)

      (db.group/create! ctx
                        {:id gid
                         :owner uid
                         :now now
                         :settings {:discussion/member_mode :discussion.member_mode/open}
                         :name "test" :members #{}})

      (xtdb/sync node)

      (testing "things start empty"
        (let [db (xtdb/db node)
              group (db.group/by-id db gid)
              u-contacts (db.contacts/by-uid db uid)
              c-contacts (db.contacts/by-uid db cid)
              c2-contacts (db.contacts/by-uid db cid2)
              s-contacts (db.contacts/by-uid db sid)]
          (is (= #{uid} (:group/members group)))
          (is (empty? (:contacts/ids u-contacts)))
          (is (empty? (:contacts/ids c-contacts)))
          (is (empty? (:contacts/ids c2-contacts)))
          (is (empty? (:contacts/ids s-contacts)))))

      ;; Create some discussions that should show up as feed items
      (testing "create discussions that should show up as feed items"
         ;; Create a discussion in the group
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did
          :text "Test discussion in group"
          :group_id gid
          :to_all_contacts true
          :media_ids []})

          ;; Create a direct message discussion
        (db/create-discussion-with-message!
         (get-ctx uid)
         {:did did2
          :text "Test direct message"
          :to_all_contacts true
          :media_ids []})

        (xtdb/sync node))

      (testing "the discussions are the right open mode"
        (let [db (xtdb/db node)
              d1 (crdt.discussion/->value (db.discussion/by-id db did))
              d2 (crdt.discussion/->value (db.discussion/by-id db did2))]
          (is (= :discussion.member_mode/open (:discussion/member_mode d1)))
          (is (= :discussion.member_mode/open (:discussion/member_mode d2)))))

      (testing "the user makes an invite link"
        (let [params  (db.util-test/json-params {:group_id gid})
              ok-resp (api.invite-link/post-crew-invite-link
                       (assoc (get-ctx uid) :params params))
              {:keys [url id]} (parse-resp ok-resp)
              invite-link-id (crdt/parse-ulid id)]

          (is (= 200 (:status ok-resp)))
          (is (string? url))
          (is (crdt/ulid? invite-link-id))

          (xtdb/sync node)

          (testing "the invite link looks like what we expect"
            (let [db (xtdb/db node)
                  il (db.invite-link/by-id db invite-link-id)]
              (is (= invite-link-id (:xt/id il)))
              (is (= gid (:invite_link/group_id il)))))

          (testing "the contact accepts it"
            (let [params  (db.util-test/json-params {:id invite-link-id})
                  ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                     (assoc :params params)))]
              (is (= 200 (:status ok-resp)))))

          (xtdb/sync node)

          (testing "they are now contacts"
            (let [db (xtdb/db node)
                  group (db.group/by-id db gid)
                  u-contacts (db.contacts/by-uid db uid)
                  c-contacts (db.contacts/by-uid db cid)
                  c2-contacts (db.contacts/by-uid db cid2)
                  s-contacts (db.contacts/by-uid db sid)]
              (is (= #{uid cid} (:group/members group)))
              (is (= #{cid} (:contacts/ids u-contacts)))
              (is (= #{uid} (:contacts/ids c-contacts)))
              (is (empty? (:contacts/ids c2-contacts)))
              (is (empty? (:contacts/ids s-contacts)))

              (testing "Contact should have feed items for the open discussions after accepting invite"
                (let [feed-items (db.feed/for-user-with-ts db cid)]
                  (is (= [{:feed/ref did2
                           :feed/feed_type :feed.type/new_post}]
                         (map select-feed-item feed-items)))))))

          (testing "the other makes a discussion before accepting"
            (db/create-discussion-with-message!
             (get-ctx cid2)
             {:did did3
              :text "Test direct message"
              :to_all_contacts true
              :media_ids []})
            (xtdb/sync node)

            (testing "the discussions are the right open mode"
              (let [db (xtdb/db node)
                    d3 (crdt.discussion/->value (db.discussion/by-id db did3))]
                (is (= :discussion.member_mode/open (:discussion/member_mode d3)))
                (is (= #{cid2} (:discussion/members d3))))))

          (testing "the other accepts it"
            (let [params  (json/read-str (json/write-str {:id invite-link-id}) {:key-fn keyword})
                  ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid2)
                                                                     (assoc :params params)))]
              (is (= 200 (:status ok-resp)))))

          (testing "they are now _all_ contacts"
            (let [db (xtdb/db node)
                  group (db.group/by-id db gid)
                  u-contacts (db.contacts/by-uid db uid)
                  c-contacts (db.contacts/by-uid db cid)
                  c2-contacts (db.contacts/by-uid db cid2)
                  s-contacts (db.contacts/by-uid db sid)]
              (is (= #{uid cid cid2} (:group/members group)))
              (is (= #{cid cid2} (:contacts/ids u-contacts)))
              (is (= #{uid cid2} (:contacts/ids c-contacts)))
              (is (= #{uid cid} (:contacts/ids c2-contacts)))
              (is (empty? (:contacts/ids s-contacts)))

              (testing "and they all have the right feed items"
                (let [expected #{{:feed/ref did2
                                  :feed/feed_type :feed.type/new_post}
                                 {:feed/ref did3
                                  :feed/feed_type :feed.type/new_post}}]
                  (is (= expected
                         (set (map select-feed-item (db.feed/for-user-with-ts db cid)))
                         (set (map select-feed-item (db.feed/for-user-with-ts db cid2)))))
                  (testing "one of the users has an additional feed item"
                    (is (= (conj expected {:feed/ref did
                                           :feed/feed_type :feed.type/new_post})
                           (set (map select-feed-item (db.feed/for-user-with-ts db uid))))))))))

          (xtdb/sync node)
          (.close node))))))

(deftest get-invite-by-code
  (testing "getting an invite by code"
    (let [gid (crdt/random-ulid)
          [uid cid] (take 2 (repeatedly random-uuid))
          now (Date.)
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (-> ctx
                        (assoc :biff/db (xtdb/db node))
                        (assoc :auth/user-id uid)))]

      ;; Create test users
      (db.user/create-user!
       ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id cid :username "contact" :phone "+14159499001" :now now})

      ;; Create a group
      (db.group/create! ctx
                        {:id gid
                         :owner uid
                         :now now
                         :settings {:discussion/member_mode :discussion.member_mode/open}
                         :name "test"
                         :members #{}})

      (xtdb/sync node)

      (testing "creating and retrieving a crew invite link"
        (let [params (db.util-test/json-params {:group_id gid})
              create-resp (api.invite-link/post-crew-invite-link
                           (assoc (get-ctx uid) :params params))
              {:keys [id code]} (parse-resp create-resp)
              get-params (db.util-test/json-params {:code code})
              get-resp (api.invite-link/get-invite-by-code
                        (assoc (get-ctx cid) :params get-params))
              resp-body (parse-resp get-resp)]
          (is (= 200 (:status get-resp)))
          (is (= "crew" (:type resp-body)))
          (is (= id (get-in resp-body [:invite_link :id])))))

      (testing "trying any code gets you an empty response"
        (let [non-existent-code "ABCDEF"
              get-resp (api.invite-link/get-invite-by-code
                        (assoc (get-ctx cid) :params (db.util-test/json-params {:code non-existent-code})))]
          (is (= 200 (:status get-resp)))
          (is (= {} (parse-resp get-resp)))))

      (.close node))))

