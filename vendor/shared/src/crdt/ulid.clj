(ns crdt.ulid
  (:require [clojure.data.json]
            [xtdb.codec]
            [taoensso.nippy :as nippy]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy])
  (:import [com.github.f4b6a3.ulid Ulid UlidCreator]
           [java.io Writer]
           [java.util UUID Date]
           [java.nio.charset StandardCharsets]
           [org.agrona MutableDirectBuffer]
           [com.fasterxml.uuid Generators UUIDClock]))

;; https://github.com/f4b6a3/ulid-creator?tab=readme-ov-file

;; ==================================================================
;; API

(defn fixed-clock ^UUIDClock [^Long ms]
  (proxy [UUIDClock] []
    (currentTimeMillis [] ms)))

(defn random ^Ulid []
  (UlidCreator/getUlid))

(defn rand-uuid ^UUID []
  (.toUuid (UlidCreator/getUlid)))

(defn monotonic ^Ulid []
  (UlidCreator/getMonotonicUlid))

(defn ulid? [x]
  (instance? Ulid x))

(defn maybe-parse [x]
  (when x
    (if (ulid? x) x
        (try
          (Ulid/from x)
          (catch Exception _ nil)))))

;; UUID uuid = Generators.timeBasedEpochGenerator () .generate (); // Version 7
(def ^:private time-based-epoch-generator (Generators/timeBasedEpochRandomGenerator))

(defn random-time-uuid
  "Generate a UUID v7 based on a specific timestamp.
   timestamp should be a java.util.Date or java.time.Instant"
  (^UUID [] (.generate time-based-epoch-generator))
  (^UUID [^Date ts]
   (let [ms (.getTime ts)]
     (.generate (Generators/timeBasedEpochRandomGenerator nil (fixed-clock ms))))))

;; ==================================================================
;; Integrations

(defn read-ulid ^Ulid [^String s]
  (Ulid/from s))

(defmethod print-method Ulid
  [^Ulid ulid ^Writer writer]
  (.write writer "#crdt/ulid ")
  (print-method (.toString ulid) writer))

(defmethod print-dup Ulid [^Ulid ulid ^java.io.Writer w]
  (.write w (str "#=(crdt.ulid/read-ulid " (pr-str (.toString ulid)) ")")))

(extend-type Ulid
  xtdb.codec/IdToBuffer
  (id->buffer [^Ulid ulid ^MutableDirectBuffer to]
    (xtdb.codec/id-function to (.getBytes (.toString ulid) StandardCharsets/UTF_8)))

  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this))

  clojure.data.json/JSONWriter
  (-write [^Ulid ulid ^Appendable out _options]
    (.append out \")
    (.append out (.toString ulid))
    (.append out \")))
