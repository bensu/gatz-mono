(ns sdk.sentry
  (:require [sentry-clj.core :as sentry]
            [clojure.tools.logging :as log]))

(defonce ^:private enabled? (atom false))

(defn send-request-error! [^Throwable e request]
  (when @enabled?
    (log/info "Logging exception to Sentry" (.getMessage e))
    (sentry/send-event {:message (.getMessage e)
                        :throwable e
                        :request {"url" (:uri request)
                                  "method" (-> request :request-method name)
                                  "headers" (update-keys (:headers request) name)
                                  "query_string" (:query-string request)}})))

(defn wrap-sentry [handler]
  (fn [request]
    (try
      (handler request)
      (catch Throwable e
        (send-request-error! e request)
        (throw e)))))

(defn use-sentry [{:keys [biff/secret biff/env] :as ctx}]
  (let [dsn (secret :sentry/dsn)]
    (assert dsn "Sentry DSN is not set")
    (log/info "Initializing Sentry with environment:" env)
    (when (= :env/prod env)
      (sentry/init! dsn {:environment env})
      (reset! enabled? true))
    ctx))