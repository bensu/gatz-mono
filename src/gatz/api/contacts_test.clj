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

