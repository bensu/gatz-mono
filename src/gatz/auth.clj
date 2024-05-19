(ns gatz.auth
  (:require [clojure.data.json :as json]
            [gatz.db.user :as db.user]
            [buddy.sign.jwt :as jwt]
            [malli.transform :as mt]))

(def auth-schema
  [:map
   [:auth/user-id uuid?]])

(defn- jwt-secret [{:keys [biff/secret]}]
  (secret :gatz.auth/jwt-secret))

(defn- old-jwt-secret [{:keys [biff/secret]}]
  (secret :gatz.auth/jwt-secret-old))

(defn create-auth-token [ctx user-id]
  (jwt/sign {:auth/user-id user-id} (jwt-secret ctx)))

(defn verify-auth-token
  ([ctx auth-token]
   (verify-auth-token ctx auth-token (jwt-secret ctx)))
  ([ctx auth-token jwt-token]
   (try
     (-> auth-token
         (jwt/unsign jwt-token)
         (update :auth/user-id mt/-string->uuid))
     (catch Exception _e
      ;; Maybe it is an old token
       (let [prev-jwt-secret (old-jwt-secret ctx)]
         (if-not (= prev-jwt-secret jwt-token)
           (when-let [{:keys [auth/user-id] :as auth} (verify-auth-token ctx auth-token prev-jwt-secret)]
             (println "deconding with old")
             (-> auth
                 (assoc :auth/migrate-to-token (create-auth-token ctx user-id))))
           (println "Invalid JWT token" auth-token)))))))

(defn json-response
  ([body] (json-response body 200))
  ([body status]
   {:pre [(integer? status)]}
   {:status status
    :headers {"Content-Type" "application/json"}
    :body (json/write-str body)}))

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg} 401))

(def migrate-token-header "gatz-auth-migrate-token")

(defn wrap-api-auth [handler]
  (fn [{:keys [headers params biff/db] :as ctx}]
    (if-let [token (or (get headers "authorization")
                       (get params :token))]
      (if-let [auth-payload (verify-auth-token ctx token)]
        (let [user-id (mt/-string->uuid (:auth/user-id auth-payload))
              migrate-to (:auth/migrate-to-token auth-payload)]
          (if-let [user (db.user/by-id db user-id)]
            (let [resp (handler (assoc ctx
                                       :auth/user user
                                       :auth/user-id user-id
                                       :auth/token token))]
              (cond-> resp
                (some? migrate-to) (update :headers merge
                                           {migrate-token-header migrate-to
                                            "access-control-expose-headers" migrate-token-header})))
            (err-resp "invalid_token" "Invalid JWT token")))
        (err-resp "invalid_token" "Invalid JWT token"))
      (err-resp "missing_token" "Missing token"))))
