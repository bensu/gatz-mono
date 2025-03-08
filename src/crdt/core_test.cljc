(ns crdt.core-test
  (:require [clojure.test :refer [deftest testing is]]
            #?(:clj [clojure.test.check :as tc])
            #?(:clj [clojure.test.check.generators :as gen]
               :cljs [clojure.test.check.generators :as gen])
            #?(:clj [clojure.test.check.properties :as prop]
               :cljs [clojure.test.check.properties :as prop])
            #?(:clj [clojure.test.check.clojure-test :refer [defspec]]
               :cljs [clojure.test.check.clojure-test :refer-macros [defspec]])
            [clojure.set :as set]
            [malli.core :as malli]
            [crdt.core :as crdt]
            #?(:clj [taoensso.nippy :as nippy])))

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

#?(:cljs (def Date js/Date))

(def gen-date
  "Generates random dates between 1970 and 2100"
  #?(:clj
     (gen/fmap #(Date. %)
               (gen/large-integer* {:min (.getTime #inst "1970-01-01T00:00:00.000-00:00")
                                    :max (.getTime #inst "2100-01-01T00:00:00.000-00:00")}))
     :cljs
     (gen/fmap #(Date. %)
               (gen/large-integer* {:min (.getTime #inst "1970-01-01T00:00:00.000-00:00")
                                    :max (.getTime #inst "2100-01-01T00:00:00.000-00:00")}))))


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
  #?(:clj
     (testing "can be serialized"
       (is (= #crdt/min-wins 0 (nippy/thaw (nippy/freeze #crdt/min-wins 0))))
       (is (= #crdt/min-wins 0 (read-string (pr-str #crdt/min-wins 0)))))))

;; Test that no matter the order in which we apply deltas, the result is the same

#?(:clj
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
          (reduce crdt/-apply-delta (crdt/->MinWins (first values)) (shuffle values)))))))


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

#?(:clj
   (defn compare-uuid [a b]
     (or (< (.getMostSignificantBits a) (.getMostSignificantBits b))
         (and (= (.getMostSignificantBits a) (.getMostSignificantBits b))
              (< (.getLeastSignificantBits a) (.getLeastSignificantBits b))))))


#?(:clj
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
                    (shuffle values))))))))

;; ======================================================================
;; MaxWins

(deftest max-wins-test
  (testing "can check its schema"
    (is (malli/validate (crdt/max-wins-schema string?) #crdt/max-wins "0"))
    (is (not (true? (malli/validate (crdt/max-wins-schema integer?) #crdt/max-wins "0")))))
  (testing "empty value is always replaced"
    (let [initial (crdt/-init #crdt/max-wins 0)]
      (is (= 1 (crdt/-value (crdt/-apply-delta initial #crdt/max-wins 1)))))
    (let [initial (crdt/->MaxWins nil)]
      (is (= 1 (crdt/-value (crdt/-apply-delta initial #crdt/max-wins 1))))))
  (testing "any order yields the same final value with integers"
    (let [values (shuffle (map #(crdt/->MaxWins %) (range 10)))
          initial (crdt/->MaxWins 0)
          final (reduce crdt/-apply-delta initial values)]
      (is (= 9 (crdt/-value final)))))
  (testing "merge is the same as apply-delta"
    (let [values (shuffle (map #(crdt/->MaxWins %) (range 10)))
          initial (crdt/->MaxWins 0)
          final (reduce crdt/-merge initial values)]
      (is (= 9 (crdt/-value final)))))
  (testing "any order yields the same final value with dates"
    (let [instants (take 10 (repeatedly (fn [] (Date.))))
          values  (map crdt/->MaxWins (shuffle instants))
          initial (crdt/->MaxWins (first instants))
          final (reduce crdt/-apply-delta initial values)]
      (is (= (crdt/-value final) (last instants)))))
  #?(:clj
     (testing "can be serialized"
       (is (= #crdt/max-wins 0 (nippy/thaw (nippy/freeze #crdt/max-wins 0))))
       (is (= #crdt/max-wins 0 (read-string (pr-str #crdt/max-wins 0)))))))

#?(:clj
   (defspec max-wins-order-invariant 1000
     (prop/for-all
      [values (gen/not-empty (gen/one-of
                              [(gen/vector gen/int)
                               (gen/vector (gen/such-that #(not (Double/isNaN %)) gen/double))
                               (gen/vector gen/ratio)]))]
      (= (apply max values)
         (crdt/-value
          (reduce crdt/-apply-delta (crdt/->MaxWins (first values)) values))
         (crdt/-value
          (reduce crdt/-apply-delta (crdt/->MaxWins (first values)) (shuffle values)))))))

(defspec max-wins-order-date-invariant 100
  (prop/for-all
   [values (gen/not-empty (gen/vector gen-date))]
   (= (Date. (apply max (map #(.getTime %) values)))
      (crdt/-value (reduce crdt/-apply-delta
                           (crdt/->MaxWins (first values))
                           values))
      (crdt/-value (reduce crdt/-apply-delta
                           (crdt/->MaxWins (first values))
                           (shuffle values))))))

#?(:clj
   (defspec max-wins-order-uuid-invariant 100
     (prop/for-all
      [values (gen/not-empty (gen/vector gen/uuid))]
      (let [max-uuid (reduce (fn [a b] (if (compare-uuid b a) a b)) values)]
        (= max-uuid
           (crdt/-value
            (reduce crdt/-apply-delta (crdt/->MaxWins (first values))
                    values))
           (crdt/-value
            (reduce crdt/-apply-delta (crdt/->MaxWins (first values))
                    (shuffle values))))))))

(deftest hlc
  #?(:clj
     (testing "you can serialize the clocks"
       (let [clock #crdt/hlc [#inst "2024-04-30T06:32:48.978-00:00" 1 #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]]
         (is (= clock (nippy/thaw (nippy/freeze clock))))
         (is (= clock (read-string (pr-str clock)))))))
  (testing "you can check the schema"
    (is (malli/validate crdt/hlc-schema #crdt/hlc [])))
  (testing "You can generate HLCs"
    (let [t0 (Date.)
          aid (crdt/rand-uuid)
          bid (crdt/rand-uuid)
          a-init (crdt/new-hlc aid t0)
          b-init (crdt/new-hlc bid t0)]
      (is (= (compare aid bid)
             (compare a-init b-init))
          "The clocks end up comparing the node id when everything else is the same")

      (let [a2 (crdt/-increment a-init t0)
            b2 (crdt/-increment b-init t0)]
        (is (= -1 (compare a-init a2)))
        (is (= -1 (compare b-init a2)))
        (is (= -1 (compare a-init b2)))
        (is (= -1 (compare b-init b2)))
        (is (= (compare aid bid) (compare a2 b2))))

      ;; make sure the time is later
      (let [t1 (crdt/inc-time t0)
            merged-later (crdt/-receive a-init b-init t1)]
        (is (= (crdt/->HLC t1 0 aid) merged-later)
            "Local wins when receiving with equal times")
        (is (= -1 (compare a-init merged-later)))
        (is (= -1 (compare b-init merged-later))))

      (testing "Both clients have new events, they are merged later"
        (let [a2 (crdt/-increment a-init t0)
              t1 (crdt/inc-time t0)
              b2 (crdt/-increment b-init t1)
              t2 (crdt/inc-time t1)
              merged-later (crdt/-receive a2 b2 t2)]
          (is (= (crdt/->HLC t2 0 aid) merged-later)
              "timestamp wins over counter")
          (is (= -1 (compare a-init merged-later)))
          (is (= -1 (compare b-init merged-later)))
          (is (= -1 (compare b2 merged-later)))
          (testing "and it works a CRDT"
            (let [deltas [a-init b-init a2 b2 merged-later]
                  final (reduce crdt/-apply-delta a-init (shuffle deltas))]
              (is (= merged-later (crdt/-value final)))))))

      (testing "Both clients have new events, b is later"
        (let [a2 (crdt/-increment a-init t0)
              t1 (crdt/inc-time t0)
              b2 (crdt/-increment b-init t1)
              merged-later (crdt/-receive a2 b2 t1)]
          (is (= (crdt/->HLC t0 1 aid) a2))
          (is (= (crdt/->HLC t1 0 bid) b2))
          (is (= (crdt/->HLC t1 1 aid) merged-later)
              "Need to use counter")
          (is (= -1 (compare a-init merged-later)))
          (is (= -1 (compare b-init merged-later)))
          (is (= -1 (compare b2 merged-later))))))))

(deftest lww-test
  (testing "empty value is always replaced"
    (let [initial (crdt/-init #crdt/lww [0 0])]
      (is (= 1 (crdt/-value (crdt/-apply-delta initial #crdt/lww [1 1]))))))
  (testing "can check the schema"
    (let [schema (crdt/lww-schema integer? integer?)]
      (is (malli/validate schema #crdt/lww [0 0]))
      (is (not (malli/validate schema #crdt/lww [0 "0"])))))
  (testing "any order yields the same final value"
    (testing "with integer clocks"
      (let [initial #crdt/lww [0 0]
            clocks (range 1 10)
            values (shuffle (range 1 10))
            deltas (map #(crdt/->LWW %1 %2) clocks values)
            final (reduce crdt/-apply-delta initial (shuffle deltas))]
        (is (= 0 (crdt/-value initial)))
        (is (= (last values) (crdt/-value final)))))
    (testing "with date clocks"
      (let [initial (crdt/->LWW (Date.) 0)
            clocks (reduce (fn [acc _]
                             (conj acc (crdt/inc-time (last acc))))
                           [(Date.)]
                           (range 8))
            values (shuffle (range 1 10))
            deltas (map #(crdt/->LWW %1 %2) clocks values)
            final (reduce crdt/-apply-delta initial (shuffle deltas))]
        (is (= 0 (crdt/-value initial)))
        (is (= (last values) (crdt/-value final)))))
    (testing "merge is the same as -apply-delta"
      (let [initial (crdt/->LWW (Date.) 0)
            clocks (reduce (fn [acc _]
                             (conj acc (crdt/inc-time (last acc))))
                           [(Date.)]
                           (range 8))
            values (shuffle (range 1 10))
            deltas (map #(crdt/->LWW %1 %2) clocks values)
            final (reduce crdt/-merge initial (shuffle deltas))]
        (is (= 0 (crdt/-value initial)))
        (is (= (last values) (crdt/-value final)))))
    (testing "with ClientClocks"
      (let [uid (crdt/rand-uuid) cid (crdt/rand-uuid)
            tick! (let [event-number (atom 0)]
                    (fn []
                      (crdt/->ClientClock
                       (swap! event-number inc) (Date.) uid cid)))
            initial (crdt/->LWW (tick!) 0)
            clocks (take 9 (repeatedly tick!))
            values (shuffle (range 1 10))
            deltas (map #(crdt/->LWW %1 %2) clocks values)
            final (reduce crdt/-apply-delta initial (shuffle deltas))]
        (is (= 0 (crdt/-value initial)))
        (is (= (last values) (crdt/-value final)))
        #?(:clj
           (testing "which can be serialized"
             (is (every? #(= % (nippy/thaw (nippy/freeze %))) values))))))
    (testing "with nil"
      (let [initial #crdt/lww [0 1]
            delta   #crdt/lww [1 nil]
            final (crdt/-apply-delta initial delta)]
        (is (= 1 (crdt/-value initial)))
        (is (= nil (crdt/-value final)))))
    #?(:clj
       (testing "can be serialized"
         (is (= #crdt/lww [0 0] (read-string (pr-str #crdt/lww [0 0]))))
         (is (= #crdt/lww [0 0] (nippy/thaw (nippy/freeze #crdt/lww [0 0]))))))))

(def gen-client-clock
  (gen/fmap (fn [[event-number ts uid cid]]
              (crdt/->ClientClock event-number ts uid cid))
            (gen/tuple gen/pos-int gen-date gen/uuid gen/uuid)))

(def gen-lww-vector
  "Generates a tuple of [clock value] where clock is either an integer, date, or client clock"
  (gen/one-of
   [(gen/vector (gen/tuple gen/int gen/int)  2 100)
    (gen/vector (gen/tuple gen-date gen/int) 2 100)
    (gen/vector (gen/tuple gen-client-clock gen/int) 2 100)]))

;; TODO: what happens if the clocks are equal?
(defspec lww-order-invariant 1000
  (prop/for-all
   [values gen-lww-vector]
   (let [initial (crdt/->LWW (first (first values)) (second (first values)))
         deltas (map (fn [[clock value]] (crdt/->LWW clock value)) values)
         final1 (reduce crdt/-apply-delta initial deltas)
         final2 (reduce crdt/-apply-delta initial (shuffle deltas))
         [last-clock last-values] (->> values
                                       (group-by first)
                                       (sort-by key)
                                       (last))
         largest-value (last (sort (map second last-values)))]
     (and
      ;; Same result regardless of operation order
      (= (crdt/-value final1) (crdt/-value final2))
      ;; Latest clock's value should win if there is a tie
      (= largest-value (crdt/-value final1))))))

(defspec lww-merge-same-as-apply 100
  (prop/for-all
   [values gen-lww-vector]
   (let [initial (crdt/->LWW (first (first values)) (second (first values)))
         deltas (map (fn [[clock value]] (crdt/->LWW clock value)) values)
         final1 (reduce crdt/-apply-delta initial deltas)
         final2 (reduce crdt/-merge initial deltas)]
     (= (crdt/-value final1) (crdt/-value final2)))))

(defspec lww-nil-value-loses 100
  (prop/for-all
   [values (gen/vector (gen/tuple gen/int gen/int)  2 100)]
   (let [clocks (map first values)
         nil-clock (apply max clocks)
         initial (crdt/->LWW (first (first values)) (second (first values)))
         deltas (conj (map (fn [[clock value]] (crdt/->LWW clock value)) values)
                      (crdt/->LWW nil-clock nil))
         final (reduce crdt/-apply-delta initial deltas)]
     ;; If the nil value has a tie, the final value should not be nil
     (some? (crdt/-value final)))))

(defspec lww-nil-value-wins 100
  (prop/for-all
   [values (gen/vector (gen/tuple gen/int gen/int)  2 100)]
   (let [clocks (map first values)
         nil-clock (inc (apply max clocks))
         initial (crdt/->LWW (first (first values)) (second (first values)))
         deltas (conj (map (fn [[clock value]] (crdt/->LWW clock value)) values)
                      (crdt/->LWW nil-clock nil))
         final (reduce crdt/-apply-delta initial deltas)]
     ;; If the nil value has a tie, the final value should not be nil
     (nil? (crdt/-value final)))))

;; =========================================================
;; GrowOnlySet

(deftest grow-only-set-test
  (testing "can check its schema"
    (let [schema (crdt/grow-only-set-schema string?)]
      (is (malli/validate schema (crdt/->GrowOnlySet #{"0"})))
      (is (not (true? (malli/validate schema (crdt/->GrowOnlySet #{"0" 1})))))))
  (testing "You can only add elements to a grow only set"
    (let [initial (crdt/->GrowOnlySet #{})
          deltas (shuffle (range 10))
          final (reduce crdt/-apply-delta initial deltas)]
      (is (= #{} (crdt/-value initial)))
      (is (= (set (range 10)) (crdt/-value final)))))
  (testing "You can merge them"
    (let [a #crdt/gos #{1 2 3}
          b #crdt/gos #{3 4 5}]
      (is (= #{1 2 3 4 5} (crdt/-value (crdt/-merge a b))))
      (is (= #{1 2 3 4 5} (crdt/-value (crdt/-merge b a))))))
  #?(:clj
     (testing "can be serialized"
       (is (= #crdt/gos #{1 2 3}
              (read-string (pr-str #crdt/gos #{1 2 3}))))
       (is (= #crdt/gos #{1 2 3}
              (nippy/thaw (nippy/freeze #crdt/gos #{1 2 3})))))))

;; Property-based tests for GrowOnlySet

(defspec gos-order-invariant 1000
  (prop/for-all
   [values (gen/not-empty (gen/vector gen/int))]
   (let [initial (crdt/->GrowOnlySet #{})
         final1 (reduce crdt/-apply-delta initial values)
         final2 (reduce crdt/-apply-delta initial (shuffle values))]
     (= (crdt/-value final1) (crdt/-value final2)))))

(defspec gos-merge-commutative 1000
  (prop/for-all
   [xs (gen/set gen/int)
    ys (gen/set gen/int)]
   (let [a (crdt/->GrowOnlySet xs)
         b (crdt/->GrowOnlySet ys)]
     (= (crdt/-value (crdt/-merge a b))
        (crdt/-value (crdt/-merge b a))))))

(defspec gos-merge-associative 1000
  (prop/for-all
   [xs (gen/set gen/int)
    ys (gen/set gen/int)
    zs (gen/set gen/int)]
   (let [a (crdt/->GrowOnlySet xs)
         b (crdt/->GrowOnlySet ys)
         c (crdt/->GrowOnlySet zs)]
     (= (crdt/-value (crdt/-merge a (crdt/-merge b c)))
        (crdt/-value (crdt/-merge (crdt/-merge a b) c))))))

(defspec gos-only-grows 1000
  (prop/for-all
   [values (gen/not-empty (gen/vector gen/int))]
   (let [initial (crdt/->GrowOnlySet #{})
         steps (reductions crdt/-apply-delta initial values)]
     (every? (fn [[s1 s2]]
               (set/subset? (crdt/-value s1)
                            (crdt/-value s2)))
             (partition 2 1 steps)))))

(defspec gos-contains-all-elements 1000
  (prop/for-all
   [values (gen/not-empty (gen/vector gen/int))]
   (let [initial (crdt/->GrowOnlySet #{})
         final (reduce crdt/-apply-delta initial values)]
     (= (crdt/-value final)
        (set values)))))

;; =========================================================
;; LWWSet

(deftest lww-set-test
  (testing "we can check the schema"
    (let [schema (crdt/lww-set-schema string?)
          node (crdt/rand-uuid)]
      (is (malli/validate schema (crdt/lww-set (crdt/new-hlc node) #{"0" "1"})))
      (is (not (true? (malli/validate schema (crdt/lww-set (crdt/new-hlc node) #{"0" 1})))))))
  (testing "You can add and remove"
    (let [node (crdt/rand-uuid)
          t0 (Date.)
          t1 (crdt/inc-time t0)
          c0 (crdt/new-hlc node t0)
          c1 (crdt/new-hlc node t1)
          initial (crdt/lww-set c0 #{})
          adds (map (fn [x]
                      {x (crdt/->LWW c0 true)})
                    (range 10))
          removes (map (fn [x]
                         {x (crdt/->LWW c1 false)})
                       (filter even? (range 10)))
          deltas (shuffle (concat adds removes adds removes))
          final (reduce crdt/-apply-delta initial deltas)]
      (is (= #{} (crdt/-value initial)))
      (is (= (set (remove even? (range 10))) (crdt/-value final)))))
  (testing "You can add and remove"
    (let [node (crdt/rand-uuid)
          t0 (Date.)
          t1 (crdt/inc-time t0)
          c0 (crdt/new-hlc node t0)
          c1 (crdt/new-hlc node t1)
          initial (crdt/lww-set c0 #{})
          adds (map (fn [x]
                      (crdt/->LWWSet {x (crdt/->LWW c0 true)}))
                    (range 10))
          removes (map (fn [x]
                         (crdt/->LWWSet {x (crdt/->LWW c1 false)}))
                       (filter even? (range 10)))
          deltas (shuffle (concat adds removes adds removes))
          final (reduce crdt/-merge initial deltas)]
      (is (= #{} (crdt/-value initial)))
      (is (= (set (remove even? (range 10))) (crdt/-value final))))))

(def gen-lww-set-op
  "Generates a tuple of [timestamp element is-add?] for LWWSet operations"
  (gen/tuple gen-date gen/int gen/boolean))

(defspec lww-set-order-invariant 1000
  (prop/for-all
   [ops (gen/not-empty (gen/vector gen-lww-set-op))]
   (let [node (crdt/rand-uuid)
         initial (crdt/lww-set (crdt/new-hlc node (Date.)) #{})
         deltas (map (fn [[ts x add?]]
                       {x (crdt/->LWW (crdt/new-hlc node ts) add?)})
                     ops)
         final1 (reduce crdt/-apply-delta initial deltas)
         final2 (reduce crdt/-apply-delta initial (shuffle deltas))]
     (= (crdt/-value final1) (crdt/-value final2)))))

(defspec lww-set-merge-commutative 1000
  (prop/for-all
   [ops1 (gen/not-empty (gen/vector gen-lww-set-op))
    ops2 (gen/not-empty (gen/vector gen-lww-set-op))]
   (let [node (crdt/rand-uuid)
         initial (crdt/lww-set (crdt/new-hlc node (Date.)) #{})
         deltas1 (reduce crdt/-apply-delta initial
                         (map (fn [[ts x add?]]
                                {x (crdt/->LWW (crdt/new-hlc node ts) add?)})
                              ops1))
         deltas2 (reduce crdt/-apply-delta initial
                         (map (fn [[ts x add?]]
                                {x (crdt/->LWW (crdt/new-hlc node ts) add?)})
                              ops2))]
     (= (crdt/-value (crdt/-merge deltas1 deltas2))
        (crdt/-value (crdt/-merge deltas2 deltas1))))))

(defspec lww-set-merge-associative 1000
  (prop/for-all
   [ops1 (gen/not-empty (gen/vector gen-lww-set-op))
    ops2 (gen/not-empty (gen/vector gen-lww-set-op))
    ops3 (gen/not-empty (gen/vector gen-lww-set-op))]
   (let [node (crdt/rand-uuid)
         initial (crdt/lww-set (crdt/new-hlc node (Date.)) #{})
         make-deltas (fn [ops]
                       (reduce crdt/-apply-delta initial
                               (map (fn [[ts x add?]]
                                      {x (crdt/->LWW (crdt/new-hlc node ts) add?)})
                                    ops)))
         a (make-deltas ops1)
         b (make-deltas ops2)
         c (make-deltas ops3)]
     (= (crdt/-value (crdt/-merge a (crdt/-merge b c)))
        (crdt/-value (crdt/-merge (crdt/-merge a b) c))))))

(defspec lww-set-latest-wins 1000
  (prop/for-all
   [element gen/int
    ops (gen/not-empty (gen/vector (gen/tuple gen-date gen/boolean)))]
   (let [ts (map first ops)]
     (if (= (count ts) (distinct ts))
       (let [node (crdt/rand-uuid)
             initial (crdt/lww-set (crdt/new-hlc node (Date.)) #{})
             ;; The timestamps can't be equal
             sorted-ops (sort-by first ops)
             latest-op (last sorted-ops)
             deltas (map (fn [[ts add?]]
                           {element (crdt/->LWW (crdt/new-hlc node ts) add?)})
                         ops)
             final (reduce crdt/-apply-delta initial deltas)]
         ;; The element should be in the set if and only if the latest operation was an add
         (= (contains? (crdt/-value final) element)
            (second latest-op)))
       ;; skip the test if the timestamps are not distinct
       true))))

(defspec lww-set-concurrent-ops 1000
  (prop/for-all
   [ops (gen/not-empty (gen/vector gen-lww-set-op 3 50))]
   (let [ts (map first ops)]
     (if (= (count ts) (distinct ts))
       (let [node1 (crdt/rand-uuid)
             node2 (crdt/rand-uuid)
             initial1 (crdt/lww-set (crdt/new-hlc node1 (Date.)) #{})
             initial2 (crdt/lww-set (crdt/new-hlc node2 (Date.)) #{})
             ;; Split operations between two replicas
             [ops1 ops2] (split-at (quot (count ops) 2) ops)
             deltas1 (map (fn [[ts x add?]]
                            {x (crdt/->LWW (crdt/new-hlc node1 ts) add?)})
                          ops1)
             deltas2 (map (fn [[ts x add?]]
                            {x (crdt/->LWW (crdt/new-hlc node2 ts) add?)})
                          ops2)
             final1 (reduce crdt/-apply-delta initial1 deltas1)
             final2 (reduce crdt/-apply-delta initial2 deltas2)
             merged (crdt/-merge final1 final2)]
          ;; The merged set should contain an element if its latest operation in either replica was an add
         (let [by-element (group-by second ops)
               latest-by-element (into {}
                                       (map (fn [[k v]]
                                              [k (last (sort-by first v))])
                                            by-element))]
           (every? (fn [[element [ts add? :as op]]]
                     (= (contains? (crdt/-value merged) element)
                        add?))
                   latest-by-element)))
       ;; skip the test if the timestamps are not distinct
       true))))

;; =========================================================
;; PersistentMap of CRDT leaves

(deftest persistent-map
  #?(:clj
     (testing "can be serialized"
       (let [init {:a (crdt/->MaxWins 0) :b (crdt/->LWW 0 0) :c (crdt/->GrowOnlySet #{1 2 3})}]
         (is (= init (nippy/thaw (nippy/freeze init)))))))
  (testing "you can apply deltas to a map"
    (let [initial {:a 1 :b (crdt/->MaxWins 0) :c (crdt/->LWW 0 0)}
          deltas (shuffle (map (fn [x]
                                 {:b (crdt/->MaxWins x) :c (crdt/->LWW x x)})
                               (range 10)))
          final (reduce crdt/-apply-delta initial deltas)]
      (is (= {:a 1 :b 0 :c 0} (crdt/-value initial)))
      (is (= {:a 1 :b 9 :c 9} (crdt/-value final)))))
  (testing "you can merge maps"
    (let [initial {:a 1 :b (crdt/->MaxWins 0) :c (crdt/->LWW 0 0)}
          deltas (shuffle (map (fn [x]
                                 {:b (crdt/->MaxWins x) :c (crdt/->LWW x x)})
                               (range 10)))
          final (reduce crdt/-merge initial deltas)]
      (is (= {:a 1 :b 0 :c 0} (crdt/-value initial)))
      (is (= {:a 1 :b 9 :c 9} (crdt/-value final)))))
  (testing "you can apply deltas recursively"
    (let [initial {}
          user-ids (range 10)
          adds (map (fn [user-id]
                      {user-id {"heart" (crdt/->LWW (Date.) true)
                                "like" (crdt/->LWW (Date.) true)}})
                    user-ids)
          removes (map (fn [user-id]
                         {user-id {"like" (crdt/->LWW (Date.) false)}})
                       (filter even? user-ids))
          deltas (shuffle (concat adds removes))
          final (reduce crdt/-apply-delta initial deltas)]
      (is (= {} (crdt/-value initial))
          (= (into {} (map (fn [user-id]
                             [user-id {"heart" true
                                       "like"  (not (even? user-id))}])
                           user-ids))
             (crdt/-value final)))))
  (testing "you can apply from the right side"
    (let [initial {}
          deltas [{1 (crdt/gos #{1 2 3})}]
          final (reduce crdt/-apply-delta initial deltas)]
      (is {1 #{1 2 3}}
          (crdt/-value final))))
  (testing "you can merge recursively"
    (let [initial {}
          user-ids (range 10)
          adds (map (fn [user-id]
                      {user-id {"heart" (crdt/->LWW (Date.) true)
                                "like" (crdt/->LWW (Date.) true)}})
                    user-ids)
          removes (map (fn [user-id]
                         {user-id {"like" (crdt/->LWW (Date.) false)}})
                       (filter even? user-ids))
          deltas (shuffle (concat adds removes))
          final (reduce crdt/-merge initial deltas)]
      (is (= {} (crdt/-value initial))
          (= (into {} (map (fn [user-id]
                             [user-id {"heart" true
                                       "like"  (not (even? user-id))}])
                           user-ids))
             (crdt/-value final))))))

;; Property-based tests for PersistentMap

(def gen-nested-map
  (gen/fmap
   (fn [[max-wins lww gos-vec]]
     {:max-wins max-wins
      :lww lww
      :gos-vec gos-vec
      :nested {:max-wins max-wins
               :lww lww
               :gos-vec gos-vec}})
   (gen/tuple
    (gen/fmap crdt/->MaxWins gen/int)
    (gen/fmap (fn [[clock val]] (crdt/->LWW clock val)) (gen/tuple gen/int gen/int))
    (gen/fmap #(crdt/->GrowOnlySet (set %)) (gen/vector gen/int)))))

(defspec persistent-map-order-invariant 1000
  (prop/for-all
   [initial gen-nested-map
    deltas (gen/vector gen-nested-map)]
   (let [final1 (reduce crdt/-apply-delta initial deltas)
         final2 (reduce crdt/-apply-delta initial (shuffle deltas))]
     (= (crdt/-value final1) (crdt/-value final2)))))

(defspec persistent-map-merge-commutative 1000
  (prop/for-all
   [m1 gen-nested-map
    m2 gen-nested-map]
   (= (crdt/-value (crdt/-merge m1 m2))
      (crdt/-value (crdt/-merge m2 m1)))))

(defspec persistent-map-merge-associative 1000
  (prop/for-all
   [m1 gen-nested-map
    m2 gen-nested-map
    m3 gen-nested-map]
   (= (crdt/-value (crdt/-merge m1 (crdt/-merge m2 m3)))
      (crdt/-value (crdt/-merge (crdt/-merge m1 m2) m3)))))

(defspec persistent-map-nested-crdt-behavior 1000
  (prop/for-all
   [m1 gen-nested-map
    m2 gen-nested-map]
   (let [merged (crdt/-merge m1 m2)]
     (every? (fn [[k v]]
               (cond
                 ;; For MaxWins, merged value should be max of both maps
                 (crdt/max-wins-instance? v)
                 (let [v1 (get m1 k)
                       v2 (get m2 k)]
                   (= (crdt/-value v)
                      (if (and v1 v2)
                        (max (crdt/-value v1) (crdt/-value v2))
                        (or (some-> v1 crdt/-value)
                            (some-> v2 crdt/-value)))))

                 ;; For GrowOnlySet, merged value should contain all elements
                 (crdt/grow-only-set-instance? v)
                 (let [v1 (get m1 k)
                       v2 (get m2 k)]
                   (= (crdt/-value v)
                      (set/union (or (some-> v1 crdt/-value) #{})
                                 (or (some-> v2 crdt/-value) #{}))))

                 ;; For nested maps, recursively check
                 (map? v)
                 (let [v1 (get m1 k)
                       v2 (get m2 k)]
                   (= (crdt/-value v)
                      (crdt/-value (crdt/-merge (or v1 {}) (or v2 {})))))

                 :else true))
             merged))))

;; =========================================================
;; LWWMap

(deftest lww-map
  (testing "empty maps are left untouched"
    (is (= {} (crdt/-value (crdt/->lww-map {} 0)))))
  (testing "Can turn a map to lww"
    (let [m {:a "a" :b "b"}
          lww-m (crdt/->lww-map m 0)]
      (is (= m (crdt/-value lww-m)))
      (is (= {:a #crdt/lww [0 "a"]
              :b #crdt/lww [0 "b"]}
             lww-m)))
    (testing "recursively"
      (let [m {:a "a" :b "b" :c {:c1 "c1" :c2 {:c3 "c3"}}}
            lww-m (crdt/->lww-map m 0)]
        (is (= m (crdt/-value lww-m)))
        (is (= {:a #crdt/lww [0 "a"]
                :b #crdt/lww [0 "b"]
                :c {:c1 #crdt/lww [0 "c1"]
                    :c2 {:c3 #crdt/lww [0 "c3"]}}}
               lww-m))))))

;; Property-based tests for LWWMap

(def gen-nested-lww-map
  (gen/fmap
   (fn [[a b c]]
     {:a a :b b :c c
      :nested {:a a :b b :c c}})
   (gen/tuple
    (gen/fmap (fn [[clock value]] (crdt/->LWW clock value)) (gen/tuple gen/int gen/int))
    (gen/fmap (fn [[clock value]] (crdt/->LWW clock value)) (gen/tuple gen/int gen/int))
    (gen/fmap (fn [[clock value]] (crdt/->LWW clock value)) (gen/tuple gen/int gen/int)))))

(def gen-nested-map-vals
  (gen/fmap
   (fn [[a b c]]
     {:a a :b b :c c
      :nested {:a a :b b :c c}})
   (gen/tuple gen/int gen/int gen/int)))

(defspec lww-map-preserves-values 1000
  (prop/for-all
   [m gen-nested-map-vals
    clock gen/pos-int]
   (= m (crdt/-value (crdt/->lww-map m clock)))))

(defn lww-map? [v]
  (or (crdt/lww-instance? v)
      (and (map? v)
           (every? lww-map? (vals v)))))

(defspec lww-map-recursive-conversion 100
  (prop/for-all
   [m gen-nested-map-vals
    clock gen/pos-int]
   (let [lww-m (crdt/->lww-map m clock)]
     (lww-map? lww-m))))

(defspec lww-map-timestamp-order 1000
  (prop/for-all
   [m gen-nested-lww-map
    clocks (gen/vector gen/pos-int 2)]
   (let [earlier (apply min clocks)
         later (apply max clocks)
         earlier-map (crdt/->lww-map m earlier)
         later-map (crdt/->lww-map m later)]
     (every? (fn [[k v]]
               (cond
                 (crdt/lww-instance? v)
                 (let [earlier-lww (get earlier-map k)
                       later-lww (get later-map k)]
                   (= 1 (compare later-lww earlier-lww)))

                 (map? v)
                 (every? #(or (not (crdt/lww-instance? %))
                              (= 1 (compare (get-in later-map [k (key %)])
                                            (get-in earlier-map [k (key %)]))))
                         v)

                 :else true))
             later-map))))

(defspec lww-map-merge-latest-wins 1000
  (prop/for-all
   [m gen-nested-lww-map
    clocks (gen/vector gen/pos-int 3)]
   (let [maps (map (partial crdt/->lww-map m) clocks)
         merged (reduce crdt/-merge maps)]
     ;; The values in the merged map should come from the map with the latest timestamp
     (let [latest-ts (apply max clocks)
           latest-map (crdt/->lww-map m latest-ts)]
       (= (crdt/-value merged) (crdt/-value latest-map))))))

(defspec lww-map-partial-updates 1000
  (prop/for-all
   [base-map gen-nested-map-vals
    update-key (gen/elements #{:a :b :c})
    update-value gen/int
    clocks (gen/vector gen/pos-int 2)]
   (let [[earlier later] (sort clocks)]
     (if (= earlier later)
       true
       (let [base-lww (crdt/->lww-map base-map earlier)
             update-lww (crdt/->lww-map {update-key update-value} later)
             merged (crdt/-merge base-lww update-lww)]
         ;; The merged map should have all values from base-map except for update-key,
         ;; which should have the later value
         (= (assoc base-map update-key update-value)
            (crdt/-value merged)))))))

(defspec lww-map-nested-updates 1000
  (prop/for-all
   [base-map gen-nested-map-vals
    update-key (gen/elements #{:a :b :c})
    update-value gen/int
    clocks (gen/vector gen/pos-int 2)]
   (let [[earlier later] (sort clocks)]
     (if (= earlier later)
       true
       (let [earlier (apply min clocks)
             later (apply max clocks)
             update-path [:nested update-key]
             base-lww (crdt/->lww-map base-map earlier)
             ;; Create a nested update map following the path
             update-map {:nested {update-key update-value}}
             update-lww (crdt/->lww-map update-map later)
             merged (crdt/-merge base-lww update-lww)]
         ;; The value at the update path should be the new value with the later timestamp
         (= (assoc-in base-map update-path update-value)
            (crdt/-value merged)))))))

