(ns gatz.api.user
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [clojure.tools.logging :as log]
            [crdt.core :as crdt]
            [gatz.http :as http]
            [gatz.auth :as auth]
            [gatz.crdt.user :as crdt.user]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.location :as db.location]
            [gatz.db.user :as db.user]
            [gatz.flags :as flags]
            [gatz.schema :as schema]
            [gatz.util :as util]
            [medley.core :refer [map-keys]]
            [sdk.posthog :as posthog]
            [sdk.twilio :as twilio]
)
  (:import [java.util Date]))

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
   [:flags [:map
            [:values flags/values-schema]]]
   [:groups [:vec schema/Group]]
   [:contacts [:vec schema/ContactResponse]]
   [:contact_requests [:vec [:map
                             [:id schema/ContactRequestId]
                             [:contact schema/ContactResponse]]]]
   [:migration {:optional true} [:map
                                 [:required boolean?]
                                 [:auth_method [:enum "sms" "apple" "google" "email" "hybrid"]]
                                 [:show_migration_screen boolean?]
                                 [:completed_at [:maybe inst?]]]]])

(defn pending-contact-requests [db user-id]
  (->> (db.contacts/pending-requests-to db user-id)
       (mapv (fn [{:xt/keys [id] :contact_request/keys [from]}]
               {:id id
                :contact (-> (db.user/by-id db from)
                             crdt.user/->value
                             db.contacts/->contact)}))))

(defn migration-status
  "Calculate migration status for a user based on their auth_method and migration_completed_at fields"
  [user-value]
  (let [auth-method (:user/auth_method user-value)
        migration-completed-at (:user/migration_completed_at user-value)
        needs-migration? (and (= "sms" auth-method) 
                              (nil? migration-completed-at))
        show-migration-screen? needs-migration?]
    (when needs-migration?
      {:required true
       :auth_method auth-method
       :show_migration_screen show-migration-screen?
       :completed_at migration-completed-at})))

(defn get-me-data [{:keys [auth/user auth/user-id biff/db flags/flags] :as _ctx}]
  (let [my-contacts (db.contacts/by-uid db user-id)
        groups (db.group/by-member-uid db user-id)
        contacts (->> (:contacts/ids my-contacts)
                      (remove (partial = user-id))
                      (mapv (fn [uid]
                              (-> (db.user/by-id db uid)
                                  crdt.user/->value
                                  db.contacts/->contact))))
        contact_requests (pending-contact-requests db user-id)
        user-value (crdt.user/->value user)
        migration-status-obj (migration-status user-value)]
    (cond-> {:user user-value
             :groups groups
             :contacts contacts
             :contact_requests contact_requests
             :flags {:flags/values flags}}
      migration-status-obj (assoc :migration migration-status-obj))))

(defn get-me [{:keys [auth/user] :as ctx}]
  (posthog/identify! ctx user)
  (http/ok ctx (get-me-data ctx)))

(defn get-me-crdt [{:keys [auth/user] :as ctx}]
  (posthog/identify! ctx user)
  (http/ok ctx {:user user}))

(defn post-me-crdt [{:keys [body-params] :as ctx}]
  (let [action (:action body-params)
        {:keys [user]} (db.user/apply-action! ctx action)]
    (http/ok ctx {:user user})))

(defn get-user
  [{:keys [params biff/db] :as _ctx}]
  (if-let [user-id (some-> (:id params) util/parse-uuid)]
    (if-let [user (db.user/by-id db user-id)]
      (json-response {:user (-> user crdt.user/->value db.contacts/->contact (dissoc :user/profile))})
      (err-resp "user_not_found" "User not found"))
    (err-resp "invalid_params" "Invalid parameters")))

(defn add-push-token! [{:keys [params] :as ctx}]
  (if-let [push-token (:push_token params)]
    (let [new-token {:push/service :push/expo
                     :push/token push-token
                     :push/created_at (Date.)}
          {:keys [user]} (db.user/add-push-token! ctx {:push-token {:push/expo new-token}})]
      (posthog/capture! ctx "notifications.add_push_token")
      (json-response {:status "success"
                      :user (crdt.user/->value user)}))
    (err-resp "push_token_missing" "Missing push token parameter")))

;; TODO: this is not it
(def mark-location-params
  [:map
   [:location_id uuid?]])

