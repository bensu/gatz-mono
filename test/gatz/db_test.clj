(ns gatz.db-test
  (:require [clojure.test :as t :refer [deftest is are]]
            [gatz.db :as db]))

(deftest test-valid-username?
  (are [s] (db/valid-username? s)
    "ameesh" "grantslatton" "sebas" "devon" "tara" "lachy"
    "bensu" "_bensu_" "1bensu1" "bensu1" "bensu_1" "bensu-1" "bensu." "bensu_" "bensu-")
  (are [s] (not (db/valid-username? s))
    "s" "bensu " "bensu 1" "1 1" "1" "123"))