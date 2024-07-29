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
          final-il (db.invite-link/by-id (xtdb/db node) id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
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
          final-il (db.invite-link/by-id (xtdb/db node) id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
      (is (= expected-il final-il)))))
