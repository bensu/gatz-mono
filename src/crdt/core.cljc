(ns crdt.core
  {:clojure.tools.namespace.repl/load false}
  (:require [clojure.set :as set]
            #?(:clj [crdt.ulid :as ulid])
            ;; [malli.core :as malli]
            [medley.core :refer [map-vals]]
            #?(:clj [taoensso.nippy :as nippy])
            #?(:clj [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]))
  #?(:cljs (:require-macros [crdt.core :refer [stagger-compare]]))
  #?(:clj (:import [java.util Date UUID]
                   [clojure.lang IPersistentMap]
                   [java.lang Comparable])))

(defn now []
  #?(:clj (Date.)
     :cljs (js/Date.)))

(defn comparable? [x]
  #?(:clj (instance? Comparable x)
     :cljs (or (instance? IComparable x) (number? x))))

#?(:cljs
   (extend-type js/Date
     IComparable
     (-compare [this other]
       (if (instance? js/Date other)
         (compare (.getTime this) (.getTime other))
         (throw (js/Error. "Cannot compare Date with non-Date"))))))

#?(:cljs
   (extend-type string
     IComparable
     (-compare [this other]
       (if (string? other)
         (.localeCompare this other)
         (throw (js/Error. "Cannot compare string with non-string"))))))

#?(:clj (defn random-ulid [] (ulid/random)))

(defn rand-uuid []
  #?(:clj  (ulid/rand-uuid)
     :cljs (random-uuid)))

#?(:clj (defn ulid? [x] (ulid/ulid? x)))
#?(:clj (defn parse-ulid [x] (ulid/maybe-parse x)))

(defprotocol StateCRDT
  (-merge [this that]))

(defprotocol OpCRDT
  (-value [this] "Returns the EDN value without the CRDT tracking")
  (-apply-delta [this -delta] "Applies a delta to the CRDT"))

(defprotocol CRDTDelta
  (-init [this] "Returns the empty type of the CRDT it should be applied to"))

(defrecord MinWins [value]
  CRDTDelta
  (-init [_] (MinWins. nil))
  OpCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (cond
        (nil? delta-value) this
        (nil? value)       (MinWins. delta-value)
        :else (case (compare value delta-value)
                -1 this
                0 this
                1 (MinWins. delta-value)))))
  StateCRDT
  (-merge [this that]
    (-apply-delta this that)))

#?(:clj
   (extend-type MinWins
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

(defn min-wins [value]
  (if (instance? MinWins value) value (->MinWins value)))

#?(:clj
   (defmethod print-method MinWins
     [^MinWins min-wins ^java.io.Writer writer]
     (.write writer "#crdt/min-wins ")
     (print-method (.value min-wins) writer)))

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
  (-init [_] (MaxWins. nil))
  OpCRDT
  (-value [_] value)
  (-apply-delta [this delta]
    (let [delta-value (-value delta)]
      (cond
        (nil? delta-value) this
        (nil? value)       (MaxWins. delta-value)
        :else (case (compare value delta-value)
                -1 (MaxWins. delta-value)
                0 this
                1 this))))
  StateCRDT
  (-merge [this that]
    (-apply-delta this that)))

#?(:clj
   (extend-type MaxWins
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

(defn max-wins [value]
  (if (instance? MaxWins value) value (->MaxWins value)))

#?(:clj
   (defmethod print-method MaxWins
     [^MaxWins max-wins ^java.io.Writer writer]
     (.write writer "#crdt/max-wins ")
     (print-method (.value max-wins) writer)))

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

#?(:clj
   (defmacro stagger-compare [ks a b]
     (let [k (first ks)]
       (assert k "Can't compare empty keys")
       `(case (compare (get ~a ~k) (get ~b ~k))
          -1 -1
          1 1
          0 ~(if (empty? (rest ks))
               0
               `(stagger-compare ~(rest ks) ~a ~b))))))

;; Hybrid Logical Clocks
;; https://adamwulf.me/2021/05/distributed-clocks-and-crdts/

(defprotocol IHLC
  (-increment [this now] "Increment the clock")
  (-receive [this that now] "Combine two clocks"))

