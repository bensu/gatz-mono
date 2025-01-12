(ns crdt.core-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.test.check :as tc]
            [clojure.test.check.generators :as gen]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]
            [malli.core :as malli]
            [crdt.core :as crdt]
            [taoensso.nippy :as nippy])
  (:import [java.util Date]))

;; ======================================================================
;; Exmaple usage of property testing

#_(defspec sort-idempotent-prop 100
    (prop/for-all [v (gen/vector gen/int)]
                  (= (sort v) (sort (sort v)))))


(comment
  ;; run tests directly in the repl
  (tc/quick-check 100 sort-idempotent-prop))

;; ======================================================================
;; Date Generator

(def gen-date
  "Generates random dates between 1970 and 2100"
  (gen/fmap #(Date. %)
            (gen/large-integer* {:min (.getTime #inst "1970-01-01T00:00:00.000-00:00")
                                 :max (.getTime #inst "2100-01-01T00:00:00.000-00:00")})))

;; ======================================================================
;; MinWins

(deftest min-wins-test
  (testing "can check its schema"
    (is (malli/validate (crdt/min-wins-schema string?) #crdt/min-wins "0"))
    (is (not (true? (malli/validate (crdt/min-wins-schema integer?) #crdt/min-wins "0")))))
  (testing "empty value is always replaced"
    (let [initial (crdt/-init #crdt/min-wins 0)]
      (is (= 1 (crdt/-value (crdt/-apply-delta initial #crdt/min-wins 1)))))
    (let [initial #crdt/min-wins nil]
      (is (= 1 (crdt/-value (crdt/-apply-delta initial #crdt/min-wins 1))))))
  (testing "any order yields the same final value with integers"
    (let [values (shuffle (map #(crdt/->MinWins %) (range 10)))
          initial (crdt/->MinWins 3)
          final (reduce crdt/-apply-delta initial values)]
      (is (= 0 (crdt/-value final)))))
  (testing "merge is the same as apply-delta"
    (let [values (shuffle (map #(crdt/->MinWins %) (range 10)))
          initial (crdt/->MinWins 3)
          final (reduce crdt/-merge initial values)]
      (is (= 0 (crdt/-value final)))))
  (testing "any order yields the same final value with dates"
    (let [instants (take 10 (repeatedly (fn [] (Date.))))
          values  (map crdt/->MinWins (shuffle instants))
          initial (crdt/->MinWins (first instants))
          final (reduce crdt/-apply-delta initial values)]
      (is (= (crdt/-value final) (first instants)))))
  (testing "can be serialized"
    (is (= #crdt/min-wins 0 (nippy/thaw (nippy/freeze #crdt/min-wins 0))))
    (is (= #crdt/min-wins 0 (read-string (pr-str #crdt/min-wins 0))))))

;; Test that no matter the order in which we apply deltas, the result is the same

(defspec min-wins-order-invariant 1000
  (prop/for-all
   [values (gen/not-empty (gen/one-of
                           [(gen/vector gen/int)
                            (gen/vector (gen/such-that #(not (Double/isNaN %)) gen/double))
                            (gen/vector gen/ratio)]))]
   (= (apply min values)
      (crdt/-value
       (reduce crdt/-apply-delta (crdt/->MinWins (first values)) values))
      (crdt/-value
       (reduce crdt/-apply-delta (crdt/->MinWins (first values)) (shuffle values))))))


(defspec min-wins-order-date-invariant 100
  (prop/for-all
   [values (gen/not-empty (gen/vector gen-date))]
   (=
    (Date. (apply min (map #(.getTime %) values)))
    (crdt/-value
     (reduce crdt/-apply-delta
             (crdt/->MinWins (first values))
             values))
    (crdt/-value
     (reduce crdt/-apply-delta
             (crdt/->MinWins (first values))
             (shuffle values))))))

(defn compare-uuid [a b]
  (or (< (.getMostSignificantBits a) (.getMostSignificantBits b))
      (and (= (.getMostSignificantBits a) (.getMostSignificantBits b))
           (< (.getLeastSignificantBits a) (.getLeastSignificantBits b)))))

(defspec min-wins-order-uuid-invariant 100
  (prop/for-all
   [values (gen/not-empty (gen/vector gen/uuid))]
   (let [min-uuid (reduce (fn [a b] (if (compare-uuid a b) a b)) values)]
     (= min-uuid
        (crdt/-value
         (reduce crdt/-apply-delta (crdt/->MinWins (first values))
                 values))
        (crdt/-value
         (reduce crdt/-apply-delta (crdt/->MinWins (first values))
                 (shuffle values)))))))
