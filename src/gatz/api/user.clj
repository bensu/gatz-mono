(ns gatz.api.user
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [gatz.auth :as auth]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [malli.transform :as mt]
            [medley.core :refer [map-keys]]
            [sdk.posthog :as posthog]
            [sdk.twilio :as twilio]))

(defn json-response
  ([body] (json-response body 200))
  ([body status]
   {:pre [(integer? status)]}
   {:status status
    :headers {"Content-Type" "application/json"}
    :body (json/write-str body)}))

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg} 400))

;; ======================================================================  
;; Endpoints

(def get-me-response
  [:map
   [:user schema/User]
   [:groups [:vec schema/Group]]
   [:contacts [:vec schema/ContactResponse]]
   [:contact_requests [:vec [:map
                             [:id schema/ContactRequestId]
                             [:contact schema/ContactResponse]]]]])

(defn get-me [{:keys [auth/user auth/user-id biff/db] :as _ctx}]
  (let [my-contacts (db.contacts/by-uid db user-id)
        groups (db.group/by-member-uid db user-id)
        contacts (mapv (fn [uid]
                         (-> (db.user/by-id db uid)
                             crdt.user/->value
                             db.contacts/->contact))
                       (:contacts/ids my-contacts))
        contact_requests (->> (db.contacts/pending-requests-to db user-id)
                              (map (fn [{:contact_request/keys [from id]}]
                                     {:id id
                                      :contact (-> (db.user/by-id db from)
                                                   crdt.user/->value
                                                   db.contacts/->contact)}))
                              vec)]
    (json-response {:user (crdt.user/->value user)
                    :groups groups
                    :contacts contacts
                    :contact_requests contact_requests})))

(defn get-user
  [{:keys [params biff/db] :as _ctx}]
  (if-let [user-id (some-> (:id params) mt/-string->uuid)]
    (let [user (db.user/by-id db user-id)]
      (json-response {:user (crdt.user/->value user)}))
    {:status 400 :body "invalid params"}))

(defn add-push-token! [{:keys [params] :as ctx}]
  (if-let [push-token (:push_token params)]
    (let [new-token {:push/service :push/expo
                     :push/token push-token
                     :push/created_at (java.util.Date.)}
          {:keys [user]} (db.user/add-push-token! ctx {:push-token {:push/expo new-token}})]
      (posthog/capture! ctx "notifications.add_push_token")
      (json-response {:status "success"
                      :user (crdt.user/->value user)}))
    (err-resp "push_token_missing" "Missing push token parameter")))

(defn disable-push! [ctx]
  (let [{:keys [user]} (db.user/turn-off-notifications! ctx)]
    (posthog/capture! ctx "notifications.disable")
    (json-response {:status "success"
                    :user (crdt.user/->value user)})))

;; TODO: transform into a CRDT delta
(defn params->notification-settings [params]
  (let [m (map-keys (comp (partial keyword "settings.notification") name) params)]
    (cond-> (select-keys m schema/notification-keys)
      (some? (:settings.notification/activity m))
      (update :settings.notification/activity (partial keyword "settings.notification")))))

(defn update-notification-settings! [{:keys [params] :as ctx}]
  (if-let [notification-settings (some-> (:settings params)
                                         params->notification-settings)]
    (let [{:keys [user]} (db.user/edit-notifications! ctx notification-settings)]
      (posthog/capture! ctx "notifications.update")
      (json-response {:status "success"
                      :user (crdt.user/->value user)}))
    (err-resp "invalid_params" "Invalid parameters")))

;; ====================================================================== 
;; Auth

