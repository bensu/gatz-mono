(ns gatz.api.contacts-test
  (:require [clojure.data.json :as json]
            [clojure.test :as test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.api.contacts :as api.contacts]
            [gatz.api.group :as api.group]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

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