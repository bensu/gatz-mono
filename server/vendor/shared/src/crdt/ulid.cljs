(ns crdt.ulid
  (:require [cljs.reader :as reader]))

;; https://github.com/f4b6a3/ulid-creator?tab=readme-ov-file

(deftype Ulid [s])

(defn read-ulid ^Ulid [^String s]
  (Ulid. s))

(reader/register-tag-parser! 'crdt/ulid read-ulid)