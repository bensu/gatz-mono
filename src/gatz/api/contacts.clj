(ns gatz.api.contacts
  (:require [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.schema :as schema]
            [malli.transform :as mt]
            [sdk.posthog :as posthog]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))

(def get-contact-params
  [:map
   [:id uuid?]])

(def get-contact-response
  [:map
   [:contact schema/ContactResponse]
   ;; we show their_contacts temporarily while we are getting started
   [:their_contacts {:optional true} [:vec schema/ContactResponse]]
   [:contact_request_state [:enum schema/ContactRequestState]]
   [:in_common [:map
                [:contacts [:vec schema/ContactResponse]]
                #_[:feed [:map
                          [:users [:vec schema/User]]
                          [:discussion [:vec schema/Discussion]]]]]]])

(defn strict-str->uuid [s]
  (let [out (mt/-string->uuid s)]
    (if (uuid? out) out nil)))

(defn parse-contact-params [params]
  (cond-> params
    (some? (:id params)) (update :id strict-str->uuid)))

(defn get-contact [{:keys [auth/user-id biff/db] :as ctx}]
  (let [params (parse-contact-params (:params ctx))]
    (if-let [id (:id params)]
      (let [viewed-user (db.user/by-id db id)
            their-contacts-ids (:contacts/ids (db.contacts/by-uid db id))
            in-common-uids (db.contacts/get-in-common db user-id id)
            already-my-contact? (contains? their-contacts-ids user-id)
            their-contacts (->> their-contacts-ids
                                (remove (partial contains? in-common-uids))
                                (remove (partial = user-id))
                                (mapv (partial db.user/by-id db)))
            contacts-in-common (->> in-common-uids
                                    (mapv (partial db.user/by-id db)))
            contact-request-state (if already-my-contact?
                                    :contact_request/accepted
                                    (-> (db.contacts/current-request-between db user-id id)
                                        (db.contacts/state-for user-id)))
           ;; posts-in-common (->> (db.discussion/posts-in-common db user-id id)
            ;;                      (map (partial db.discussion/by-id db))
            ;;                      (mapv crdt.discussion/->value))
            ;; users (->> posts-in-common
            ;;            (mapcat :discussion/members)
            ;;            set
            ;;            (map (partial db.user/by-id db))
            ;;            (mapv crdt.user/->value))
            ]
            ;; (db.contacts/pending-requests-from-to db id user-id)
        (posthog/capture! ctx "contact.viewed" {:contact_id id :by user-id})
        (json-response
         {:contact (-> viewed-user crdt.user/->value db.contacts/->contact)
          :contact_request_state contact-request-state
          :their_contacts (mapv #(-> % crdt.user/->value db.contacts/->contact) their-contacts)
          :in_common {:contacts (->> contacts-in-common
                                     (mapv #(-> % crdt.user/->value db.contacts/->contact)))
                      ;; :feed {:users users
                      ;;        :discussions posts-in-common}
                      }}))

      (err-resp "invalid_params" "Invalid params"))))

(def get-contact-params
  [:map
   [:group_id {:optional true} schema/ulid?]])

(defn parse-get-contact-params
  [{:keys [group_id]}]
  (cond-> {}
    (some? group_id) (assoc :group_id (crdt/parse-ulid group_id))))

(def get-all-contacts-response
  [:map
   [:contacts [:vec schema/ContactResponse]]
   [:group {:optional true} schema/Group]])

(defn get-all-contacts [{:keys [auth/user-id biff/db] :as ctx}]
  (let [{:keys [group_id]} (parse-get-contact-params (:params ctx))]
    (if group_id
      (let [group (db.group/by-id db group_id)
            contact-ids (:group/members group)
            group-contacts (mapv (partial db.user/by-id db) contact-ids)]
        (json-response {:contacts (mapv #(-> % crdt.user/->value db.contacts/->contact)
                                        group-contacts)
                        :group group}))
      (let [my-contact-ids (:contacts/ids (db.contacts/by-uid db user-id))
            my-contacts (mapv (partial db.user/by-id db) my-contact-ids)]
        (json-response {:contacts (mapv #(-> % crdt.user/->value db.contacts/->contact)
                                        my-contacts)
                        :group nil})))))

;; ======================================================================
;; Contact request actions


;; export type ContactRequestActionType =
;; | "request"
;; | "accept"
;; | "ignore"
;; | "remove";

(def contact-request-actions-schema
  [:enum
   :contact_request/requested
   :contact_request/accepted
   :contact_request/ignored
   :contact_request/removed])

(def contact-request-actions
  (set (rest contact-request-actions-schema)))

(def contact-request-params
  [:map
   [:to schema/UserId]
   [:action contact-request-actions-schema]])

(defn parse-contact-request-action [s]
  {:pre [(string? s)]
   :post [(or (nil? %)
              (contains? contact-request-actions %))]}
  (let [k (keyword "contact_request" s)]
    (when (contains? contact-request-actions k) k)))

(defn parse-contact-request-params [params]
  (cond-> params
    (some? (:to params)) (update :to strict-str->uuid)
    (some? (:action params)) (update :action parse-contact-request-action)))

(defn action->evt-name [action]
  (case action
    :contact_request/requested "contact.requested"
    :contact_request/accepted "contact.accepted"
    :contact_request/ignored "contact.ignored"
    :contact_request/removed "contact.removed"
    nil))

(defn handle-request! [{:keys [auth/user-id] :as ctx}]
  (let [{:keys [to action]} (parse-contact-request-params (:params ctx))]
    (cond
      (not (and to action)) (err-resp "invalid_params" "Invalid parameters")
      (= user-id to) (err-resp "invalid_params" "Invalid parameters")

      :else
      (let [{:keys [request]} (db.contacts/apply-request! ctx {:them to :action action})
            contact-request-state (db.contacts/state-for request user-id)]
        (when-let [event-name (action->evt-name action)]
          (posthog/capture! ctx event-name {:contact_request_id (:id request)
                                            :by user-id
                                            :contact_id to}))
        (json-response {:status "success"
                        :state contact-request-state})))))

(defn post-invite-link [{:keys [auth/user-id] :as ctx}]
  (assert user-id "The user should be authenticated by now")
  (let [invite-link (db.invite-link/create! ctx {:uid user-id
                                                 :type :invite_link/contact})
        link-id (:xt/id invite-link)]
    (json-response {:url (db.invite-link/make-url ctx link-id)})))

