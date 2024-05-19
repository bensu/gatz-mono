(ns gatz.auth
  (:require [clojure.data.json :as json]
            [buddy.sign.jwt :as jwt]
            [malli.transform :as mt]))

(defn- jwt-secret [{:keys [biff/secret]}]
  (secret :gatz.auth/jwt-secret))

(defn create-auth-token [ctx user-id]
  (jwt/sign {:auth/user-id user-id} (jwt-secret ctx)))

(defn verify-auth-token [ctx auth-token]
  (try
    (-> auth-token
        (jwt/unsign (jwt-secret ctx))
        (update :auth/user-id mt/-string->uuid))
    (catch Exception _e
      nil)))

(defn json-response
  ([body] (json-response body 200))
  ([body status]
   {:status status
    :headers {"Content-Type" "application/json"}
    :body (json/write-str body)}))

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg} 401))

(defn wrap-api-auth [handler]
  (fn [{:keys [headers params] :as ctx}]
    (if-let [token (or (get headers "authorization")
                       (get params :token))]
      (if-let [auth-payload (verify-auth-token ctx token)]
        (let [user-id (mt/-string->uuid (:auth/user-id auth-payload))]
          (handler (assoc ctx :auth/user-id user-id :auth/token token)))
        (err-resp "invalid_token" "Invalid JWT token"))
      (err-resp "missing_token" "Missing token"))))