(defn mark-location! [{:keys [params auth/user-id biff/db] :as ctx}]
  (if-let [new-location (db.location/params->location (:location params))]
    (let [last-location (some->> (db.user/activity-by-uid db user-id)
                                 (crdt/-value)
                                 :user_activity/last_location)]
      (db.user/mark-location! ctx {:location_id (:location/id new-location)
                                   :now (Date.)})
      (posthog/capture! ctx "user.mark_location")
      (if (nil? last-location)
        (json-response {})
        (if (= (:location/id last-location) (:location/id new-location))
          (json-response {})
          (json-response {:location new-location
                          :in_common {:friends []
                                      :friends_of_friends []}}))))
    (json-response {})))

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

(defn params->location-settings [{:keys [enabled]}]
  (cond-> {}
    (boolean? enabled) (assoc :settings.location/enabled enabled)))

(defn update-location-settings! [{:keys [params] :as ctx}]
  (let [location-settings (params->location-settings params)
        {:keys [user]} (db.user/update-location-settings! ctx location-settings)]
    (json-response {:user (crdt.user/->value user)})))

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
          (posthog/identify! ctx user)
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
        user  (some-> (db.user/by-phone db phone) crdt.user/->value)]
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
    (json-response {:username username
                    :available (nil? existing-user)})))

(defn update-avatar! [{:keys [params] :as ctx}]
  (if-let [url (:file_url params)]
    (let [{:keys [user]} (db.user/update-avatar! ctx url)]
      (posthog/capture! ctx "user.update_avatar")
      (json-response {:user (crdt.user/->value user)}))
    (err-resp "invalid_file_url" "Invalid file url")))

