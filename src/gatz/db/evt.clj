(ns gatz.db.evt
  (:import [java.util Date]))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :xt/id (random-uuid)
          :evt/ts (Date.)
          :db/type :gatz/evt}
         evt))

