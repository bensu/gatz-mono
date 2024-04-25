(ns crdt.core
  (:require [clojure.test :as test :refer [deftest testing is are]])
  (:import [java.util Date]))

(defprotocol DeltaCRDT
  (-value [this] "Returns the EDN value without the CRDT tracking")
  (-apply-delta [this -delta] "Applies a delta to the CRDT"))

(defrecord MaxWins [value]
  DeltaCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (case (compare value delta-value)
        -1 delta
        0 this
        1 this))))

(deftest max-wins
  (testing "any order yields the same final value with integers"
    (let [values (shuffle (map #(->MaxWins %) (range 10)))
          initial (->MaxWins 0)
          final (reduce -apply-delta initial values)]
      (is (= 9 (-value final)))))
  (testing "any order yields the same final value with dates"
    (let [instants (take 10 (repeatedly (fn [] (Date.))))
          values  (map ->MaxWins (shuffle instants))
          initial (->MaxWins (first instants))
          final (reduce -apply-delta initial values)]
      (is (= (-value final) (last instants))))))