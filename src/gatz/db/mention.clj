(ns gatz.db.mention
  (:require [xtdb.api :as xtdb]
            [com.biffweb :as biff :refer [q]]))

(defn by-uid-did [db uid did]
  {:pre [(uuid? uid) (uuid? did)]}
  (first
   (q db '{:find mention
           :in [user-id did]
           :where [[mention :db/type :gatz/mention]
                   [mention :mention/to_uid user-id]
                   [mention :mention/did did]]}
      uid did)))

(defn add-mention
  [xtdb-ctx {:keys [mention] :as _args}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:mention/keys [to_uid did]} mention
        existing-mention (by-uid-did db to_uid did)]
    (println "existing mention" existing-mention)
    (when-not (some? existing-mention)
      [[:xtdb.api/put (assoc mention :db/op :create)]])))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  add-mention-expr
  '(fn add-mention-fn [ctx args]
     (gatz.db.mention/add-mention ctx args)))

(def tx-fns
  {:gatz.db.mention/add add-mention-expr})
