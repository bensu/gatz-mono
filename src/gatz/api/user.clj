(ns gatz.api.user
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [gatz.auth :as auth]
            [gatz.crdt.user :as crdt.user]
            [gatz.db :as db]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [malli.transform :as mt]
            [medley.core :refer [map-keys]]
            [sdk.twilio :as twilio]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))

;; ======================================================================  
;; Endpoints

(defn get-me
  [{:keys [biff/db auth/user-id] :as _ctx}]
  (let [user (db.user/by-id db user-id)]
    (json-response {:user user})))

(defn get-user
  [{:keys [params biff/db] :as _ctx}]
  (if-let [user-id (some-> (:id params) mt/-string->uuid)]
    (let [user (db.user/by-id db user-id)]
      (json-response {:user (crdt.user/->value user)}))
    {:status 400 :body "invalid params"}))

(defn create-user!
  [{:keys [params] :as ctx}]
  (if-let [username (some-> (:username params) str/trim)]
    (if (crdt.user/valid-username? username)
      (let [user (db.user/create-user! ctx {:username username})]
        (json-response {:user (crdt.user/->value user)}))
      (err-resp "invalid_username" "Username is invalid"))
    (err-resp "username_taken" "Username is already taken")))

(defn add-push-token!
  [{:keys [params auth/user-id] :as ctx}]
  (if-let [push-token (:push_token params)]
    (let [new-token {:push/service :push/expo
                     :push/token push-token
                     :push/created_at (java.util.Date.)}
          user (db.user/add-push-token! ctx {:user-id user-id
                                             :push-token {:push/expo new-token}})]
      (json-response {:status "success"
                      :user (crdt.user/->value user)}))
    (err-resp "push_token_missing" "Missing push token parameter")))

(defn disable-push!
  [{:keys [auth/user-id] :as ctx}]
  (let [user (db.user/remove-push-tokens! ctx user-id)]
    (json-response {:status "success"
                    :user (crdt.user/->value user)})))

;; TODO: transform into a CRDT delta
(defn params->notification-settings [params]
  (let [m (map-keys (comp (partial keyword "settings.notification") name) params)]
    (cond-> (select-keys m schema/notification-keys)
      (some? (:settings.notification/activity m))
      (update :settings.notification/activity (partial keyword "settings.notification")))))

(defn update-notification-settings!
  [{:keys [params auth/user-id] :as ctx}]
  (if-let [notification-settings (some-> (:settings params)
                                         params->notification-settings)]
    (let [user (db.user/edit-notifications! ctx
                                            user-id
                                            notification-settings)]
      (json-response {:status "success"
                      :user (crdt.user/->value user)}))
    (err-resp "invalid_params" "Invalid parameters")))


(defn sign-in!
  [{:keys [params biff/db] :as _ctx}]
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (if-let [user (db.user/by-name db username)]
      (json-response {:user  (crdt.user/->value user)
                      :token (auth/create-auth-token (:xt/id user))})
      (err-resp "user_not_found" "Username not found"))
    (err-resp "invalid_username" "Invalid username")))

(defn clean-username [s] (-> s str/trim))

(defn clean-phone
  "The standard format is +{AREA}{NUMBER} without separators. Examples:

   +14159499931
   +16507919090
   +5491137560419"
  [phone]
  (let [only-numbers (some-> phone (str/replace #"[^0-9]" ""))]
    (some->> only-numbers (str "+"))))

;; TODO: use a proper validation function
(defn valid-phone?
  "Strips the phone number of all non-numeric characters, then check if it's a valid phone number. "
  [phone]
  (let [phone (or (some-> phone clean-phone) "")]
    (and (not-empty phone)
         (<= 9 (count phone)))))

;; TODO: do params validation
(defn sign-up!
  [{:keys [params biff/db] :as ctx}]
  (if-let [username (some-> (:username params) clean-username)]
    (if-let [phone (some-> (:phone_number params) clean-phone)]
      (cond
        (not (crdt.user/valid-username? username))
        (err-resp "invalid_username" "Username is invalid")

        (some? (db.user/by-name db username))
        (err-resp "username_taken" "Username is already taken")

        (some? (db.user/by-phone db phone))
        (err-resp "phone_taken" "Phone is already taken")

        :else
        (let [user (db.user/create-user! ctx {:username username :phone phone})]
          (json-response {:type "sign_up"
                          :user  (crdt.user/->value user)
                          :token (auth/create-auth-token (:xt/id user))})))
      (err-resp "invalid_phone" "Invalid phone number"))
    (err-resp "invalid_username" "Invalid username")))

(defn clean-code [s] (-> s str/trim))

(defn twilio-to-response [v]
  {:id (:sid v)
   :status (:status v)
   :attempts (- 6 (count (:send_code_attempts v)))})

(defn verify-phone! [{:keys [params biff/db biff/secret] :as _ctx}]
  (let [{:keys [phone_number]} params
        phone (clean-phone phone_number)]
    (if-not (valid-phone? phone)
      (err-resp "invalid_phone" "Invalid phone number")
      (let [v (twilio/start-verification! secret {:phone phone})]
        (json-response (merge {:phone_number phone}
                              (twilio-to-response v)
                              (when-let [user (db.user/by-phone db phone)]
                                {:user (crdt.user/->value user)})))))))

(defn verify-code! [{:keys [params biff/secret biff/db] :as _ctx}]
  (let [{:keys [phone_number code]} params
        phone (clean-phone phone_number)
        code (clean-code code)
        v (twilio/check-code! secret {:phone phone :code code})
        approved? (= "approved" (:status v))]
    (json-response
     (merge {:phone_number phone}
            (twilio-to-response v)
            (when-not approved?
              {:status "wrong_code"})
            (when approved?
              (when-let [user (db.user/by-phone db phone)]
                {:user  (crdt.user/->value user)
                 :token (auth/create-auth-token (:xt/id user))}))))))

(defn check-username [{:keys [params biff/db] :as _ctx}]
  (let [{:keys [username]} params
        existing-user (db.user/by-name db username)]
    (json-response {:username (crdt.user/->value username)
                    :available (nil? existing-user)})))

(defn update-avatar!
  [{:keys [params auth/user-id] :as ctx}]
  (if-let [url (:file_url params)]
    (let [user (db.user/update-user-avatar! ctx user-id url)]
      (json-response {:user (crdt.user/->value user)}))
    (err-resp "invalid_file_url" "Invalid file url")))

