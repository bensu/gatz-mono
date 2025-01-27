(ns sdk.sentry
  (:require [sentry-clj.core :as sentry]
            [clojure.tools.logging :as log]))

(defn wrap-sentry [handler]
  (fn [request]
    (try
      (handler request)
      (catch Exception e
        (log/info "Logging exception to Sentry" (.getMessage e))
        (sentry/send-event {:message (.getMessage e)
                            :throwable e
                            :request {"url" (:uri request)
                                      "method" (-> request :request-method name)
                                      "headers" (update-keys (:headers request) name)
                                      "query_string" (:query-string request)}})
        (throw e)))))

(defn use-sentry [{:keys [biff/secret] :as ctx}]
  (let [dsn (secret :sentry/dsn)
        _ (assert dsn "Sentry DSN is not set")
        env (or (secret "env") "development")]
    (log/info "Initializing Sentry with environment:" env)
    (sentry/init! dsn {:environment env})
    ctx))