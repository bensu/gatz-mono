(ns crdt.gen-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.test.check :as tc]
            [clojure.test.check.generators :as gen]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]
            [clojure.set :as set]
            [crdt.core :as crdt])
  (:import [java.util Date UUID]))

(defn now [] (Date.))

(def gen-date
  "Generates random dates between 1970 and 2100"
  (gen/fmap #(Date. %)
            (gen/large-integer* {:min (.getTime #inst "1970-01-01T00:00:00.000-00:00")
                                 :max (.getTime #inst "2100-01-01T00:00:00.000-00:00")})))

(defn compare-uuid [^UUID a ^UUID b]
  (or (< (.getMostSignificantBits a) (.getMostSignificantBits b))
      (and (= (.getMostSignificantBits a) (.getMostSignificantBits b))
           (< (.getLeastSignificantBits a) (.getLeastSignificantBits b)))))

;; ======================================================================
;; Exmaple usage of property testing

#_(defspec sort-idempotent-prop 100
    (prop/for-all [v (gen/vector gen/int)]
                  (= (sort v) (sort (sort v)))))


(comment
  ;; run tests directly in the repl
  (tc/quick-check 100 sort-idempotent-prop))

;; ======================================================================
;; Property-based tests for MinWins

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



;; ============================================================
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


;; ============================================================
;; Property-based tests for LWWSet

(def gen-lww-set-op
  "Generates a tuple of [timestamp element is-add?] for LWWSet operations"
  (gen/tuple gen-date gen/int gen/boolean))

(defspec lww-set-order-invariant 1000
  (prop/for-all
   [ops (gen/not-empty (gen/vector gen-lww-set-op))]
   (let [node (crdt/rand-uuid)
         initial (crdt/lww-set (crdt/new-hlc node (now)) #{})
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
         initial (crdt/lww-set (crdt/new-hlc node (now)) #{})
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
         initial (crdt/lww-set (crdt/new-hlc node (now)) #{})
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
             initial (crdt/lww-set (crdt/new-hlc node (now)) #{})
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
             initial1 (crdt/lww-set (crdt/new-hlc node1 (now)) #{})
             initial2 (crdt/lww-set (crdt/new-hlc node2 (now)) #{})
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


;; ============================================================
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


;; ============================================================
;; Property-based tests for LWWMap

(defn lww-map? [v]
  (or (crdt/lww-instance? v)
      (and (map? v)
           (every? lww-map? (vals v)))))



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



;; ======================================================================
;; Property-based tests for MaxWins

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
   (= (Date. (apply max (map #(.getTime %) values)))
      (crdt/-value (reduce crdt/-apply-delta
                           (crdt/->MaxWins (first values))
                           values))
      (crdt/-value (reduce crdt/-apply-delta
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


;; ======================================================================
;; Property-based tests for LWW

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
