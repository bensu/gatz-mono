(ns gatz.api.contacts-test
  (:require [clojure.data.json :as json]
            [clojure.test :as test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.api.contacts :as api.contacts]
            [gatz.api.group :as api.group]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.group :as db.group]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb])
  (:import [java.util Date]
           [java.time Duration]))

(deftest parse-params
  (testing "parsing the deltas works"
    (let [gid (crdt/random-ulid)
          json-params (json/read-str (json/write-str {:group_id gid}) {:key-fn keyword})]
      (is (= {:group_id gid} (api.contacts/parse-get-contact-params json-params))))
    (let [json-params (json/read-str (json/write-str {:group_id "Garbage"}) {:key-fn keyword})]
      (is (= {:group_id nil} (api.contacts/parse-get-contact-params json-params))))
    (let [uid (random-uuid)
          action :contact_request/requested
          json-params (json/read-str (json/write-str {:to uid :action action}) {:key-fn keyword})]
      (is (= {:to uid :action action} (api.contacts/parse-contact-request-params json-params))))))

(deftest basic-flow
  (testing "the user can get its contacts"
    (let [uid (random-uuid)
          cid (random-uuid)
          sid (random-uuid)
          gid (crdt/random-ulid)
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
       ctx {:id sid :username "stranger" :phone "+14159499002" :now now})
      (xtdb/sync node)


      (let [ok-resp (api.contacts/get-all-contacts (get-ctx uid))
            {:keys [group contacts]} (json/read-str (:body ok-resp) {:key-fn keyword})]
        (is (= 200 (:status ok-resp)))
        (is (nil? group) "Not asking for the group, not getting it")
        (is (empty? contacts)))

      (db.contacts/force-contacts! ctx uid cid)
      (db.group/create! ctx
                        {:id gid :owner uid :now now
                         :name "test" :members #{cid}})
      (xtdb/sync node)

      (let [ok-resp (api.contacts/get-all-contacts (get-ctx uid))
            {:keys [group contacts]} (json/read-str (:body ok-resp) {:key-fn keyword})]
        (is (= 200 (:status ok-resp)))
        (is (nil? group) "Not asking for the group, not getting it")
        (is (= 1 (count contacts))))

      (let [params {:id (str gid)
                    :delta {:members [(str sid)]}
                    :action "add-member"}
            ok-resp (api.group/handle-request! (-> (get-ctx uid)
                                                   (assoc :params params)))
            {:keys [status group]} (json/read-str (:body ok-resp) {:key-fn keyword})]
        (is (= 200 (:status ok-resp)))
        (is (= "success" status))
        (is (= (str gid) (:id group))))

      (xtdb/sync node)

      (let [ok-resp (api.contacts/get-all-contacts (-> (get-ctx uid)
                                                       (assoc :params {:group_id (str gid)})))
            {:keys [group contacts]} (json/read-str (:body ok-resp) {:key-fn keyword})]
        (is (= 200 (:status ok-resp)))
        (is (= (str gid) (:id group)))
        (is (= (set (map str [sid uid cid]))
               (set (map :id contacts)))))

      (.close node))))

(deftest invite-contacts
  (testing "when inviting a contact, they see your open discussions"
    (let [uid (random-uuid)
          cid (random-uuid)
          cid2 (random-uuid)
          sid api.invite-link/test-special-contact
          fid (random-uuid)
          did (random-uuid)
          did2 (random-uuid)
          gid (crdt/random-ulid)
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
       ctx {:id cid :username "eventual_contact" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id sid :username "first_contact" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id cid2 :username "second_contact" :phone "+14159499003" :now now})
      (db.user/create-user!
       ctx {:id fid :username "friend_of_friend" :phone "+14159499004" :now now})
      (xtdb/sync node)

      (db.group/create! ctx
                        {:id gid :owner uid :now now
                         :settings {:discussion/member_mode :discussion.member_mode/open}
                         :name "test" :members #{}})
      (db.contacts/force-contacts! ctx uid sid)
      (db.contacts/force-contacts! ctx uid cid2)
      (db.contacts/force-contacts! ctx sid fid)
      (xtdb/sync node)

      (db/create-discussion-with-message!
       (get-ctx uid)
       {:did did
        :to_all_contacts true
        :text "Open discussion that contact can join"})
      (db/create-discussion-with-message!
       (get-ctx uid)
       {:did did2
        :to_all_contacts true
        :group_id gid
        :text "Open discussion _in a group_ contact can not join"})

      (xtdb/sync node)

      (let [db (xtdb/db node)
            d (crdt.discussion/->value (db.discussion/by-id db did))]
        (is (= #{sid cid2 uid} (:discussion/members d)))
        (is (= :discussion.member_mode/open (:discussion/member_mode d))))

      (testing "inviting through a contact link, makes you contacts and gives you access to posts"
        (let [ok-resp (api.invite-link/post-contact-invite-link (get-ctx uid))
              {:keys [url id]} (json/read-str (:body ok-resp) {:key-fn keyword})]

          (is (= 200 (:status ok-resp)))
          (is (string? url))
          (is (crdt/ulid? (crdt/parse-ulid id)))

          (xtdb/sync node)

          (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                   (assoc :params params)))]
            (is (= 200 (:status ok-resp))))

          (xtdb/sync node)

          (testing "you can do this multiple times"
            (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                  {:keys [status]} (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                              (assoc :params params)))]
              (is (= 200 status))))))
      (xtdb/sync node)

      (let [db (xtdb/db node)
            d (crdt.discussion/->value (db.discussion/by-id db did))
            d2 (crdt.discussion/->value (db.discussion/by-id db did2))
            uid-contacts (db.contacts/by-uid db uid)
            cid-contacts (db.contacts/by-uid db cid)
            posts (db.discussion/posts-for-user db cid)]

        (testing "they are now contacts with each other"
          (is (contains? (:contacts/ids uid-contacts) cid))
          (is (contains? (:contacts/ids cid-contacts) uid))
          (testing "but not with each others contacts"
            (is (contains? (:contacts/ids uid-contacts) sid))
            (is (not (contains? (:contacts/ids cid-contacts) sid)))))
        (testing "the new contact can see personal posts but not group posts"
          (is (= [did] posts))
          (is (= #{sid cid uid cid2} (:discussion/members d)))
          (is (= #{uid} (:discussion/members d2)))))

      (testing "some special people, can invite and make you contact of their contacts"
        (let [ok-resp (api.invite-link/post-contact-invite-link (get-ctx sid))
              {:keys [url id]} (json/read-str (:body ok-resp) {:key-fn keyword})]

          (is (= 200 (:status ok-resp)))
          (is (string? url))
          (is (crdt/ulid? (crdt/parse-ulid id)))

          (xtdb/sync node)

          (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                   (assoc :params params)))]
            (is (= 200 (:status ok-resp))))

          (xtdb/sync node)
          (testing "they are now contacts with each other"
            (let [db (xtdb/db node)
                  sid-contacts (db.contacts/by-uid db sid)
                  cid-contacts (db.contacts/by-uid db cid)]
              (is (contains? (:contacts/ids sid-contacts) cid))
              (is (contains? (:contacts/ids cid-contacts) sid))
              (testing "and each others contacts"
                (is (contains? (:contacts/ids sid-contacts) fid))
                (is (contains? (:contacts/ids cid-contacts) fid)))))))

      (testing "inviting through an expired link fails"
        (let [now (Date.)
              before-expiry-ts (Date. (+ (.getTime now)
                                         (.toMillis (Duration/ofDays 6))))
              after-expiry-ts (Date. (+ (.getTime now)
                                        (.toMillis (Duration/ofDays 8))))
              ok-resp (api.invite-link/post-contact-invite-link (get-ctx uid))
              {:keys [url id]} (json/read-str (:body ok-resp) {:key-fn keyword})]

          (is (= 200 (:status ok-resp)))
          (is (string? url))
          (is (crdt/ulid? (crdt/parse-ulid id)))

          (xtdb/sync node)

          ;; Let the link expire
          (binding [db.invite-link/*test-current-ts* after-expiry-ts]
            (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                  ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                     (assoc :params params)))]
              (is (= 400 (:status ok-resp))))
            (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                  ok-resp (api.invite-link/get-invite-link (-> (get-ctx cid)
                                                               (assoc :params params)))]
              (is (= 400 (:status ok-resp)))))
          (binding [db.invite-link/*test-current-ts* before-expiry-ts]
            (let [params  (json/read-str (json/write-str {:id id}) {:key-fn keyword})
                  ok-resp (api.invite-link/post-join-invite-link (-> (get-ctx cid)
                                                                     (assoc :params params)))]
              (is (= 200 (:status ok-resp)))))))

      (xtdb/sync node)

      (.close node))))

(deftest deleted-users
  (testing "only deleted users are masked in the response"
    (let [uid (random-uuid)
          cid1 (random-uuid)
          cid2 (random-uuid)
          cid3 (random-uuid)
          fof1 (random-uuid)  ;; friend of friend 1
          fof2 (random-uuid)  ;; friend of friend 2
          gid (crdt/random-ulid)  ;; group id
          now (Date.)
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (-> ctx
                        (assoc :biff/db (xtdb/db node))
                        (assoc :auth/user-id uid)))]

      ;; Create users - main user, three contacts, and two friends-of-friends
      (db.user/create-user!
       ctx {:id uid :username "user_id" :phone "+14159499000" :now now})
      (db.user/create-user!
       ctx {:id cid1 :username "contact1" :phone "+14159499001" :now now})
      (db.user/create-user!
       ctx {:id cid2 :username "contact2" :phone "+14159499002" :now now})
      (db.user/create-user!
       ctx {:id cid3 :username "contact3" :phone "+14159499003" :now now})
      (db.user/create-user!
       ctx {:id fof1 :username "friend_of_friend1" :phone "+14159499004" :now now})
      (db.user/create-user!
       ctx {:id fof2 :username "friend_of_friend2" :phone "+14159499005" :now now})
      (xtdb/sync node)

      ;; Create a group with all users
      (db.group/create!
       ctx {:id gid :owner uid :now now
            :name "test" :members #{cid1 cid2 cid3 fof1 fof2}})

      ;; Make them all contacts
      (db.contacts/force-contacts! ctx uid cid1)
      (db.contacts/force-contacts! ctx uid cid2)
      (db.contacts/force-contacts! ctx uid cid3)
      ;; Make friends-of-friends connections
      (db.contacts/force-contacts! ctx cid1 fof1)
      (db.contacts/force-contacts! ctx cid2 fof2)
      (xtdb/sync node)

      ;; Verify initial state - all contacts and friends-of-friends visible
      (let [ok-resp (api.contacts/get-all-contacts (get-ctx uid))
            {:keys [contacts friends_of_friends]} (json/read-str (:body ok-resp) {:key-fn keyword})
            contact-names (set (map :name contacts))
            fof-names (set (map :name friends_of_friends))]
        (is (= 200 (:status ok-resp)))
        (is (= 3 (count contacts)))
        (is (= #{"contact1" "contact2" "contact3"} contact-names))
        (is (= 2 (count friends_of_friends)))
        (is (= #{"friend_of_friend1" "friend_of_friend2"} fof-names)))

      ;; Verify initial group state
      (let [ok-resp (api.contacts/get-all-contacts (-> (get-ctx uid)
                                                       (assoc :params {:group_id (str gid)})))
            {:keys [contacts group]} (json/read-str (:body ok-resp) {:key-fn keyword})
            contact-names (set (map :name contacts))]
        (is (= 200 (:status ok-resp)))
        (is (= (str gid) (:id group)))
        (is (= 6 (count contacts)))
        (is (= #{"user_id" "contact1" "contact2" "contact3" "friend_of_friend1" "friend_of_friend2"} contact-names)))

      ;; Delete one contact and one friend-of-friend
      (db.user/mark-deleted! (get-ctx cid2) {:now now})
      (db.user/mark-deleted! (get-ctx fof1) {:now now})
      (xtdb/sync node)

      ;; Verify only the deleted users are masked in direct contacts
      (let [ok-resp (api.contacts/get-all-contacts (get-ctx uid))
            {:keys [contacts friends_of_friends]} (json/read-str (:body ok-resp) {:key-fn keyword})
            contacts-by-id (reduce #(assoc %1 (:id %2) %2) {} contacts)
            fof-by-id (reduce #(assoc %1 (:id %2) %2) {} friends_of_friends)]
        (is (= 200 (:status ok-resp)))
        (is (= 2 (count contacts)))
        (is (= 1 (count friends_of_friends)))

        (testing "deleted contact is hidden"
          (let [deleted-contact (get contacts-by-id (str cid2))]
            (is (nil? deleted-contact))))

        (testing "the other contacts are unaffected"
          (let [contact1 (get contacts-by-id (str cid1))
                contact3 (get contacts-by-id (str cid3))]
            (is (= "contact1" (:name contact1)))
            (is (= "contact3" (:name contact3)))))

        (testing "deleted friend-of-friend is hidden"
          (let [deleted-fof (get fof-by-id (str fof1))]
            (is (nil? deleted-fof))))

        (testing "the other friend-of-friend is unaffected"
          (let [active-fof (get fof-by-id (str fof2))]
            (is (= "friend_of_friend2" (:name active-fof))))))

      ;; Verify deleted users are also hidden in group contacts
      (let [ok-resp (api.contacts/get-all-contacts (-> (get-ctx uid)
                                                       (assoc :params {:group_id (str gid)})))
            {:keys [contacts group]} (json/read-str (:body ok-resp) {:key-fn keyword})
            contacts-by-id (reduce #(assoc %1 (:id %2) %2) {} contacts)]
        (is (= 200 (:status ok-resp)))
        (is (= (str gid) (:id group)))
        (is (= 4 (count contacts)))

        (testing "deleted users are hidden from group contacts"
          (let [deleted-contact (get contacts-by-id (str cid2))
                deleted-fof (get contacts-by-id (str fof1))]
            (is (nil? deleted-contact))
            (is (nil? deleted-fof))))

        (testing "active users remain visible in group contacts"
          (is (= #{"user_id" "contact1" "contact3" "friend_of_friend2"}
                 (set (map :name contacts))))))

      (.close node))))