(defn valid-website-url? [url]
  (boolean
   (and (string? url)
        (try
          (let [uri (java.net.URI. url)]
            (and (contains? #{"http" "https"} (.getScheme uri))
                 (not (str/blank? (.getHost uri)))))
          (catch Exception _
            false)))))

(defn valid-twitter-handle? [handle]
  (boolean
   (and (string? handle)
        (re-matches #"^[A-Za-z0-9_]{1,15}$" handle))))

(defn valid-full-name? [full-name]
  (boolean
   (and (string? full-name)
        (not-empty full-name))))

(defn parse-profile [params]
  (let [full-name (:full_name params)
        {:keys [twitter website]} (:urls params)
        full-name (some-> full-name (str/trim))
        website (some-> website (str/trim) (str/lower-case))
        twitter (some-> twitter
                        (str/lower-case)
                        (str/trim)
                        (str/replace-first #"^@" ""))
        user-links (cond-> {}
                     (string? twitter) (assoc :profile.urls/twitter twitter)
                     (string? website) (assoc :profile.urls/website website))]
    (cond-> {}
      (not (empty? user-links)) (assoc :profile/urls user-links)
      (not (empty? full-name)) (assoc :profile/full_name full-name))))

(defn update-profile! [{:keys [params] :as ctx}]
  (let [profile (parse-profile params)
        full-name (:profile/full_name profile)
        {:profile.urls/keys [twitter website]} (:profile/urls profile)]
    (cond
      (and (some? twitter) (not (valid-twitter-handle? twitter)))
      (err-resp "invalid_twitter" "Invalid Twitter username")

      (and (some? website) (not (valid-website-url? website)))
      (err-resp "invalid_website" "Invalid website URL")

      (and (some? full-name) (not (valid-full-name? full-name)))
      (err-resp "invalid_full_name" "Invalid full name")

      :else
      (let [{:keys [user]} (db.user/edit-profile! ctx profile)]
        (posthog/capture! ctx "user.update_profile")
        (json-response {:user (crdt.user/->value user)})))))

(defn ^:deprecated
  update-urls!
  [{:keys [params] :as ctx}]
  (let [profile (parse-profile params)
        ;; full-name (:profile/full_name profile)
        {:profile.urls/keys [twitter website]} (:profile/urls profile)]
    (cond
      (and (some? twitter) (not (valid-twitter-handle? twitter)))
      (err-resp "invalid_twitter" "Invalid Twitter username")

      (and (some? website) (not (valid-website-url? website)))
      (err-resp "invalid_website" "Invalid website URL")

      :else
      (let [{:keys [user]} (db.user/edit-profile! ctx profile)]
        (posthog/capture! ctx "user.update_urls")
        (json-response {:user (crdt.user/->value user)})))))

(defn delete-account! [{:keys [biff/db auth/user-id] :as ctx}]
  (let [owner-groups (->> (db.group/by-member-uid db user-id)
                          (filter #(= user-id (:group/owner %))))]
    (if-not (empty? owner-groups)
      (err-resp "account_admin" "You can't delete your account because you are an admin of at least one group")
      (do
        (db/delete-user! ctx user-id)
        (posthog/capture! ctx "user.delete_account")
        (json-response {:status "success"})))))

(def block-user-params
  [:map
   [:contact_id uuid?]])

(defn strict-str->uuid [s]
  (let [out (util/parse-uuid s)]
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

;; ======================================================================  
;; Apple Sign-In Authentication

(defn apple-sign-in! 
  "Handle Apple Sign-In authentication for new users"
  [{:keys [params biff/db] :as ctx}]
  (let [{:keys [id_token client_id]} params]
    (cond
      ;; Validate required parameters
      (str/blank? id_token)
      (err-resp "missing_id_token" "Apple ID token is required")
      
      (str/blank? client_id)
      (err-resp "missing_client_id" "Apple client ID is required")
      
      ;; Check signup disabled flag
      (:gatz.auth/signup-disabled? ctx)
      (err-resp "signup_disabled" "Sign up is disabled right now")
      
      :else
      (try
        (let [claims (auth/verify-apple-id-token id_token {:client-id client_id})
              apple-id (:sub claims)
              email (:email claims)
              existing-user (db.user/by-apple-id db apple-id)]
          
          ;; Check if user account is deleted
          (when (and existing-user (db.user/deleted? existing-user))
            (throw (ex-info "Account deleted" {:type :account-deleted})))
          
          (if existing-user
            ;; User exists, return auth token
            (do
              (posthog/identify! ctx existing-user)
              (posthog/capture! (assoc ctx :auth/user-id (:xt/id existing-user)) "user.sign_in")
              (json-response {:user (crdt.user/->value existing-user)
                              :token (auth/create-auth-token ctx (:xt/id existing-user))}))
            
            ;; New user - return success without creating user, let frontend handle sign-up
            (json-response {:requires_signup true
                            :apple_id apple-id
                            :email email
                            :full_name (:name claims)})))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              :duplicate-apple-id (err-resp "apple_id_taken" "This Apple ID is already registered")
              :duplicate-email (err-resp "email_taken" "This email is already registered")
              (err-resp "apple_auth_failed" (.getMessage e)))))
        
        (catch Exception e
          (err-resp "apple_auth_failed" "Apple Sign-In authentication failed"))))))

(defn link-apple! [{:keys [params auth/user-id biff/db] :as ctx}]
  "Link Apple Sign-In to an existing user account"
  (let [{:keys [id_token client_id]} params]
    (log/info "link-apple called with user-id:" user-id "client_id:" client_id)
    (cond
      ;; Validate required parameters
      (str/blank? id_token)
      (do
        (log/warn "link-apple: missing id_token")
        (err-resp "missing_id_token" "Apple ID token is required"))
      
      (str/blank? client_id)
      (do
        (log/warn "link-apple: missing client_id")
        (err-resp "missing_client_id" "Apple client ID is required"))
      
      :else
      (try
        (log/info "link-apple: attempting to verify Apple ID token")
        (let [claims (auth/verify-apple-id-token id_token {:client-id client_id})
              apple-id (:sub claims)
              existing-apple-user (db.user/by-apple-id db apple-id)
              current-user (db.user/by-id db user-id)]
          
          ;; Check if current user account is deleted
          (when (db.user/deleted? current-user)
            (throw (ex-info "Account deleted" {:type :account-deleted})))
          
          (cond
            ;; Apple ID already linked to another account
            (and existing-apple-user (not (= (:xt/id existing-apple-user) user-id)))
            (err-resp "apple_id_taken" "This Apple ID is already linked to another account")
            
            ;; Apple ID already linked to current account
            (and existing-apple-user (= (:xt/id existing-apple-user) user-id))
            (json-response {:status "already_linked"
                            :user (crdt.user/->value existing-apple-user)})
            
            ;; Link Apple ID to current account
            :else
            (let [{:keys [user]} (db.user/link-apple-id! ctx {:apple-id apple-id
                                                              :email (:email claims)})]
              (posthog/capture! ctx "user.link_apple")
              (json-response {:status "linked"
                              :user (crdt.user/->value user)}))))
        
        (catch clojure.lang.ExceptionInfo e
          (log/error "link-apple ExceptionInfo:" (.getMessage e) "data:" (ex-data e))
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              (err-resp "apple_link_failed" (.getMessage e)))))
        
        (catch Exception e
          (log/error "link-apple Exception:" (.getMessage e))
          (err-resp "apple_link_failed" "Failed to link Apple Sign-In"))))))

(defn apple-sign-up! [{:keys [params biff/db] :as ctx}]
  "Create a new user with Apple Sign-In and username"
  (let [{:keys [id_token client_id username]} params]
    (cond
      ;; Validate required parameters
      (str/blank? id_token)
      (err-resp "missing_id_token" "Apple ID token is required")
      
      (str/blank? client_id)
      (err-resp "missing_client_id" "Apple client ID is required")
      
      (str/blank? username)
      (err-resp "missing_username" "Username is required")
      
      ;; Check signup disabled flag
      (:gatz.auth/signup-disabled? ctx)
      (err-resp "signup_disabled" "Sign up is disabled right now")
      
      :else
      (try
        (let [claims (auth/verify-apple-id-token id_token {:client-id client_id})
              apple-id (:sub claims)
              email (:email claims)
              clean-username (clean-username username)
              existing-user (db.user/by-apple-id db apple-id)]
          
          ;; Validate username
          (cond
            (not (crdt.user/valid-username? clean-username))
            (err-resp "invalid_username" "Username is invalid")
            
            (some? (db.user/by-name db clean-username))
            (err-resp "username_taken" "Username is already taken")
            
            (some? existing-user)
            (err-resp "apple_id_taken" "This Apple ID is already registered")
            
            :else
            ;; Create new user with Apple authentication and username
            (let [user (db.user/create-apple-user! ctx {:apple-id apple-id
                                                        :email email
                                                        :full-name (:name claims)
                                                        :username clean-username})]
              (posthog/identify! ctx user)
              (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_up")
              (json-response {:type "sign_up"
                              :user (crdt.user/->value user)
                              :token (auth/create-auth-token ctx (:xt/id user))}))))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              :duplicate-apple-id (err-resp "apple_id_taken" "This Apple ID is already registered")
              :duplicate-email (err-resp "email_taken" "This email is already registered")
              :duplicate-username (err-resp "username_taken" "Username is already taken")
              (err-resp "apple_auth_failed" (.getMessage e)))))
        
        (catch Exception e
          (err-resp "apple_auth_failed" "Apple Sign-In authentication failed"))))))

;; ======================================================================  
;; Google Sign-In Authentication

(defn google-sign-in! [{:keys [params biff/db] :as ctx}]
  "Handle Google Sign-In authentication for new users"
  (let [{:keys [id_token client_id]} params]
    (cond
      ;; Validate required parameters
      (str/blank? id_token)
      (err-resp "missing_id_token" "Google ID token is required")
      
      (str/blank? client_id)
      (err-resp "missing_client_id" "Google client ID is required")
      
      ;; Check signup disabled flag
      (:gatz.auth/signup-disabled? ctx)
      (err-resp "signup_disabled" "Sign up is disabled right now")
      
      :else
      (try
        (let [claims (auth/verify-google-id-token id_token {:client-id client_id})
              google-id (:sub claims)
              email (:email claims)
              existing-user (db.user/by-google-id db google-id)]
          
          ;; Check if user account is deleted
          (when (and existing-user (db.user/deleted? existing-user))
            (throw (ex-info "Account deleted" {:type :account-deleted})))
          
          (if existing-user
            ;; User exists, return auth token
            (do
              (posthog/identify! ctx existing-user)
              (posthog/capture! (assoc ctx :auth/user-id (:xt/id existing-user)) "user.sign_in")
              (json-response {:user (crdt.user/->value existing-user)
                              :token (auth/create-auth-token ctx (:xt/id existing-user))}))
            
            ;; Create new user with Google authentication
            (let [user (db.user/create-google-user! ctx {:google-id google-id
                                                         :email email
                                                         :full-name (:name claims)})]
              (posthog/identify! ctx user)
              (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_up")
              (json-response {:type "sign_up"
                              :user (crdt.user/->value user)
                              :token (auth/create-auth-token ctx (:xt/id user))}))))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              :duplicate-google-id (err-resp "google_id_taken" "This Google account is already registered")
              :duplicate-email (err-resp "email_taken" "This email is already registered")
              (err-resp "google_auth_failed" (.getMessage e)))))
        
        (catch Exception e
          (err-resp "google_auth_failed" "Google Sign-In authentication failed"))))))

(defn link-google! [{:keys [params auth/user-id biff/db] :as ctx}]
  "Link Google Sign-In to an existing user account"
  (let [{:keys [id_token client_id]} params]
    (cond
      ;; Validate required parameters
      (str/blank? id_token)
      (err-resp "missing_id_token" "Google ID token is required")
      
      (str/blank? client_id)
      (err-resp "missing_client_id" "Google client ID is required")
      
      :else
      (try
        (let [claims (auth/verify-google-id-token id_token {:client-id client_id})
              google-id (:sub claims)
              existing-google-user (db.user/by-google-id db google-id)
              current-user (db.user/by-id db user-id)]
          
          ;; Check if current user account is deleted
          (when (db.user/deleted? current-user)
            (throw (ex-info "Account deleted" {:type :account-deleted})))
          
          (cond
            ;; Google ID already linked to another account
            (and existing-google-user (not (= (:xt/id existing-google-user) user-id)))
            (err-resp "google_id_taken" "This Google account is already linked to another account")
            
            ;; Google ID already linked to current account
            (and existing-google-user (= (:xt/id existing-google-user) user-id))
            (json-response {:status "already_linked"
                            :user (crdt.user/->value existing-google-user)})
            
            ;; Link Google ID to current account
            :else
            (let [{:keys [user]} (db.user/link-google-id! ctx {:google-id google-id
                                                               :email (:email claims)})]
              (posthog/capture! ctx "user.link_google")
              (json-response {:status "linked"
                              :user (crdt.user/->value user)}))))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              (err-resp "google_link_failed" (.getMessage e)))))
        
        (catch Exception e
          (err-resp "google_link_failed" "Failed to link Google Sign-In"))))))

