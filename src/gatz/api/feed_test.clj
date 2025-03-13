(ns gatz.api.feed-test
  (:require [clojure.test :refer [deftest testing is]]
            [gatz.api.feed :as feed]
            [gatz.db :as db]
            [gatz.db.feed :as db.feed]
            [gatz.db.contacts :as db.contacts]
            [com.biffweb :as biff]
            [crdt.core :as crdt]
            [xtdb.api :as xt]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [clojure.data.json :as json])
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
                  (let [db (xt/db node)
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
        _ (xt/sync node)

        ;; create new discussions
        _ (doseq [i (range 20)]
            (db/create-discussion-with-message!
             (get-ctx user-id)
             {:to_all_contacts true
              :text (str "Discussion " i)
              :now now}))
        _ (xt/sync node)

        ;; this feed item should show up in the feed because it is within the discussion range
        new-fi-id (random-uuid)
        {:keys [request]} (db.contacts/apply-request!
                           (get-ctx requester-id)
                           {:them user-id
                            :action :contact_request/requested
                            :feed_item_id new-fi-id})
        _ (xt/sync node)


     ;; But these older feed items should not show up in the fed
        cr (assoc request :contact_request/created_at last-year)]

    (testing "we can find the feed item"
      (let [db (xt/db node)
            items (db.feed/for-user-with-ts db user-id)]
        (is (= new-fi-id (first (map :xt/id items))))))

    (dotimes [_i 20]
      (let [fi (db.feed/new-cr-item (random-uuid) cr)]
        (biff/submit-tx (get-ctx user-id) [[:xtdb.api/put (assoc fi :db/doc-type :gatz/feed_item)]])))
    (xt/sync node)

    (testing "we can find all the feed item, depending on the time range"
      (let [db (xt/db node)]
        (is (= 21 (count (db.feed/for-user-with-ts db user-id {:limit 30}))))
        (is (= 20 (count (db.feed/for-user-with-ts db user-id {:older-than-ts now :limit 30}))))
        (is (= 1 (count (db.feed/for-user-with-ts db user-id {:younger-than-ts now :limit 30}))))
        (is (= 0 (count (db.feed/for-user-with-ts db user-id {:older-than-ts last-year
                                                              :limit 30}))))))

    (testing "feed items should only be queried within discussion time range"
      (let [{:keys [body]} (feed/feed (get-ctx user-id))
            {:keys [items discussions]} (json/read-str body :key-fn keyword)]
        (is (= 20 (count discussions)))
        (is (= [(str new-fi-id)] (map :id items)))
        (let [last-did (->> discussions
                            (map :discussion)
                            (sort-by #(:created_at %))
                            (last)
                            :id)
              params {:last_did (str last-did)}
              {:keys [body]} (feed/feed (-> (get-ctx user-id)
                                            (assoc :params params)))
              {:keys [items discussions]} (json/read-str body :key-fn keyword)]
          (is (= 0 (count discussions)))
          (is (= 20 (count items))))))))