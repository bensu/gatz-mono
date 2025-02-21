(ns gatz.util
  (:import [java.util UUID]
           [java.util Date]))

(defn parse-uuid [s]
  (cond
    (uuid? s) s
    (string? s) (try
                  (UUID/fromString s)
                  (catch Throwable _
                    nil))
    :else nil))

(defn parse-long [s]
  (cond
    (int? s) s
    (string? s) (try
                  (Long/parseLong s)
                  (catch Throwable _
                    nil))
    :else nil))

(defn before? [^Date d1 ^Date d2]
  (.before d1 d2))