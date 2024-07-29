(ns gatz.api.invite-link-test
  (:require [clojure.data.json :as json]
            [clojure.test :as t :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [gatz.db.group :as db.group]
            [gatz.db.contacts :as db.contacts]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest crew
  (testing "accepting a crew invite link makes you contacts with everyone"
    (let
     [uid (random-uuid)
      cid (random-uuid)
      cid2 (random-uuid)
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
        (is (empty? (:contacts/ids s-contacts))))

      (testing "the user makes an invite link"
        (let [params  (db.util-test/json-params {:group_id gid})
              ok-resp (api.invite-link/post-crew-invite-link
                       (assoc (get-ctx uid) :params params))
              {:keys [url]} (json/read-str (:body ok-resp) {:key-fn keyword})
              invite-link-id (db.invite-link/parse-url url)]

          (is (= 200 (:status ok-resp)))
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
              (is (empty? (:contacts/ids s-contacts)))))

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
              (is (empty? (:contacts/ids s-contacts))))))

        (xtdb/sync node)))))
