(ns gatz.db.evt
  (:require [crdt.ulid :as ulid])
  (:import [java.util Date]))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :xt/id (ulid/random-time-uuid)
          :evt/ts (Date.)
          :db/type :gatz/evt}
         evt))

