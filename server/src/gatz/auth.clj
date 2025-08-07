(ns gatz.auth
  (:require [clojure.data.json :as json]
            [gatz.db.user :as db.user]
            [buddy.sign.jwt :as jwt]
            [buddy.sign.jws :as jws]
            [buddy.core.keys :as keys]
            [clj-http.client :as http]
            [gatz.util :as util]
            [clojure.string :as str])
  (:import [java.security.spec RSAPublicKeySpec]
           [java.security KeyFactory]
           [java.math BigInteger]
           [java.util Base64]))

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
         (update :auth/user-id util/parse-uuid))
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
        (let [user-id (util/parse-uuid (:auth/user-id auth-payload))
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

;; ======================================================================
;; Apple Sign-In JWT Validation

(def apple-jwks-url "https://appleid.apple.com/auth/keys")

;; ======================================================================  
;; Google Sign-In JWT Validation

(def google-jwks-url "https://www.googleapis.com/oauth2/v3/certs")

(defn base64url-decode
  "Decode a base64url-encoded string"
  [s]
  (let [padded (case (mod (count s) 4)
                 2 (str s "==")
                 3 (str s "=")
                 s)]
    (.decode (Base64/getUrlDecoder) (.getBytes padded "UTF-8"))))

(defn jwk->rsa-public-key
  "Convert a JWK (JSON Web Key) to an RSA public key"
  [{:keys [n e]}]
  (let [modulus (BigInteger. 1 (base64url-decode n))
        exponent (BigInteger. 1 (base64url-decode e))
        key-spec (RSAPublicKeySpec. modulus exponent)
        key-factory (KeyFactory/getInstance "RSA")]
    (.generatePublic key-factory key-spec)))

(def apple-jwks-cache (atom {:keys nil :expires-at 0}))
(def google-jwks-cache (atom {:keys nil :expires-at 0}))

(defn fetch-apple-jwks
  "Fetch Apple's JWKS with caching (1 hour TTL)"
  []
  (let [now (System/currentTimeMillis)
        cached @apple-jwks-cache
        expires-at (:expires-at cached)]
    (if (< now expires-at)
      (:keys cached)
      (try
        (let [response (http/get apple-jwks-url {:accept :json})
              jwks (json/read-str (:body response) :key-fn keyword)
              keys (:keys jwks)
              new-expires (+ now (* 60 60 1000))] ; Cache for 1 hour
          (reset! apple-jwks-cache {:keys keys :expires-at new-expires})
          keys)
        (catch Exception e
          (throw (ex-info "Failed to fetch Apple JWKS"
                          {:error e :url apple-jwks-url})))))))

(defn find-apple-key
  "Find the Apple public key with the given key ID (kid)"
  [kid]
  (let [keys (fetch-apple-jwks)]
    (first (filter #(= (:kid %) kid) keys))))

(defn verify-apple-id-token
  "Verify an Apple ID token and extract claims"
  [id-token {:keys [client-id audience] :or {audience client-id}}]
  (try
    (let [header (json/read-str
                  (String. (base64url-decode
                            (first (str/split id-token #"\."))))
                  :key-fn keyword)
          kid (:kid header)
          alg (:alg header)]
      
      ;; Verify algorithm is RS256
      (when-not (= alg "RS256")
        (throw (ex-info "Invalid algorithm" {:algorithm alg})))
      
      ;; Find the appropriate key
      (if-let [jwk (find-apple-key kid)]
        (let [public-key (jwk->rsa-public-key jwk)
              claims (jws/unsign id-token public-key {:alg :rs256})]
          
          ;; Validate required claims
          (let [iss (:iss claims)
                aud (:aud claims)
                sub (:sub claims)
                exp (:exp claims)
                now (/ (System/currentTimeMillis) 1000)]
            
            ;; Validate issuer
            (when-not (= iss "https://appleid.apple.com")
              (throw (ex-info "Invalid issuer" {:issuer iss})))
            
            ;; Validate audience
            (when-not (= aud audience)
              (throw (ex-info "Invalid audience" {:audience aud :expected audience})))
            
            ;; Validate subject exists
            (when (str/blank? sub)
              (throw (ex-info "Missing subject" {:subject sub})))
            
            ;; Token expiration is automatically validated by buddy-sign
            
            claims))
        (throw (ex-info "Apple public key not found" {:kid kid}))))
    (catch Exception e
      (throw (ex-info "Apple ID token verification failed"
                      {:error (.getMessage e) :token (subs id-token 0 (min 50 (count id-token)))}
                      e)))))

;; ======================================================================
;; Google Sign-In JWT Validation Functions

(defn fetch-google-jwks
  "Fetch Google's JWKS with caching (5 minute TTL as per Google docs)"
  []
  (let [now (System/currentTimeMillis)
        cached @google-jwks-cache
        expires-at (:expires-at cached)]
    (if (< now expires-at)
      (:keys cached)
      (try
        (let [response (http/get google-jwks-url {:accept :json})
              jwks (json/read-str (:body response) :key-fn keyword)
              keys (:keys jwks)
              new-expires (+ now (* 5 60 1000))] ; Cache for 5 minutes per Google docs
          (reset! google-jwks-cache {:keys keys :expires-at new-expires})
          keys)
        (catch Exception e
          (throw (ex-info "Failed to fetch Google JWKS"
                          {:error e :url google-jwks-url})))))))

(defn find-google-key
  "Find the Google public key with the given key ID (kid)"
  [kid]
  (let [keys (fetch-google-jwks)]
    (first (filter #(= (:kid %) kid) keys))))

(defn verify-google-id-token
  "Verify a Google ID token and extract claims"
  [id-token {:keys [client-id audience] :or {audience client-id}}]
  (try
    (let [header (json/read-str
                  (String. (base64url-decode
                            (first (str/split id-token #"\."))))
                  :key-fn keyword)
          kid (:kid header)
          alg (:alg header)]
      
      ;; Verify algorithm is RS256
      (when-not (= alg "RS256")
        (throw (ex-info "Invalid algorithm" {:algorithm alg})))
      
      ;; Find the appropriate key
      (if-let [jwk (find-google-key kid)]
        (let [public-key (jwk->rsa-public-key jwk)
              claims (jws/unsign id-token public-key {:alg :rs256})]
          
          ;; Validate required claims
          (let [iss (:iss claims)
                aud (:aud claims)
                sub (:sub claims)
                exp (:exp claims)
                now (/ (System/currentTimeMillis) 1000)]
            
            ;; Validate issuer - Google uses accounts.google.com or https://accounts.google.com
            (when-not (contains? #{"https://accounts.google.com" "accounts.google.com"} iss)
              (throw (ex-info "Invalid issuer" {:issuer iss})))
            
            ;; Validate audience
            (when-not (= aud audience)
              (throw (ex-info "Invalid audience" {:audience aud :expected audience})))
            
            ;; Validate subject exists
            (when (str/blank? sub)
              (throw (ex-info "Missing subject" {:subject sub})))
            
            ;; Token expiration is automatically validated by buddy-sign
            
            claims))
        (throw (ex-info "Google public key not found" {:kid kid}))))
    (catch Exception e
      (throw (ex-info "Google ID token verification failed"
                      {:error (.getMessage e) :token (subs id-token 0 (min 50 (count id-token)))}
                      e)))))