(defn sign-in!
  [{:keys [params biff/db] :as ctx}]
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (if-let [user (db.user/by-name db username)]
      (do
        (posthog/identify! ctx user)
        (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_in")
        (json-response {:user  (crdt.user/->value user)
                        :token (auth/create-auth-token ctx (:xt/id user))}))
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
    (not-empty phone)))

;; TODO: do params validation
(defn sign-up! [{:keys [params biff/db] :as ctx}]
  (if-let [username (some-> (:username params) clean-username)]
    (if-let [phone (some-> (:phone_number params) clean-phone)]
      (cond
        (:gatz.auth/signup-disabled? ctx)
        (err-resp "signup_disabled" "Sign up is disabled right now")

        (not (crdt.user/valid-username? username))
        (err-resp "invalid_username" "Username is invalid")

        (some? (db.user/by-name db username))
        (err-resp "username_taken" "Username is already taken")

        (some? (db.user/by-phone db phone))
        (err-resp "phone_taken" "Phone is already taken")

        :else
        (let [user (db.user/create-user! ctx {:username username :phone phone})]
          (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_up")
          (json-response {:type "sign_up"
                          :user  (crdt.user/->value user)
                          :token (auth/create-auth-token ctx (:xt/id user))})))
      (err-resp "invalid_phone" "Invalid phone number"))
    (err-resp "invalid_username" "Invalid username")))

(defn clean-code [s] (-> s str/trim))

(defn twilio-to-response [v]
  {:id (:sid v)
   :status (:status v)
   :attempts (- 6 (count (:send_code_attempts v)))})

(defn verify-phone! [{:keys [params biff/db biff/secret] :as _ctx}]
  (let [{:keys [phone_number]} params
        phone (clean-phone phone_number)
        user  (crdt.user/->value (db.user/by-phone db phone))]
    (if (:user/deleted_at user)
      (err-resp "account_deleted" "Account deleted")
      (if-not (valid-phone? phone)
        (err-resp "invalid_phone" "Invalid phone number")
        (let [v (twilio/start-verification! secret {:phone phone})]
          (json-response (merge {:phone_number phone}
                                (twilio-to-response v)
                                (when user
                                  {:user user}))))))))

(defn verify-code! [{:keys [params biff/secret biff/db] :as ctx}]
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
                (posthog/identify! ctx user)
                (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_in")
                {:user  (crdt.user/->value user)
                 :token (auth/create-auth-token ctx (:xt/id user))}))))))

(defn check-username [{:keys [params biff/db] :as _ctx}]
  (let [{:keys [username]} params
        existing-user (db.user/by-name db username)]
    (json-response {:username (crdt.user/->value username)
                    :available (nil? existing-user)})))

(defn update-avatar! [{:keys [params] :as ctx}]
  (if-let [url (:file_url params)]
    (let [{:keys [user]} (db.user/update-avatar! ctx url)]
      (posthog/capture! ctx "user.update_avatar")
      (json-response {:user (crdt.user/->value user)}))
    (err-resp "invalid_file_url" "Invalid file url")))

(defn update-urls! [{:keys [params] :as ctx}]
  (if-let [ps (:urls params)]
    (let [user-links (cond-> {}
                       (string? (:twitter ps)) (assoc :settings.urls/twitter (:twitter ps))
                       (string? (:website ps)) (assoc :settings.urls/website (:website ps)))
          {:keys [user]} (db.user/edit-links! ctx user-links)]
      (posthog/capture! ctx "user.update_urls")
      (json-response {:user (crdt.user/->value user)}))
    (err-resp "invalid_user_links" "Invalid user links")))

(defn delete-account! [{:keys [auth/user-id] :as ctx}]
  (assert (uuid? user-id))
  (db.user/mark-deleted! ctx)
  (posthog/capture! ctx "user.delete_account")
  (json-response {:status "success"}))

(def block-user-params
  [:map
   [:contact_id uuid?]])

(defn strict-str->uuid [s]
  (let [out (mt/-string->uuid s)]
    (if (uuid? out) out nil)))

(defn parse-block-user-params [params]
  (cond-> params
    (some? (:contact_id params)) (update :contact_id strict-str->uuid)))

(defn block! [{:keys [auth/user-id biff/db] :as ctx}]
  (let [params (parse-block-user-params (:params ctx))]
    (if-let [to-be-blocked (some->> (:contact_id params)
                                    (db.user/by-id db))]
      (let [contact_id (:xt/id to-be-blocked)]
        (assert (not (= user-id contact_id)))
        (db.user/block-user! ctx contact_id)
        (posthog/capture! ctx "user.block")
        (json-response {:status "success"}))
      (err-resp "not_found" "User not found"))))

