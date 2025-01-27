(ns sdk.sentry
  (:require [sentry-clj.core :as sentry]
            [clojure.tools.logging :as log]))

(defonce ^:private enabled? (atom false))

(defn send-event-error! [^Throwable e event]
  (if @enabled?
    (let [{:evt/keys [type did mid]} event]
      (log/info "Logging event exception to Sentry:" (.getMessage e))
      (sentry/send-event {:message (.getMessage e)
                          :throwable e
                          :request {"other" {"type" type "did" did "mid" mid}}}))
    (do
      (log/info "Sentry is not enabled")
      (log/error e))))

(defn send-request-error! [^Throwable e request]
  (if @enabled?
    (do
      (log/info "Logging request exception to Sentry:" (.getMessage e))
      (sentry/send-event {:message (.getMessage e)
                          :throwable e
                          :request {"url" (:uri request)
                                    "method" (-> request :request-method name)
                                    "headers" (update-keys (:headers request) name)
                                    "query_string" (:query-string request)}}))
    (do
      (log/info "Sentry is not enabled")
      (log/error e))))

(defn wrap-sentry [handler]
  (fn [request]
    (try
      (handler request)
      (catch Throwable e
        (send-request-error! e request)
        (throw e)))))

(defn use-sentry [{:keys [biff/secret] :as ctx}]
  (let [dsn (secret :sentry/dsn)
        sentry-env (secret :sentry/environment)]
    (assert dsn "Sentry DSN is not set")
    (log/info "Initializing Sentry with environment:" sentry-env)
    (when (= sentry-env "production")
      (sentry/init! dsn {:environment sentry-env})
      (reset! enabled? true))
    ctx))