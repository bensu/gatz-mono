(ns crdt.core
  (:require [clojure.set :as set]
            [clojure.test :as test :refer [deftest testing is]]
            [malli.core :as malli]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [taoensso.nippy :as nippy]
            [clojure.core :refer [print-method read-string]])
  (:import [java.util Date UUID]
           [clojure.lang IPersistentMap]
           [java.lang Comparable Thread]))

(defprotocol OpCRDT
  (-value [this] "Returns the EDN value without the CRDT tracking")
  (-apply-delta [this -delta] "Applies a delta to the CRDT"))

(defprotocol CRDTDelta
  (-init [this] "Returns the empty type of the CRDT it should be applied to"))

(defrecord MinWins [value]
  CRDTDelta
  (-init [_] (->MinWins nil))
  OpCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (cond
        (nil? delta-value) this
        (nil? value)       (->MinWins delta-value)
        :else (case (compare value delta-value)
                -1 this
                0 this
                1 (->MinWins delta-value)))))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defmethod print-method MinWins
  [^MinWins min-wins ^java.io.Writer writer]
  (.write writer "#crdt/min-wins ")
  (print-method (.value min-wins) writer))

(defn read-min-wins
  "Used by the reader like so:
  
   #crdt/min-wins 1
   #crdt/min-wins \"a\"
   #crdt/min-wins #inst \"2021-06-01\"
   #crdt/min-wins #uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\""
  [value]
  (->MinWins value))

(defn min-wins-instance? [x]
  (instance? MinWins x))

(defn min-wins-schema [value-schema]
  [:map
   [:value value-schema]])

