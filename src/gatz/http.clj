(ns gatz.http
  (:require [clojure.data.json :as json]))

(def ^:dynamic *maintenance-mode* false)

(def maintenance-response
  {:status 503
   :headers {"Content-Type" "application/json"}
   :body (json/write-str
          {:error "Service Temporarily Unavailable"
           :message "The system is currently under maintenance. Please try again later."})})

(defn wrap-maintenance-mode
  "Middleware that returns a maintenance mode response for all requests when enabled."
  [handler]
  (fn [request]
    (if *maintenance-mode*
      maintenance-response
      (handler request))))

(defmacro with-maintenance-mode
  "Executes body with maintenance mode enabled or disabled."
  [enabled & body]
  `(binding [*maintenance-mode* ~enabled]
     ~@body))