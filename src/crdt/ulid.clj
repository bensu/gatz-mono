(ns crdt.ulid
  (:import [java.io Writer]
           [com.github.f4b6a3.ulid Ulid UlidCreator]))

;; https://github.com/f4b6a3/ulid-creator?tab=readme-ov-file

(defn read-ulid ^Ulid [^String s]
  (Ulid/from s))

(defmethod print-method Ulid
  [^Ulid ulid ^Writer writer]
  (.write writer "#crdt/ulid ")
  (print-method (.toString ulid) writer))

(defn random ^Ulid []
  (UlidCreator/getUlid))

(defn monotonic ^Ulid []
  (UlidCreator/getMonotonicUlid))


