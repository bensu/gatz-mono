(ns crdt.core
  {:clojure.tools.namespace.repl/load false}
  (:require [clojure.core :refer [print-method read-string format]]
            [clojure.set :as set]
            [crdt.ulid :as ulid]
            [malli.core :as malli]
            [medley.core :refer [map-vals]]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [taoensso.nippy :as nippy])
  (:import [java.util Date UUID]
           [clojure.lang IPersistentMap]
           [java.lang Comparable Thread]))

(defn random-ulid [] (ulid/random))
(defn rand-uuid [] (ulid/rand-uuid))
(defn ulid? [x] (ulid/ulid? x))
(defn parse-ulid [x] (ulid/maybe-parse x))

(defprotocol StateCRDT
  (-merge [this that]))

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
  StateCRDT
  (-merge [this that]
    (-apply-delta this that))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defn min-wins [value]
  (if (instance? MinWins value) value (->MinWins value)))

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
  StateCRDT
  (-merge [this that]
    (-apply-delta this that))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defn max-wins [value]
  (if (instance? MaxWins value) value (->MaxWins value)))

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
  ;; TODO: shouldn't this move things forward by using
  ;; either -increment or -receive?
  (-apply-delta [this delta]
    (case (compare this delta)
      -1 delta 0 this 1 this))
  StateCRDT
  (-merge [this that]
    (-apply-delta this that))
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
  (assert (<= (count value) 3)
          "HLC must have 0, 1, 2, or 3 elements")
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
  StateCRDT
  (-merge [this that]
    (-apply-delta this that))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defn lww [clock value]
  (if (instance? LWW value) value (->LWW clock value)))

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

(defn lww-schema
  ([value-schema] (lww-schema hlc-schema value-schema))
  ([clock-schema value-schema]
   [:map
    [:clock clock-schema]
    [:value value-schema]]))

(declare grow-only-set-instance?)

(defrecord GrowOnlySet [xs]
  CRDTDelta
  (-init [_]
    (->GrowOnlySet #{}))
  OpCRDT
  (-value [_] xs)
  (-apply-delta [_ delta]
     ;; TODO: can you pass a set to a GOS and have it be merged in?
    (cond
      (grow-only-set-instance? delta) (->GrowOnlySet (set/union xs (-value delta)))
      :else (->GrowOnlySet (conj xs (-value delta)))))
  StateCRDT
  (-merge [this that]
    (->GrowOnlySet (set/union (:xs this) (:xs that))))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defmethod print-method GrowOnlySet
  [^GrowOnlySet gos ^java.io.Writer writer]
  (.write writer "#crdt/gos ")
  (print-method (.xs gos) writer))

(defn read-gos
  "Used by the reader like so:

   #crdt/gos #{1 2 3}"
  [xs]
  (assert (set? xs) "GrowOnlySet must be a set")
  (->GrowOnlySet xs))

(defn grow-only-set-instance? [x]
  (instance? GrowOnlySet x))

(defn grow-only-set-schema [value-schema]
  [:map
   [:xs [:set value-schema]]])

(defn gos [xs]
  (->GrowOnlySet (set xs)))

;; This needs to be wrapped so that it behaves like a set
;; when you ask for its value
;; {x #crdt/lww #crdt/clock boolean?}
(defrecord LWWSet [xs]
  OpCRDT
  (-value [_]
    (->> xs
         (filter (fn [[x lww]]
                   (-value lww)))
         (map key)
         set))
  (-apply-delta [_ delta]
    {:pre [(map? delta)
           (every? lww-instance? (vals delta))]}
    ;; delta is {x #crdt/lww #crdt/hlc boolean?}
    (->LWWSet
     (reduce (fn [acc [x lww]]
               (update acc x -apply-delta lww))
             xs
             delta)))
  StateCRDT
  (-merge [this that]
    (-apply-delta this (:xs that)))
  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this)))

(defn lww-set
  ([] (lww-set nil #{}))
  ([clock xs]
  ;; {:pre [(or (nil? xs) (set? xs))]}
   (if (instance? LWWSet xs)
     xs
     (let [inner (into {} (map (fn [x] [x (->LWW clock true)]) (or xs #{})))]
       (->LWWSet inner)))))

(defn lww-set-delta
  ([clock s]
   (lww-set-delta clock s true))
  ([clock s in?]
   {:pre [(or (map? s) (set? s)) (boolean? in?)]}
   (if (set? s)
     (into {} (map (fn [x] [x (lww clock in?)]) s))
     (if (map? s)
       s ;; TODO: assert the values are LWWs with the expected shape
       (assert false "Only sets or maps are allowed")))))

(defn lww-set-schema
  ([value-schema] (lww-set-schema hlc-schema value-schema))
  ([clock-schema value-schema]
   [:map
    [:xs [:map-of value-schema (lww-schema clock-schema boolean?)]]]))

(defn lww-set-delta-schema
  ([value-schema] (lww-set-delta-schema hlc-schema value-schema))
  ([clock-schema value-schema]
   [:map-of value-schema (lww-schema clock-schema boolean?)]))

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
    (assert false (format "Applied a delta to a value that is not a CRDT: %s \n %s"
                          (type this) (pr-str delta))))
  IPersistentMap
  (-value [this]
    (reduce (fn [m [k v]] (assoc m k (-value v))) {} this))
  (-apply-delta [this delta]
    ;; delta is a {key delta} map
    (reduce (fn [m [k val-delta]]
              (update m k -apply-delta val-delta))
            this
            delta)))

(extend-protocol StateCRDT
  IPersistentMap
  (-merge [this that]
    (merge-with -merge this that)))

(defn clock? [x]
  (instance? Comparable x))

(defn ->lww-map
  "Recursively walks the map turning all its leaf nodes to LWW"
  [m clock]
  {:pre [(map? m) (clock? clock)] :post [(map? %)]}
  (map-vals (fn [v]
              (if (map? v)
                (->lww-map v clock)
                (->LWW clock v)))
            m))
