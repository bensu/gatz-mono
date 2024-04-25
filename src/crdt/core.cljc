(ns crdt.core
  (:require [clojure.test :as test :refer [deftest testing is are]])
  (:import [java.util Date]
           [clojure.lang IPersistentMap]
           [java.lang Thread]))

(defprotocol DeltaCRDT
  (-value [this] "Returns the EDN value without the CRDT tracking")
  (-apply-delta [this -delta] "Applies a delta to the CRDT"))

(defrecord MaxWins [value]
  DeltaCRDT
  (-value [_] value)
  ;; Should the delta be expected to be a MaxWins or could it be the value?
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

(defrecord LWW [clock value]
  DeltaCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-clock (.clock delta)]
      (case (compare clock delta-clock)
        -1 delta
        0 this ;; TODO: if the clocks are equal, the values should be equal too?
        1 this))))

(deftest lww
  (testing "any order yields the same final value"
    (testing "with integer clocks"
      (let [initial (->LWW 0 0)
            clocks (range 1 10)
            values (shuffle (range 1 10))
            deltas (map #(->LWW %1 %2) clocks values)
            final (reduce -apply-delta initial (shuffle deltas))]
        (is (= 0 (-value initial)))
        (is (= (last values) (-value final)))))
    (testing "with date clocks"
      (let [initial (->LWW (Date.) 0)
            clocks (take 9 (repeatedly #(do (Thread/sleep 1) (Date.))))
            values (shuffle (range 1 10))
            deltas (map #(->LWW %1 %2) clocks values)
            final (reduce -apply-delta initial (shuffle deltas))]
        (is (= 0 (-value initial)))
        (is (= (last values) (-value final)))))))

(defrecord GrowOnlySet [xs]
  DeltaCRDT
  (-value [_] xs)
  (-apply-delta [_ delta]
    (->GrowOnlySet (conj xs (-value delta)))))

(deftest grow-only-set
  (testing "You can only add elements to a grow only set"
    (let [initial (->GrowOnlySet #{})
          deltas (shuffle (range 10))
          final (reduce -apply-delta initial deltas)]
      (is (= #{} (-value initial)))
      (is (= (set (range 10)) (-value final))))))

(extend-protocol DeltaCRDT
  Object
  (-value [this] this)
  (-apply-delta [_ _] (assert false "Applied a delta to a value that is not a CRDT"))
  IPersistentMap
  (-value [this]
    (reduce (fn [m [k v]] (assoc m k (-value v))) {} this))
  (-apply-delta [this delta]
    ;; delta is a {key delta} map
    (reduce (fn [m [k val-delta]]
              (update m k -apply-delta val-delta))
            this delta)))

(deftest persistent-map
  (testing "you can apply deltas to a map"
    (let [initial {:a 1 :b (->MaxWins 0)}
          deltas (shuffle (map (fn [x] {:b (->MaxWins x)}) (range 10)))
          final (reduce -apply-delta initial deltas)]
      (is (= {:a 1 :b 0} (-value initial)))
      (is (= {:a 1 :b 9} (-value final))))))