(ns gatz.api.user
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [gatz.http :as http]
            [gatz.auth :as auth]
            [gatz.crdt.user :as crdt.user]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.flags :as flags]
            [gatz.schema :as schema]
            [gatz.util :as util]
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
   [:flags [:map
            [:values flags/values-schema]]]
   [:groups [:vec schema/Group]]
   [:contacts [:vec schema/ContactResponse]]
   [:contact_requests [:vec [:map
                             [:id schema/ContactRequestId]
                             [:contact schema/ContactResponse]]]]])

(defn pending-contact-requests [db user-id]
  (->> (db.contacts/pending-requests-to db user-id)
       (mapv (fn [{:xt/keys [id] :contact_request/keys [from]}]
               {:id id
                :contact (-> (db.user/by-id db from)
                             crdt.user/->value
                             db.contacts/->contact)}))))

(defn get-me-data [{:keys [auth/user auth/user-id biff/db flags/flags] :as _ctx}]
  (let [my-contacts (db.contacts/by-uid db user-id)
        groups (db.group/by-member-uid db user-id)
        contacts (->> (:contacts/ids my-contacts)
                      (remove (partial = user-id))
                      (mapv (fn [uid]
                              (-> (db.user/by-id db uid)
                                  crdt.user/->value
                                  db.contacts/->contact))))
        contact_requests (pending-contact-requests db user-id)]
    {:user (crdt.user/->value user)
     :groups groups
     :contacts contacts
     :contact_requests contact_requests
     :flags {:flags/values flags}}))

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

