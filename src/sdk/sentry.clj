(ns sdk.sentry
  (:require [sentry-clj.core :as sentry]
            [clojure.tools.logging :as log]
            [clojure.string :as str]))

(defonce ^:private enabled? (atom false))

;; IP address extraction functions copied from ddl.api
(defn- ips->ip
  "Extract the first IP from a comma-separated list of IPs"
  [ips]
  (when ips
    (->> (str/split ips #",")
         (map str/trim)
         (first))))

(defn get-client-ip
  "Get the client IP address from a request map"
  [request]
  (some-> (or (get-in request [:headers "x-forwarded-for"])
              (:remote-addr request))
          (ips->ip)))

(defn send-error! [^Throwable e]
  (if @enabled?
    (do
      (log/info "Logging error to Sentry:" (.getMessage e))
      (sentry/send-event {:message (.getMessage e)
                          :throwable e}))
    (do
      (log/info "Sentry is not enabled")
      (log/error e))))

(defn send-event-error! [^Throwable e event]
  (if @enabled?
    (let [{:evt/keys [type did mid uid]} event
          client-ip (get event :evt/ip)]
      (log/info "Logging event exception to Sentry:" (.getMessage e))
      (sentry/send-event {:message (.getMessage e)
                          :throwable e
                          :request {:other {"type" type "did" did "mid" mid}}
                          :user (when (or uid client-ip)
                                  (cond-> {}
                                    uid (assoc :id (str uid))
                                    client-ip (assoc :ip-address client-ip)))}))
    (do
      (log/info "Sentry is not enabled")
      (log/error e))))

(defn send-request-error! [^Throwable e request]
  (if @enabled?
    (do
      (log/info "Logging request exception to Sentry:" (.getMessage e))
      (let [client-ip (get-client-ip request)
            {:keys [auth/user-id auth/user]} request]
        (sentry/send-event {:message (.getMessage e)
                            :throwable e
                            :request {:url (:uri request)
                                      :method (-> request :request-method name)
                                      :headers (update-keys (:headers request) name)
                                      :query-string (:query-string request)
                                      :env {"REMOTE_ADDR" client-ip}}
                            :user (when (or user-id client-ip)
                                    (cond-> {}
                                      user-id (assoc :id (str user-id))
                                      user (assoc :username (:user/name user))
                                      client-ip (assoc :ip-address client-ip)))})))
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

(defn use-sentry [{:keys [biff/secret sentry/environment biff/host] :as ctx}]
  (let [dsn (secret :sentry/dsn)]
    (assert dsn "Sentry DSN is not set")
    (log/info "Initializing Sentry with environment:" environment)
    (when (= environment "production")
      ;; Initialize Sentry with server information context
      (sentry/init! dsn {:environment environment
                         :release (str "gatz-server-"
                                       (System/getProperty "java.version"))
                         :server-name host})
      (reset! enabled? true))
    ctx))

(defmacro try-and-send! [& body]
  `(try
     ~@body
     (catch Throwable e#
       (send-error! e#))))
