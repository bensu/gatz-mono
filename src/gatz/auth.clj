(ns gatz.auth
  (:require [buddy.sign.jwt :as jwt]
            [malli.transform :as mt]))

(defn- jwt-secret [] "browbeat.epicure.detonate")

(defn create-auth-token [user-id]
  (jwt/sign {:auth/user-id user-id} (jwt-secret)))

(defn verify-auth-token [auth-token]
  (try
    (-> auth-token
        (jwt/unsign (jwt-secret))
        (update :auth/user-id mt/-string->uuid))
    (catch Exception _e
      nil)))


(defn wrap-api-auth [handler]
  (fn [{:keys [headers params] :as ctx}]
    (def -ctx ctx)
    (if-let [token (or (get headers "authorization")
                       (get params :token))]
      (if-let [auth-payload (verify-auth-token token)]
        (let [user-id (mt/-string->uuid (:auth/user-id auth-payload))]
          (handler (assoc ctx :auth/user-id user-id :auth/token token)))
        {:status 401
         :body {:error "Invalid token"}})
      {:status 401
       :body {:error "Missing token"}})))