;; ======================================================================  
;; Email Verification Authentication

(defn send-email-code! 
  "Send email verification code for authentication"
  [{:keys [params biff/db] :as ctx}]
  (let [{:keys [email]} params]
    (cond
      ;; Validate required parameters
      (str/blank? email)
      (err-resp "missing_email" "Email address is required")
      
      (not (auth/valid-email? email))
      (err-resp "invalid_email" "Invalid email address format")
      
      ;; Check rate limiting
      (auth/rate-limit-exceeded? db email)
      (err-resp "rate_limited" "Too many verification attempts. Please try again later")
      
      :else
      (try
        (let [result (auth/create-verification-code! ctx email)]
          (log/info "Email verification code sent successfully to" email)
          (json-response result))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :invalid-email (err-resp "invalid_email" "Invalid email address format")
              :suspicious-email (err-resp "suspicious_email" "Email address not allowed")
              :rate-limit-exceeded (err-resp "rate_limited" "Too many verification attempts. Please try again later")
              :ip-rate-limit-exceeded (err-resp "rate_limited" "Too many verification attempts from this location")
              :too-soon (err-resp "too_soon" "Please wait before requesting another code")
              (err-resp "email_send_failed" (.getMessage e)))))
        
        (catch Exception e
          (log/error "Failed to send email verification code:" (.getMessage e))
          (err-resp "email_send_failed" "Failed to send verification email"))))))

