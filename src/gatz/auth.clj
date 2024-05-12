(ns gatz.auth
  (:require [buddy.sign.jwt :as jwt]
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

(defn wrap-api-auth [handler]
  (fn [{:keys [headers params] :as ctx}]
    (if-let [token (or (get headers "authorization")
                       (get params :token))]
      (if-let [auth-payload (verify-auth-token ctx token)]
        (let [user-id (mt/-string->uuid (:auth/user-id auth-payload))]
          (handler (assoc ctx :auth/user-id user-id :auth/token token)))
        {:status 401
         :body {:error "Invalid token"}})
      {:status 401
       :body {:error "Missing token"}})))