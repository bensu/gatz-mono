(ns gatz.flags
  (:require [clojure.tools.logging :as log]))

(def values-schema
  [:map
   [:flags/post_to_friends_of_friends boolean?]])

(def current-values
  {:flags/post_to_friends_of_friends true})

(defn use-flags [ctx]
  (let [flags current-values]
    (log/info "Initializing flags:" flags)
    (assoc ctx :flags/flags {:flags/values flags})))

