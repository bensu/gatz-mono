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

;; ======================================================================
;; Response helpers

(defn json-response
  ([body] (json-response body 200))
  ([body status]
   {:pre [(integer? status)]}
   {:status status
    :headers {"Content-Type" "application/json"}
    :body (json/write-str body)}))

(defn err-resp [code msg]
  {:status 400
   :headers {"Content-Type" "application/json"}
   :body (json/write-str {:error code :message msg})})

(defn edn-response
  ([body] (edn-response body 200))
  ([body status]
   {:pre [(integer? status)]}
   {:status status
    :headers {"Content-Type" "application/edn"}
    :body (pr-str body)}))

(defn accepts-json? [request]
  (boolean
   (let [accepts (get-in request [:headers "accept"])]
     (or (nil? accepts)
         (re-matches #"application/json.*" accepts)))))

(defn accepts-edn? [request]
  (boolean
   (when-let [accepts (get-in request [:headers "accept"])]
     (re-matches #"application/edn.*" accepts))))

(defn ok [ctx data]
  (if (accepts-edn? ctx)
    (edn-response data)
    (json-response data)))


