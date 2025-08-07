(ns ddl.admin
  (:require [ddl.api :as ddl]
            [clojure.tools.logging :as log]
            [clojure.pprint :as pp]
            [clojure.string :as str]
            [ring.util.response :as response])
  (:import [java.util Base64]))

(def unauthorized-response
  (-> (response/response "Unauthorized")
      (response/status 401)
      (response/charset "utf-8")
      (response/content-type "text/plain")
      (response/header "WWW-Authenticate" "Basic realm=\"Admin Area\"")))

(defn parse-auth-header [auth-header]
  (try
    (let [[_ credentials] (re-find #"^Basic (.+)$" auth-header)
          [username password] (-> (.decode (Base64/getDecoder) credentials)
                                  (String.)
                                  (str/split #":" 2))]
      [username password])
    (catch Exception e
      (log/error "Error parsing the auth header" e)
      nil)))

(defn wrap-admin-auth [handler]
  (fn [{:keys [biff/secret headers] :as ctx}]
    (if-let [auth-header (get headers "authorization")]
      (if-let [auth-header (parse-auth-header auth-header)]
        (let [[username password] auth-header]
          (if (and (= username (secret :admin/username))
                   (= password (secret :admin/password)))
            (handler ctx)
            unauthorized-response))
        unauthorized-response)
      unauthorized-response)))

(defn get-debug-route [_ctx]
  (let [pl @ddl/pending-links*]
    {:status 200
     :headers {"Content-Type" "text/html"}
     :body (with-out-str (pp/pprint pl))}))