(defrecord HLC [#?(:clj ^Date ts :cljs ^js/Date ts)
                #?(:clj ^Long counter :cljs ^number counter)
                ^UUID node]
  IHLC
  (-increment [_ now]
    (if (< (.getTime ts) (.getTime now))
      (HLC. now 0 node)
      (HLC. ts (inc counter) node)))
  (-receive [_ remote now]
    (if (and (< (.getTime ts) (.getTime now))
             (< (.getTime (:ts remote)) (.getTime now)))
      (HLC. now 0 node)
      (case (compare ts (:ts remote))
        -1 (HLC. (:ts remote) (inc (:counter remote)) node)
        0 (HLC. ts (inc (max counter (:counter remote))) node)
        1 (HLC. ts (inc counter) node))))
  #?(:clj  Comparable
     :cljs IComparable)
  #?(:clj
     (compareTo [this that]
                (stagger-compare [:ts :counter :node] this that))

     :cljs
     (-compare [this that]
               (stagger-compare [:ts :counter :node] this that)))
  CRDTDelta
  (-init [_] (HLC. ts 0 node))
  OpCRDT
  (-value [this] this)
  (-apply-delta [this delta]
    (case (compare this delta)
      -1 delta 0 this 1 this))
  StateCRDT
  (-merge [this that]
    (-apply-delta this that)))

#?(:clj
   (extend-type HLC
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

#?(:clj
   (defmethod print-method HLC
     [^HLC hlc ^java.io.Writer writer]
     (.write writer "#crdt/hlc ")
     (print-method [(.ts hlc) (.counter hlc) (.node hlc)] writer)))

(defn new-hlc
  ([node] (new-hlc node (now)))
  ([node now] (HLC. now 0 node)))

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
    0 (->HLC (now) 0 (random-uuid))
    1 (->HLC (now) 0 (first value))
    2 (->HLC (now) (first value) (second value))
    3 (->HLC (first value) (second value) (nth value 2))))

(defn hlc-instance? [x]
  (instance? HLC x))

(def hlc-schema
  [:map
   [:ts inst?]
   [:counter integer?]
   [:node :uuid]])

(defn inc-time [#?(:clj ^Date d :cljs ^js/Date d)]
  #?(:clj (Date. (inc (.getTime d)))
     :cljs (js/Date. (inc (.getTime d)))))

(defrecord ClientClock [event-number ts user-id conn-id]
  #?(:clj  Comparable
     :cljs IComparable)
  #?(:clj
     (compareTo [this that]
                (stagger-compare [:event-number :ts :user-id :conn-id] this that))
     :cljs
     (-compare [this that]
               (stagger-compare [:event-number :ts :user-id :conn-id] this that))))

(defn choose-incoming? ^Boolean
  [existing incoming]
  (cond
    (nil? incoming) false
    (nil? existing) true
    (not= (type incoming) (type existing))
    (case (compare (type incoming) (type existing))
      -1 false
      1 true
      0 false)

    ;; If both are comparable, get the bigger one
    (and (comparable? incoming) (comparable? existing))
    (case (compare incoming existing)
      -1 false
      1 true
      0 false)

    ;; we keep the incoming since it is more likely to be the one we want
    :else true))

(defrecord LWW [clock value]
  CRDTDelta
  (-init [_] (LWW. ::empty (-init value)))
  OpCRDT
  (-value [_] value)
  (-apply-delta [this #?(:clj delta :cljs ^LWW delta)]
    (let [delta-clock (.-clock delta)
          delta-value (.-value delta)]
      (cond
        (= ::empty delta-clock) this
        (= ::empty clock)       delta
        :else (case (compare clock delta-clock)
                -1 delta
                1 this
                ;; When clocks are equal (0), compare values to break ties
                ;; If values are equal or incomparable, keep incoming value
                0 (if (choose-incoming? value delta-value)
                    delta
                    this)))))
  StateCRDT
  (-merge [this that]
    (-apply-delta this that)))

#?(:clj
   (extend-type LWW
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

(defn lww [clock value]
  (if (instance? LWW value) value (->LWW clock value)))

#?(:clj
   (defmethod print-method LWW
     [^LWW lww ^java.io.Writer writer]
     (.write writer "#crdt/lww ")
     (print-method [(.clock lww) (.value lww)] writer)))

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
    (GrowOnlySet. #{}))
  OpCRDT
  (-value [_] xs)
  (-apply-delta [_ delta]
     ;; TODO: can you pass a set to a GOS and have it be merged in?
    (cond
      (grow-only-set-instance? delta) (GrowOnlySet. (set/union xs (-value delta)))
      :else (GrowOnlySet. (conj xs (-value delta)))))
  StateCRDT
  (-merge [this that]
    (GrowOnlySet. (set/union (:xs this) (:xs that)))))

#?(:clj
   (extend-type GrowOnlySet
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

#?(:clj
   (defmethod print-method GrowOnlySet
     [^GrowOnlySet gos ^java.io.Writer writer]
     (.write writer "#crdt/gos ")
     (print-method (.xs gos) writer)))

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
         (filter (fn [[_x lww]]
                   (-value lww)))
         (map key)
         set))
  (-apply-delta [_ delta]
    {:pre [(map? delta)
           (every? lww-instance? (vals delta))]}
    ;; delta is {x #crdt/lww #crdt/hlc boolean?}
    (LWWSet.
     (reduce (fn [acc [x lww]]
               (update acc x -apply-delta lww))
             xs
             delta)))
  StateCRDT
  (-merge [this that]
    (-apply-delta this (:xs that))))

