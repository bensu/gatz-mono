(ns gatz.db.invite-link-test
  (:require [gatz.db.invite-link :as db.invite-link]
            [gatz.db.util-test :as db.util-test]
            [crdt.core :as crdt]
            [clojure.test :as t :refer [deftest testing is]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest roundtrip
  (testing "we can make an invite"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn []
                    (assoc ctx :biff/db (xtdb/db node)))
          uid (random-uuid)
          invitee (random-uuid)
          il (db.invite-link/create! ctx
                                     {:type :invite_link/contact
                                      :uid uid})
          id (:xt/id il)
          now (:invite_link/created_at il)
          later (Date.)
          _ (xtdb/sync node)
          _ (db.invite-link/mark-used! (get-ctx) id {:by-uid invitee
                                                     :now later})
          _ (xtdb/sync node)
          db (xtdb/db node)
          final-il (db.invite-link/by-id (xtdb/db node) id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
      (is (= final-il (db.invite-link/by-code db (:invite_link/code il))))
      (is (= expected-il final-il)))))


(deftest roundtrip-crew
  (testing "we can make an invite"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn []
                    (assoc ctx :biff/db (xtdb/db node)))
          uid (random-uuid)
          invitee (random-uuid)
          gid (crdt/random-ulid)
          il (db.invite-link/create! ctx
                                     {:type :invite_link/crew
                                      :gid gid
                                      :uid uid})
          id (:xt/id il)
          now (:invite_link/created_at il)
          later (Date.)
          _ (xtdb/sync node)
          _ (db.invite-link/mark-used! (get-ctx) id {:by-uid invitee
                                                     :now later})
          _ (xtdb/sync node)
          db (xtdb/db node)
          final-il (db.invite-link/by-id db id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
      (is (= final-il (db.invite-link/by-code db (:invite_link/code il))))
      (is (= expected-il final-il)))))

(deftest unique-codes
  (testing "invite links must have unique codes"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          uid (random-uuid)
          il1 (with-redefs [db.invite-link/random-code (constantly "ABCDEF")]
                (db.invite-link/create! ctx
                                        {:type :invite_link/contact
                                         :uid uid}))]
      (xtdb/sync node)
      (testing
       "First invite link should be created successfully"
        (is (some? (:xt/id il1)))
        (is (= "ABCDEF" (:invite_link/code il1))))

      (testing "teh second attempt with the same code fails"
        (is (thrown? Exception
                     (with-redefs [db.invite-link/random-code (constantly "ABCDEF")]
                       (db.invite-link/create! ctx
                                               {:type :invite_link/contact
                                                :uid uid}))))))))

(deftest expiration
  (testing "invite links can expire"
    (let [ctx (db.util-test/test-system)
          uid (random-uuid)
          now (Date.)
          il (binding [db.invite-link/*test-current-ts* now]
               (db.invite-link/create! ctx
                                       {:type :invite_link/contact
                                        :uid uid
                                        :now now}))
          ;; one day after expiration
          future-date (Date. (+ (.getTime now)
                                (.toMillis db.invite-link/default-open-duration)
                                (* 24 60 60 1000)))]
      (is (not (db.invite-link/expired? il {:now now}))
          "Invite link should not be expired when first created")

      (binding [db.invite-link/*test-current-ts* future-date]
        (is (db.invite-link/expired? il {:now future-date})
            "Invite link should be expired after the expiration date")))))
