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
  (testing "can be serialized"
    (is (= #crdt/max-wins 0 (nippy/thaw (nippy/freeze #crdt/max-wins 0))))
    (is (= #crdt/max-wins 0 (read-string (pr-str #crdt/max-wins 0))))))

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
       (reduce crdt/-apply-delta (crdt/->MaxWins (first values)) (shuffle values))))))

(defspec max-wins-order-date-invariant 100
  (prop/for-all
   [values (gen/not-empty (gen/vector gen-date))]
   (=
    (Date. (apply max (map #(.getTime %) values)))
    (crdt/-value
     (reduce crdt/-apply-delta
             (crdt/->MaxWins (first values))
             values))
    (crdt/-value
     (reduce crdt/-apply-delta
             (crdt/->MaxWins (first values))
             (shuffle values))))))

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
                 (shuffle values)))))))

(deftest hlc
  (testing "you can serialize the clocks"
    (let [clock #crdt/hlc [#inst "2024-04-30T06:32:48.978-00:00" 1 #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]]
      (is (= clock (nippy/thaw (nippy/freeze clock))))
      (is (= clock (read-string (pr-str clock))))))
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
            clocks (take 9 (repeatedly #(do (Thread/sleep 1) (Date.))))
            values (shuffle (range 1 10))
            deltas (map #(crdt/->LWW %1 %2) clocks values)
            final (reduce crdt/-apply-delta initial (shuffle deltas))]
        (is (= 0 (crdt/-value initial)))
        (is (= (last values) (crdt/-value final)))))
    (testing "merge is the same as -apply-delta"
      (let [initial (crdt/->LWW (Date.) 0)
            clocks (take 9 (repeatedly #(do (Thread/sleep 1) (Date.))))
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
        (testing "which can be serialized"
          (is (every? #(= % (nippy/thaw (nippy/freeze %))) values)))))
    (testing "with nil"
      (let [initial #crdt/lww [0 1]
            delta   #crdt/lww [1 nil]
            final (crdt/-apply-delta initial delta)]
        (is (= 1 (crdt/-value initial)))
        (is (= nil (crdt/-value final)))))
    (testing "can be serialized"
      (is (= #crdt/lww [0 0] (read-string (pr-str #crdt/lww [0 0]))))
      (is (= #crdt/lww [0 0] (nippy/thaw (nippy/freeze #crdt/lww [0 0])))))))

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
  (testing "can be serialized"
    (is (= #crdt/gos #{1 2 3}
           (read-string (pr-str #crdt/gos #{1 2 3}))))
    (is (= #crdt/gos #{1 2 3}
           (nippy/thaw (nippy/freeze #crdt/gos #{1 2 3}))))))

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

(deftest persistent-map
  (testing "can be serialized"
    (let [init {:a (crdt/->MaxWins 0) :b (crdt/->LWW 0 0) :c (crdt/->GrowOnlySet #{1 2 3})}]
      (is (= init (nippy/thaw (nippy/freeze init))))))
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