(defn verify-email-code! 
  "Verify email code for authentication"
  [{:keys [params biff/db] :as ctx}]
  (let [{:keys [email code]} params]
    (cond
      ;; Validate required parameters
      (str/blank? email)
      (err-resp "missing_email" "Email address is required")
      
      (str/blank? code)
      (err-resp "missing_code" "Verification code is required")
      
      (not (auth/valid-email? email))
      (err-resp "invalid_email" "Invalid email address format")
      
      :else
      (try
        (let [result (auth/verify-email-code! ctx email code)]
          (log/info "Email code verification result for" email ":" (:status result))
          
          (if (= "approved" (:status result))
            ;; Code verified successfully - check if user exists or needs signup
            (if-let [user (db.user/by-email db email)]
              ;; Existing user - sign them in
              (do
                (posthog/identify! ctx user)
                (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_in")
                (json-response {:user (crdt.user/->value user)
                                :token (auth/create-auth-token ctx (:xt/id user))}))
              
              ;; New user - return success without creating user, let frontend handle sign-up
              (json-response {:requires_signup true
                              :email email}))
            
            ;; Code verification failed
            (json-response result 400)))
        
        (catch Exception e
          (log/error "Failed to verify email code:" (.getMessage e))
          (err-resp "verification_failed" "Failed to verify email code"))))))

(defn link-email! 
  "Link email to an existing user account"
  [{:keys [params auth/user-id biff/db] :as ctx}]
  (let [{:keys [email code]} params]
    (log/info "link-email called with user-id:" user-id "email:" email)
    (cond
      ;; Validate required parameters
      (str/blank? email)
      (do
        (log/warn "link-email: missing email")
        (err-resp "missing_email" "Email address is required"))
      
      (str/blank? code)
      (do
        (log/warn "link-email: missing code")
        (err-resp "missing_code" "Verification code is required"))
      
      (not (auth/valid-email? email))
      (err-resp "invalid_email" "Invalid email address format")
      
      :else
      (try
        (log/info "link-email: attempting to verify email code")
        (let [verification-result (auth/verify-email-code! ctx email code)]
          
          (if (= "approved" (:status verification-result))
            (let [existing-email-user (db.user/by-email db email)
                  current-user (db.user/by-id db user-id)]
              
              ;; Check if current user account is deleted
              (when (db.user/deleted? current-user)
                (throw (ex-info "Account deleted" {:type :account-deleted})))
              
              (cond
                ;; Email already linked to another account
                (and existing-email-user (not (= (:xt/id existing-email-user) user-id)))
                (err-resp "email_taken" "This email is already linked to another account")
                
                ;; Email already linked to current account
                (and existing-email-user (= (:xt/id existing-email-user) user-id))
                (json-response {:status "already_linked"
                                :user (crdt.user/->value existing-email-user)})
                
                ;; Link email to current account
                :else
                (let [{:keys [user]} (db.user/link-email! ctx {:email email})]
                  (posthog/capture! ctx "user.link_email")
                  (json-response {:status "linked"
                                  :user (crdt.user/->value user)}))))
            
            ;; Code verification failed
            (json-response verification-result 400)))
        
        (catch clojure.lang.ExceptionInfo e
          (log/error "link-email ExceptionInfo:" (.getMessage e) "data:" (ex-data e))
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              (err-resp "email_link_failed" (.getMessage e)))))
        
        (catch Exception e
          (log/error "link-email Exception:" (.getMessage e))
          (err-resp "email_link_failed" "Failed to link email"))))))

