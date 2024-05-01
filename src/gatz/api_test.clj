(ns gatz.api-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.java.io :as io]
            [gatz.api :refer :all]))

(deftest flatten-tx-ops-test
  (testing "we can flatten tx ops so that we process the final operations"
    (let [{:gatz.api-test/keys [delete-fn-tx add-reaction-fn-tx]}
          (read-string (slurp (io/resource "test/expanded_fn_txn.edn")))]
      (let [flat-tx-ops (flatten-tx-ops add-reaction-fn-tx)]
        (is (= 1 (count (:xtdb.api/tx-ops add-reaction-fn-tx))))
        (is (= 3 (count flat-tx-ops)))
        (is (= [:xtdb.api/fn :xtdb.api/put :xtdb.api/put]
               (map first flat-tx-ops)))
        (is (= [nil :message.crdt/add-reaction nil]
               (mapv (comp :message.crdt/action :evt/data last) flat-tx-ops)))
        (is (= [nil :gatz/evt :gatz/message] (mapv (comp :db/type last) flat-tx-ops))))
      (let [flat-tx-ops (flatten-tx-ops delete-fn-tx)]
        (is (= 1 (count (:xtdb.api/tx-ops delete-fn-tx))))
        (is (= 3 (count flat-tx-ops)))
        (is (= [nil :gatz/evt :gatz/message]
               (mapv (comp :db/type last) flat-tx-ops)))
        (is (= [nil :message.crdt/delete nil]
               (mapv (comp :message.crdt/action :evt/data last) flat-tx-ops)))
        (is (= [:xtdb.api/fn :xtdb.api/put :xtdb.api/put]
               (map first flat-tx-ops)))))))