(deftest min-wins
  (testing "can check its schema"
    (is (malli/validate (min-wins-schema string?) #crdt/min-wins "0"))
    (is (not (true? (malli/validate (min-wins-schema integer?) #crdt/min-wins "0")))))
  (testing "empty value is always replaced"
    (let [initial (-init #crdt/min-wins 0)]
      (is (= 1 (-value (-apply-delta initial #crdt/min-wins 1)))))
    (let [initial #crdt/min-wins nil]
      (is (= 1 (-value (-apply-delta initial #crdt/min-wins 1))))))
  (testing "any order yields the same final value with integers"
    (let [values (shuffle (map #(->MinWins %) (range 10)))
          initial (->MinWins 3)
          final (reduce -apply-delta initial values)]
      (is (= 0 (-value final)))))
  (testing "any order yields the same final value with dates"
    (let [instants (take 10 (repeatedly (fn [] (Date.))))
          values  (map ->MinWins (shuffle instants))
          initial (->MinWins (first instants))
          final (reduce -apply-delta initial values)]
      (is (= (-value final) (first instants)))))
  (testing "can be serialized"
    (is (= #crdt/min-wins 0 (nippy/thaw (nippy/freeze #crdt/min-wins 0))))
    (is (= #crdt/min-wins 0 (read-string (pr-str #crdt/min-wins 0))))))

(defrecord MaxWins [value]
  CRDTDelta
  (-init [_] (->MaxWins nil))
  OpCRDT
  (-value [_] value)
  ;; Should the delta be expected to be a MaxWins or could it be the value?
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (cond
        (nil? delta-value) this
        (nil? value)       (->MaxWins delta-value)
        :else (case (compare value delta-value)
                -1 (->MaxWins delta-value)
                0 this
                1 this))))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defmethod print-method MaxWins
  [^MaxWins max-wins ^java.io.Writer writer]
  (.write writer "#crdt/max-wins ")
  (print-method (.value max-wins) writer))

(defn read-max-wins
  "Used by the reader like so:
  
   #crdt/max-wins 1
   #crdt/max-wins \"a\"
   #crdt/max-wins #inst \"2021-06-01\"
   #crdt/max-wins #uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\""
  [value]
  (->MaxWins value))

(defn max-wins-instance? [x]
  (instance? MaxWins x))

(defn max-wins-schema [value-schema]
  [:map
   [:value value-schema]])

(deftest max-wins
  (testing "can check its schema"
    (is (malli/validate (max-wins-schema string?) #crdt/max-wins "0"))
    (is (not (true? (malli/validate (max-wins-schema integer?) #crdt/max-wins "0")))))
  (testing "empty value is always replaced"
    (let [initial (-init #crdt/max-wins 0)]
      (is (= 1 (-value (-apply-delta initial #crdt/max-wins 1)))))
    (let [initial (->MaxWins nil)]
      (is (= 1 (-value (-apply-delta initial #crdt/max-wins 1))))))
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
      (is (= (-value final) (last instants)))))
  (testing "can be serialized"
    (is (= #crdt/max-wins 0 (nippy/thaw (nippy/freeze #crdt/max-wins 0))))
    (is (= #crdt/max-wins 0 (read-string (pr-str #crdt/max-wins 0))))))

(defmacro stagger-compare [ks a b]
  (let [k (first ks)]
    (assert k "Can't compare empty keys")
    `(case (compare (get ~a ~k) (get ~b ~k))
       -1 -1
       1 1
       0 ~(if (empty? (rest ks))
            0
            `(stagger-compare ~(rest ks) ~a ~b)))))

;; Hybrid Logical Clocks
;; https://adamwulf.me/2021/05/distributed-clocks-and-crdts/

(defprotocol IHLC
  (-increment [this now] "Increment the clock")
  (-receive [this that now] "Combine two clocks"))

(defrecord HLC [^Date ts ^Long counter ^UUID node]
  IHLC
  (-increment [_ now]
    (if (< (.getTime ts) (.getTime now))
      (->HLC now 0 node)
      (->HLC ts (inc counter) node)))
  (-receive [_ remote now]
    (if (and (< (.getTime ts) (.getTime now))
             (< (.getTime (:ts remote)) (.getTime now)))
      (->HLC now 0 node)
      (case (compare ts (:ts remote))
        -1 (->HLC (:ts remote) (inc (:counter remote)) node)
        0 (->HLC ts (inc (max counter (:counter remote))) node)
        1 (->HLC ts (inc counter) node))))
  Comparable
  (compareTo [this that]
    (stagger-compare [:ts :counter :node] this that))
  CRDTDelta
  (-init [_] (->HLC ts 0 node))
  OpCRDT ;; as a LWW where the value is itself 
  (-value [this] this)
  (-apply-delta [this delta]
    (case (compare this delta)
      -1 delta 0 this 1 this))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defmethod print-method HLC
  [^HLC hlc ^java.io.Writer writer]
  (.write writer "#crdt/hlc ")
  (print-method [(.ts hlc) (.counter hlc) (.node hlc)] writer))

(defn new-hlc
  ([node] (new-hlc node (Date.)))
  ([node now] (->HLC now 0 node)))

(defn read-hlc
  "Used by the reader like so:
  
   #crdt/hlc [#uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\"]
   #crdt/hlc [1 #uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\"]
   #crdt/hlc [#inst \"2021-06-01\" 1 #uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\"]"
  [value]
  (assert (vector? value) "HLC must be a vector")
  (assert (<= (count value) 3) "HLC must have 0, 1, 2, or 3 elements")
  (case (count value)
    0 (->HLC (Date.) 0 (random-uuid))
    1 (->HLC (Date.) 0 (first value))
    2 (->HLC (Date.) (first value) (second value))
    3 (->HLC (first value) (second value) (nth value 2))))

(defn hlc-instance? [x]
  (instance? HLC x))

(def hlc-schema
  [:map
   [:ts inst?]
   [:counter integer?]
   [:node :uuid]])

(defn inc-time [^Date d]
  (Date. (inc (.getTime d))))

(deftest hlc
  (testing "you can serialize the clocks"
    (let [clock #crdt/hlc [#inst "2024-04-30T06:32:48.978-00:00" 1 #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95"]]
      (is (= clock (nippy/thaw (nippy/freeze clock))))
      (is (= clock (read-string (pr-str clock))))))
  (testing "you can check the schema"
    (is (malli/validate hlc-schema #crdt/hlc [])))
  (testing "You can generate HLCs"
    (let [t0 (Date.)
          aid (random-uuid)
          bid (random-uuid)
          a-init (new-hlc aid t0)
          b-init (new-hlc bid t0)]
      (is (= (compare aid bid)
             (compare a-init b-init))
          "The clocks end up comparing the node id when everything else is the same")

      (let [a2 (-increment a-init t0)
            b2 (-increment b-init t0)]
        (is (= -1 (compare a-init a2)))
        (is (= -1 (compare b-init a2)))
        (is (= -1 (compare a-init b2)))
        (is (= -1 (compare b-init b2)))
        (is (= (compare aid bid) (compare a2 b2))))

      ;; make sure the time is later
      (let [t1 (inc-time t0)
            merged-later (-receive a-init b-init t1)]
        (is (= (->HLC t1 0 aid) merged-later)
            "Local wins when receiving with equal times")
        (is (= -1 (compare a-init merged-later)))
        (is (= -1 (compare b-init merged-later))))

      (testing "Both clients have new events, they are merged later"
        (let [a2 (-increment a-init t0)
              t1 (inc-time t0)
              b2 (-increment b-init t1)
              t2 (inc-time t1)
              merged-later (-receive a2 b2 t2)]
          (is (= (->HLC t2 0 aid) merged-later)
              "timestamp wins over counter")
          (is (= -1 (compare a-init merged-later)))
          (is (= -1 (compare b-init merged-later)))
          (is (= -1 (compare b2 merged-later)))
          (testing "and it works a CRDT"
            (let [deltas [a-init b-init a2 b2 merged-later]
                  final (reduce -apply-delta a-init (shuffle deltas))]
              (is (= merged-later (-value final)))))))

      (testing "Both clients have new events, b is later"
        (let [a2 (-increment a-init t0)
              t1 (inc-time t0)
              b2 (-increment b-init t1)
              merged-later (-receive a2 b2 t1)]
          (is (= (->HLC t0 1 aid) a2))
          (is (= (->HLC t1 0 bid) b2))
          (is (= (->HLC t1 1 aid) merged-later)
              "Need to use counter")
          (is (= -1 (compare a-init merged-later)))
          (is (= -1 (compare b-init merged-later)))
          (is (= -1 (compare b2 merged-later))))))))

(defrecord ClientClock [event-number ts user-id conn-id]
  Comparable
  (compareTo [this that]
    (stagger-compare [:event-number :ts :user-id :conn-id] this that)))

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
                1 this))))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defmethod print-method LWW
  [^LWW lww ^java.io.Writer writer]
  (.write writer "#crdt/lww ")
  (print-method [(.clock lww) (.value lww)] writer))

(defn read-lww
  "Used by the reader like so:

   #crdt/lww [clock value]
  
   #crdt/lww [1 \"a\"]
   #crdt/lww [#inst \"2021-06-01\" nil]
   #crdt/lww [#crdt/hlc [#uuid \"08f711cd-1d4d-4f61-b157-c36a8be8ef95\"] 3]"
  [value]
  (assert (vector? value) "LWW must be a vector")
  (assert (= (count value) 2) "LWW must have 2 elements")
  (->LWW (first value) (second value)))

(defn lww-instance? [x]
  (instance? LWW x))

(defn lww-schema [clock-schema value-schema]
  [:map
   [:clock clock-schema]
   [:value value-schema]])

(deftest lww
  (testing "empty value is always replaced"
    (let [initial (-init #crdt/lww [0 0])]
      (is (= 1 (-value (-apply-delta initial #crdt/lww [1 1]))))))
  (testing "can check the schema"
    (let [schema (lww-schema integer? integer?)]
      (is (malli/validate schema #crdt/lww [0 0]))
      (is (not (malli/validate schema #crdt/lww [0 "0"])))))
  (testing "any order yields the same final value"
    (testing "with integer clocks"
      (let [initial #crdt/lww [0 0]
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
        (is (= (last values) (-value final)))))
    (testing "with ClientClocks"
      (let [uid (random-uuid) cid (random-uuid)
            tick! (let [event-number (atom 0)]
                    (fn []
                      (->ClientClock
                       (swap! event-number inc) (Date.) uid cid)))
            initial (->LWW (tick!) 0)
            clocks (take 9 (repeatedly tick!))
            values (shuffle (range 1 10))
            deltas (map #(->LWW %1 %2) clocks values)
            final (reduce -apply-delta initial (shuffle deltas))]
        (is (= 0 (-value initial)))
        (is (= (last values) (-value final)))
        (testing "which can be serialized"
          (is (every? #(= % (nippy/thaw (nippy/freeze %))) values)))))
    (testing "with nil"
      (let [initial #crdt/lww [0 1]
            delta   #crdt/lww [1 nil]
            final (-apply-delta initial delta)]
        (is (= 1 (-value initial)))
        (is (= nil (-value final)))))
    (testing "can be serialized"
      (is (= #crdt/lww [0 0] (read-string (pr-str #crdt/lww [0 0]))))
      (is (= #crdt/lww [0 0] (nippy/thaw (nippy/freeze #crdt/lww [0 0])))))))

(defrecord GrowOnlySet [xs]
  OpCRDT
  (-value [_] xs)
  (-apply-delta [_ delta]
    (->GrowOnlySet (conj xs (-value delta))))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defn grow-only-set-instance? [x]
  (instance? GrowOnlySet x))

(defn grow-only-set-schema [value-schema]
  [:map
   [:xs [:set value-schema]]])

(deftest grow-only-set
  (testing "can check its schema"
    (let [schema (grow-only-set-schema string?)]
      (is (malli/validate schema (->GrowOnlySet #{"0"})))
      (is (not (true? (malli/validate schema (->GrowOnlySet #{"0" 1})))))))
  (testing "You can only add elements to a grow only set"
    (let [initial (->GrowOnlySet #{})
          deltas (shuffle (range 10))
          final (reduce -apply-delta initial deltas)]
      (is (= #{} (-value initial)))
      (is (= (set (range 10)) (-value final)))))
  (testing "can be serialized"
    (is (= (->GrowOnlySet #{1 2 3})
           (nippy/thaw (nippy/freeze (->GrowOnlySet #{1 2 3})))))))

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
      (->AddRemoveSet after-removes)))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

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
  nil
  (-init [_] nil)
  Object
  (-init [this] this)
  IPersistentMap
  (-init [_] {}))

(extend-protocol OpCRDT
  nil
  (-value [_] nil)
  (-apply-delta [_ delta]
    (-apply-delta (-init delta) delta))
  Object
  (-value [this] this)
  (-apply-delta [this delta]
    (assert false
            (str "Applied a delta to a value that is not a CRDT: " (type this) delta)))
  IPersistentMap
  (-value [this]
    (reduce (fn [m [k v]] (assoc m k (-value v))) {} this))
  (-apply-delta [this delta]
    ;; delta is a {key delta} map
    (reduce (fn [m [k val-delta]]
              (update m k -apply-delta val-delta))
            this
            delta)))

(deftest persistent-map
  (testing "can be serialized"
    (let [init {:a (->MaxWins 0) :b (->LWW 0 0) :c (->GrowOnlySet #{1 2 3})}]
      (is (= init (nippy/thaw (nippy/freeze init))))))
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