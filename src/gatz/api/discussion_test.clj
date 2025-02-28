(ns gatz.api.discussion-test
  (:require [clojure.test :refer [deftest is testing]]
            [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.flags :as flags]
            [gatz.api.discussion :as api.discussion]
            [gatz.db :as db]
            [gatz.db.user :as db.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn roundtrip [data]
  (json/read-str (json/write-str data) {:key-fn keyword}))

(deftest feed-params
  (testing "it can parse the basic params"
    (let [did (random-uuid)]
      (is (= {} (api.discussion/parse-feed-params {})))
      (is (= {:last_did did} (api.discussion/parse-feed-params {:last_did (str did)})))
      (is (= {:last_did nil} (api.discussion/parse-feed-params {:last_did "not a uuid"}))))))

(deftest handle-request-params
  (testing "we can parse add-members"
    (let [t0 (Date.)
          uid (random-uuid)
          clock (crdt/new-hlc uid t0)
          lww-set-delta {uid (crdt/->LWW clock true)}
          delta {:discussion/members #{uid}}
          json-delta (roundtrip delta)]
      (is (= delta (api.discussion/parse-delta json-delta)))
      (is (= lww-set-delta (crdt/lww-set-delta clock (:discussion/members delta))))
      (is (= {:discussion/members lww-set-delta}
             (api.discussion/delta->crdt clock (api.discussion/parse-delta json-delta)))))))

(deftest parse-create-params
  (testing "we can parse create param discussion"
    (let [params {:text "Here"
                  :to_all_contacts true
                  :group_id (crdt/random-ulid)
                  :selected_users (set [(random-uuid) (random-uuid)])
                  :to_all_friends_of_friends false
                  :originally_from {:did (random-uuid) :mid (random-uuid)}}
          json-params (roundtrip params)]
      (is (= params (db/parse-create-params json-params))))))

(def user-id #uuid "867884d0-986e-4e5f-816c-b12846645e6b")
(def friend1-id #uuid "0b042b9c-5f47-407f-90de-24b7262e7345")
(def friend2-id #uuid "64a719fa-4963-42e2-bc7e-0cb7beb8844c")
(def friend3-id #uuid "f007b362-082c-4c58-a401-f1bfa842890c")
(def friend4-id #uuid "6cac1387-3ea1-4e5f-b622-5e3fba55577c")

(def friends-params-v1-1-10
  {:group_id nil
   :link_previews []
   :selected_users [friend1-id friend2-id friend3-id friend4-id user-id]
   :text "All friends"
   :to_all_contacts true})

(def selected-friends-params-v1-1-10
  {:group_id nil
   :link_previews []
   :selected_users [friend1-id friend3-id]
   :text "Selection"
   :to_all_contacts false})

(def fof-params-v1-1-11
  {:group_id nil
   :link_previews []
   :selected_users nil
   :text "Hello to friends of friends"
   :to_all_contacts true
   :to_all_friends_of_friends true})

(def friends-params-v1-1-11
  {:group_id nil
   :link_previews []
   :selected_users nil
   :text "Hello to all friends"
   :to_all_contacts true
   :to_all_friends_of_friends false})

(def selected-friends-params-v1-1-11
  {:group_id nil
   :link_previews []
   :selected_users [friend1-id friend4-id]
   :text "selected friends"
   :to_all_contacts false
   :to_all_friends_of_friends false})

(deftest test-discussion-params
  (testing "creating discussions with different parameter sets"
    (flags/with-flags {:flags/post_to_friends_of_friends true}
      (let [ctx (db.util-test/test-system)
            node (:biff.xtdb/node ctx)
            now (Date.)
            all-friends (set (map str #{friend1-id friend2-id friend3-id friend4-id user-id}))
            get-ctx (fn [uid]
                      (let [db (xtdb/db node)
                            user (db.user/by-id db uid)]
                        (assoc ctx
                               :biff/db db
                               :auth/user user
                               :auth/user-id uid
                               :auth/cid uid)))
            parse-response (fn [response]
                             (json/read-str (:body response) {:key-fn keyword}))]

      ;; Create users
        (db.user/create-user! ctx {:id user-id :username "test" :phone "+14159499000" :now now})
        (db.user/create-user! ctx {:id friend1-id :username "friend1" :phone "+14159499001" :now now})
        (db.user/create-user! ctx {:id friend2-id :username "friend2" :phone "+14159499002" :now now})
        (db.user/create-user! ctx {:id friend3-id :username "friend3" :phone "+14159499003" :now now})
        (db.user/create-user! ctx {:id friend4-id :username "friend4" :phone "+14159499004" :now now})
        (xtdb/sync node)

      ;; Set up contacts
        (doseq [friend-id [friend1-id friend2-id friend3-id friend4-id]]
          (db.contacts/force-contacts! ctx user-id friend-id))
        (xtdb/sync node)

        (testing "v1.1.10 all friends"
          (let [did (random-uuid)
                response (api.discussion/create-discussion!
                          (assoc (get-ctx user-id)
                                 :params (assoc friends-params-v1-1-10 :did did)))
                discussion (:discussion (parse-response response))]
            (is (= 200 (:status response)))
            (is (= all-friends (set (:members discussion))))
            (is (= "open" (:member_mode discussion)))))

        (testing "v1.1.10 selected friends"
          (let [did (random-uuid)
                response (api.discussion/create-discussion!
                          (assoc (get-ctx user-id)
                                 :params (assoc selected-friends-params-v1-1-10 :did did)))
                discussion (:discussion (parse-response response))]
            (is (= 200 (:status response)))
            (is (= (set (map str #{user-id friend1-id friend3-id}))
                   (set (:members discussion))))
            (is (= "closed" (:member_mode discussion)))))

        (testing "v1.1.11 friends of friends"
          (let [did (random-uuid)
                response (api.discussion/create-discussion!
                          (assoc (get-ctx user-id)
                                 :params (assoc fof-params-v1-1-11 :did did)))
                discussion (:discussion (parse-response response))]
            (is (= 200 (:status response)))
            (is (= "friends_of_friends" (:member_mode discussion)))
            (is (= all-friends (set (:members discussion))))
            (is (some? (:open_until discussion)))))

        (testing "v1.1.11 all friends"
          (let [did (random-uuid)
                response (api.discussion/create-discussion!
                          (assoc (get-ctx user-id)
                                 :params (assoc friends-params-v1-1-11 :did did)))
                discussion (:discussion (parse-response response))]
            (is (= 200 (:status response)))
            (is (= "open" (:member_mode discussion)))
            (is (= all-friends (set (:members discussion))))
            (is (some? (:open_until discussion)))))

        (testing "v1.1.11 selected friends"
          (let [did (random-uuid)
                response (api.discussion/create-discussion!
                          (assoc (get-ctx user-id)
                                 :params (assoc selected-friends-params-v1-1-11 :did did)))
                discussion (:discussion (parse-response response))]
            (is (= 200 (:status response)))
            (is (= (set (map str #{user-id friend1-id friend4-id})) (set (:members discussion))))
            (is (= "closed" (:member_mode discussion)))
            (is (nil? (:open_until discussion)))))))))

