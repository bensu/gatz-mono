(ns crdt.core
  (:require [clojure.set :as set]
            [clojure.test :as test :refer [deftest testing is are]])
  (:import [java.util Date UUID]
           [clojure.lang IPersistentMap]
           [java.lang Thread]))

(defprotocol OpCRDT
  (-value [this] "Returns the EDN value without the CRDT tracking")
  (-apply-delta [this -delta] "Applies a delta to the CRDT"))

(defprotocol CRDTDelta
  (-init [this] "Returns the empty type of the CRDT it should be applied to"))

(defrecord MaxWins [value]
  CRDTDelta
  (-init [_] (->MaxWins ::empty))
  OpCRDT
  (-value [_] value)
  ;; Should the delta be expected to be a MaxWins or could it be the value?
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (cond
        (= ::empty delta-value) this
        (= ::empty value)       delta
        :else (case (compare value delta-value)
                -1 delta
                0 this
                1 this)))))

(deftest max-wins
  (testing "empty value is always replaced"
    (let [initial (-init (->MaxWins 0))]
      (is (= 1 (-value (-apply-delta initial (->MaxWins 1)))))))
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
  CRDTDelta
  (-init [_] (->LWW ::empty (-init value)))
  OpCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-clock (.clock delta)]
      (cond
        (= ::empty delta-clock) this
        (= ::empty clock)       delta
        :else (case (compare clock delta-clock)
                -1 delta
                0 this ;; TODO: if the clocks are equal, the values should be equal too?
                1 this)))))

(deftest lww
  (testing "empty value is always replaced"
    (let [initial (-init (->LWW 0 0))]
      (is (= 1 (-value (-apply-delta initial (->LWW 1 1)))))))
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
  OpCRDT
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

;; {x {:adds #{unique-ids} :removes #{unique-ids}}
(defrecord AddRemoveSet [xs]
  OpCRDT
  (-value [_]
    (->> xs
         (keep (fn [[x {:keys [adds removes]}]]
                 (when-not (empty? (set/difference adds removes))
                   x)))
         (set)))
  (-apply-delta [_ delta]
    ;; Should be a record
    ;; delta is {:crdt.add-remove-set/add {x unique-id}
    ;;           :crdt.add-remove-set/remove {x unique-id}}
    (let [after-adds (reduce
                      (fn [xs [x unique-id]]
                        (update-in xs [x :adds] (fnil conj #{}) unique-id))
                      xs
                      (:crdt.add-remove-set/add delta))
          after-removes (reduce
                         (fn [xs [x unique-id]]
                           (update-in xs [x :removes] (fnil conj #{}) unique-id))
                         after-adds
                         (:crdt.add-remove-set/remove delta))]
      (->AddRemoveSet after-removes))))

;; This is not super ergonomic! 
;; The API you want knows which id you are removing
(deftest add-remove-set
  (testing "You can add and remove"
    (let [initial (->AddRemoveSet {})
          ;; here causality is important. we only remove what we added
          adds (map (fn [x] [x (UUID/randomUUID)]) (range 10))
          removes (filter (comp even? first) adds)
          adds (map (fn [[x id]]
                      {:crdt.add-remove-set/add {x id}})
                    adds)
          removes  (map (fn [[x id]]
                          {:crdt.add-remove-set/remove {x id}})
                        removes)
          deltas (shuffle (concat adds removes adds removes))
          final (reduce -apply-delta initial deltas)]
      (is (= #{} (-value initial)))
      (is (= (set (remove even? (range 10))) (-value final))))))

(extend-protocol CRDTDelta
  Object
  (-init [this] this)
  IPersistentMap
  (-init [_] {}))

(extend-protocol OpCRDT
  Object
  (-value [this] this)
  (-apply-delta [_ _] (assert false "Applied a delta to a value that is not a CRDT"))
  IPersistentMap
  (-value [this]
    (reduce (fn [m [k v]] (assoc m k (-value v))) {} this))
  (-apply-delta [this delta]
    ;; delta is a {key delta} map
    (reduce (fn [m [k val-delta]]
              (let [empty (-init val-delta)]
                (update m k (fnil -apply-delta empty) val-delta)))
            this delta)))

(deftest persistent-map
  (testing "you can apply deltas to a map"
    (let [initial {:a 1 :b (->MaxWins 0) :c (->LWW 0 0)}
          deltas (shuffle (map (fn [x]
                                 {:b (->MaxWins x) :c (->LWW x x)})
                               (range 10)))
          final (reduce -apply-delta initial deltas)]
      (is (= {:a 1 :b 0 :c 0} (-value initial)))
      (is (= {:a 1 :b 9 :c 9} (-value final)))))
  (testing "you can apply deltas recursively"
    (let [initial {}
          user-ids (range 10)
          adds (map (fn [user-id]
                      {user-id {"heart" (->LWW (Date.) true)
                                "like" (->LWW (Date.) true)}})
                    user-ids)
          removes (map (fn [user-id]
                         {user-id {"like" (->LWW (Date.) false)}})
                       (filter even? user-ids))
          deltas (shuffle (concat adds removes))
          final (reduce -apply-delta initial deltas)]
      (is (= {} (-value initial))
          (= (into {} (map (fn [user-id]
                             [user-id {"heart" true
                                       "like"  (not (even? user-id))}])
                           user-ids))
             (-value final))))))