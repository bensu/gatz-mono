(ns gatz.db.evt
  (:import [java.util Date]))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :evt/ts (Date.)
          :db/type :gatz/evt
          :evt/id (random-uuid)}
         evt))

