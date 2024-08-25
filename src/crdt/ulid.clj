(ns crdt.ulid
  (:require [clojure.data.json]
            [xtdb.codec]
            [taoensso.nippy :as nippy]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy])
  (:import [com.github.f4b6a3.ulid Ulid UlidCreator]
           [java.io Writer]
           [java.util UUID]
           [java.nio.charset StandardCharsets]
           [org.agrona MutableDirectBuffer]))

;; https://github.com/f4b6a3/ulid-creator?tab=readme-ov-file

;; ==================================================================
;; API

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
