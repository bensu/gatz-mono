(ns gatz.flags
  (:require [clojure.tools.logging :as log]))

(def values-schema
  [:map
   [:flags/post_to_friends_of_friends boolean?]
   [:flags/global_invites_enabled? boolean?]])

(def current-values
  {:flags/post_to_friends_of_friends false
   :flags/global_invites_enabled? true})

(def ^:dynamic *flags* current-values)

(defmacro with-flags [flags & body]
  `(binding [*flags* (merge (or *flags* {}) ~flags)]
     ~@body))

(defn use-flags [ctx]
  (let [flags (merge current-values *flags*)]
    (log/info "Initializing flags:" flags)
    (assoc ctx :flags/flags flags)))

