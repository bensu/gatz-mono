(ns gatz.api.group-test
  (:require [clojure.test :as test :refer [deftest testing is]]
            [crdt.core :as crdt]
            [gatz.api.group :as api.group]
            [gatz.db.util-test :as db.util-test :refer [is-equal]]
            [gatz.db.group :as db.group]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [xtdb.api :as xtdb]
            [clojure.data.json :as json])
  (:import [java.util Date]))

(deftest params
  (testing "parsing the deltas wors"
    (let [json-delta {:name "Name" :description "des" :avatar "avatar"}]
      (is (= {:group/name "Name" :group/description "des" :group/avatar "avatar"}
             (api.group/parse-delta json-delta)))))
  (testing "we can parse the different params"

    (let [gid (crdt/random-ulid)
          uid (random-uuid)
          now (Date.)]

      (doseq [p (json/read-str
                 (json/write-str
                  [{:id gid
                    :action "update-attrs"
                    :delta {:name "test" :description "test" :avatar "test"}}
                   {:id gid
                    :action "add-member"
                    :delta {:members [uid]}}
                   {:id gid
                    :action "remove-member"
                    :delta {:members [uid]}}
                   {:id  gid
                    :action "add-admin"
                    :delta {:admins [uid]}}
                   {:id (str gid)
                    :action "remove-admin"
                    :delta {:admins [uid]}}
                   {:id gid
                    :action "transfer-ownership"
                    :delta {:owner uid}}])
                 {:key-fn keyword})]
        (let [parsed (api.group/parse-request-params p)]
          (is (malli/validate db.group/Action (-> parsed
                                                  (assoc :group/by_uid uid)
                                                  (assoc-in [:group/delta :group/updated_at] now)))))))))

(deftest basic-flow
  (testing "only members can get the group"
    (let [owner (random-uuid)
          non-member (random-uuid)
          ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (-> ctx
                        (assoc :biff/db (xtdb/db node))
                        (assoc :auth/user-id uid)))]

      (let [ok-resp (api.group/create! (-> (get-ctx owner)
                                           (assoc :params {:name "Test Group"
                                                           :description nil
                                                           :avatar nil})))
            {:keys [group]} (json/read-str (:body ok-resp) {:key-fn keyword})
            gid (crdt/parse-ulid (:id group))]
        (is (= 200 (:status ok-resp)))
        (is (crdt/ulid? gid))
        (let [ok-resp (api.group/get-group (-> (get-ctx owner)
                                               (assoc :params {:id (str gid)})))]
          (is (= 200 (:status ok-resp))))
        (let [err-resp (api.group/get-group (-> (get-ctx non-member)
                                                (assoc :params {:id (str gid)})))]
          (is (= 400 (:status err-resp))))))))