(defn email-sign-up! 
  "Create a new user with email authentication"
  [{:keys [params biff/db] :as ctx}]
  (let [{:keys [email username]} params]
    (cond
      ;; Validate required parameters
      (str/blank? email)
      (err-resp "missing_email" "Email address is required")
      
      (str/blank? username)
      (err-resp "missing_username" "Username is required")
      
      (not (auth/valid-email? email))
      (err-resp "invalid_email" "Invalid email address format")
      
      ;; Check signup disabled flag
      (:gatz.auth/signup-disabled? ctx)
      (err-resp "signup_disabled" "Sign up is disabled right now")
      
      :else
      (try
        (let [clean-username (clean-username username)
              clean-email (auth/clean-email email)
              existing-user (db.user/by-email db clean-email)]
          
          ;; Validate username
          (cond
            (not (crdt.user/valid-username? clean-username))
            (err-resp "invalid_username" "Username is invalid")
            
            (some? (db.user/by-name db clean-username))
            (err-resp "username_taken" "Username is already taken")
            
            (some? existing-user)
            (err-resp "email_taken" "This email is already registered")
            
            :else
            ;; Create new user with email authentication and username
            (let [user (db.user/create-email-user! ctx {:email clean-email
                                                        :username clean-username})]
              (posthog/identify! ctx user)
              (posthog/capture! (assoc ctx :auth/user-id (:xt/id user)) "user.sign_up")
              (json-response {:type "sign_up"
                              :user (crdt.user/->value user)
                              :token (auth/create-auth-token ctx (:xt/id user))}))))
        
        (catch clojure.lang.ExceptionInfo e
          (let [ex-data (ex-data e)]
            (case (:type ex-data)
              :account-deleted (err-resp "account_deleted" "Account deleted")
              :duplicate-email (err-resp "email_taken" "This email is already registered")
              :duplicate-username (err-resp "username_taken" "Username is already taken")
              (err-resp "email_auth_failed" (.getMessage e)))))
        
        (catch Exception e
          (err-resp "email_auth_failed" "Email authentication failed"))))))

