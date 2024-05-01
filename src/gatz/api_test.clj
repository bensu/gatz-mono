(ns gatz.api-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.java.io :as io]
            [gatz.api :refer :all]))

(deftest flatten-tx-ops-test
  (testing "we can flatten tx ops so that we process the final operations"
    (let [nested-tx-ops (read-string (slurp (io/resource "test/expanded_fn_txn.edn")))
          flat-tx-ops (flatten-tx-ops nested-tx-ops)]
      (is (= 1 (count (:xtdb.api/tx-ops nested-tx-ops))))
      (is (= 3 (count flat-tx-ops)))
      (is (= [:xtdb.api/fn :xtdb.api/put :xtdb.api/put]
             (map first flat-tx-ops))))))

