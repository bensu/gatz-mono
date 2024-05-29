(ns crdt.ulid
  (:require [clojure.data.json]
            [xtdb.codec])
  (:import [com.github.f4b6a3.ulid Ulid UlidCreator]
           [java.io Writer]
           [java.nio.charset StandardCharsets]
           [org.agrona MutableDirectBuffer]))

;; https://github.com/f4b6a3/ulid-creator?tab=readme-ov-file

;; ==================================================================
;; API

(defn random ^Ulid []
  (UlidCreator/getUlid))

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

(extend-protocol xtdb.codec/IdToBuffer
  Ulid
  (id->buffer [^Ulid ulid ^MutableDirectBuffer to]
    (xtdb.codec/id-function to (.getBytes (.toString ulid) StandardCharsets/UTF_8))))

(extend-type Ulid
  clojure.data.json/JSONWriter
  (-write [^Ulid ulid ^Appendable out _options]
    (.append out \")
    (.append out (.toString ulid))
    (.append out \")))