#?(:clj
   (extend-type LWWSet
     juxt-nippy/IFreezable1
     (-freeze-without-meta! [this out]
       (nippy/freeze-to-out! out this))))

(defn lww-set
  ([] (lww-set nil #{}))
  ([clock xs]
  ;; {:pre [(or (nil? xs) (set? xs))]}
   (if (instance? LWWSet xs)
     xs
     (let [inner (into {} (map (fn [x] [x (LWW. clock true)]) (or xs #{})))]
       (LWWSet. inner)))))

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
  #?(:clj IPersistentMap :cljs cljs.core/IMap)
  (-init [_] {}))

(extend-protocol CRDTDelta
  #?(:clj Object :cljs object)
  (-init [this] this))

#?(:cljs
   (extend-protocol CRDTDelta
     number
     (-init [this] this)

     string
     (-init [this] this)

     boolean
     (-init [this] this)

     array
     (-init [this] this)

     js/Date
     (-init [this] this)

     uuid
     (-init [this] this)

     Keyword
     (-init [this] this)

     Symbol
     (-init [this] this)))

(extend-protocol OpCRDT
  nil
  (-value [_] nil)
  (-apply-delta [_ delta]
    (-apply-delta (-init delta) delta)))

(defn- value-map [this]
  (reduce (fn [m [k v]] (assoc m k (-value v))) {} this))

(defn- apply-delta-map [this delta]
  (reduce (fn [m [k val-delta]]
            (update m k -apply-delta val-delta))
          this
          delta))

#?(:clj
   (extend-protocol OpCRDT
     IPersistentMap
     (-value [this]
       (value-map this))
     (-apply-delta [this delta]
       (apply-delta-map this delta))))

#?(:cljs
   (extend-protocol OpCRDT
     cljs.core/PersistentArrayMap
     (-value [this]
       (value-map this))
     (-apply-delta [this delta]
       (apply-delta-map this delta))
     cljs.core/PersistentTreeMap
     (-value [this]
       (value-map this))
     (-apply-delta [this delta]
       (apply-delta-map this delta))
     cljs.core/PersistentHashMap
     (-value [this]
       (value-map this))
     (-apply-delta [this delta]
       (apply-delta-map this delta))))

#?(:clj
   (extend-protocol StateCRDT
     IPersistentMap
     (-merge [this that]
       (merge-with -merge this that))))

#?(:cljs
   (extend-protocol StateCRDT
     cljs.core/PersistentHashMap
     (-merge [this that]
       (merge-with -merge this that))
     cljs.core/PersistentArrayMap
     (-merge [this that]
       (merge-with -merge this that))
     cljs.core/PersistentTreeMap
     (-merge [this that]
       (merge-with -merge this that))))

(defn throw-unsupported-op [this delta]
  (throw (ex-info (str "Applied a delta to a value that is not a CRDT: %s \n %s"
                       (type this) (pr-str delta))
                  {:this this :delta delta})))

(extend-protocol OpCRDT
  #?(:clj Object :cljs object)
  (-value [this] this)
  (-apply-delta [this delta]
    (throw-unsupported-op this delta)))

#?(:cljs
   (extend-protocol OpCRDT
     number
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     string
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     boolean
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     array
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     js/Date
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     uuid
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     Keyword
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))

     Symbol
     (-value [this] this)
     (-apply-delta [this delta]
       (throw-unsupported-op this delta))))

(defn clock? [x]
  (comparable? x))

(defn ->lww-map
  "Recursively walks the map turning all its leaf nodes to LWW"
  [m clock]
  {:pre [(map? m) (clock? clock)] :post [(map? %)]}
  (map-vals (fn [v]
              (if (map? v)
                (->lww-map v clock)
                (LWW. clock v)))
            m))
