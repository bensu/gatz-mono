(ns gatz.api.contacts
  (:require [clojure.data.json :as json]
            [clojure.set :as set]
            [com.biffweb :as biff]
            [crdt.core :as crdt]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [gatz.notify :as notify]
            [gatz.util :as util]
            [sdk.posthog :as posthog]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (-> {:type "error" :error err-type :message err-msg}
      (json-response)
      (assoc :status 400)))

(def get-contact-params
  [:map
   [:id uuid?]])

(def get-contact-response
  [:map
   [:contact schema/ContactResponse]
   ;; we show their_contacts temporarily while we are getting started
   [:their_contacts {:optional true} [:vec schema/ContactResponse]]
   [:contact_request_state [:enum schema/ContactRequestState]]
   [:settings {:optional true} [:map
                                [:posts_hidden boolean?]]]
   [:in_common [:map
                [:contacts [:vec schema/ContactResponse]]
                #_[:feed [:map
                          [:users [:vec schema/User]]
                          [:discussion [:vec schema/Discussion]]]]]]])

(defn strict-str->uuid [s]
  (let [out (util/parse-uuid s)]
    (if (uuid? out) out nil)))

(defn parse-contact-params [params]
  (cond-> params
    (some? (:id params)) (update :id strict-str->uuid)))

(defn get-contact [{:keys [auth/user auth/user-id biff/db] :as ctx}]
  (let [params (parse-contact-params (:params ctx))]
    (if-let [id (:id params)]
      (let [viewed-user (db.user/by-id db id)]
        (if (db.user/mutually-blocked? viewed-user user)
          (do
            (posthog/capture! ctx "contact.viewed" {:contact_id id :by user-id})
            (json-response
             {:contact (-> viewed-user crdt.user/->value db.contacts/->contact)
              :contact_request_state :contact_request/viewer_awaits_response
              :their_contacts []
              :in_common {:contacts  []}}))
          (let [their-contacts (db.contacts/by-uid db id)
                their-contacts-ids (:contacts/ids their-contacts)
                in-common-uids (db.contacts/get-in-common db user-id id)
                hidden-by-me? (contains? (:contacts/hidden_me their-contacts) user-id)
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
                                            (db.contacts/state-for user-id)))]
            (posthog/capture! ctx "contact.viewed" {:contact_id id :by user-id})
            (json-response
             {:contact (-> viewed-user crdt.user/->value db.contacts/->contact)
              :contact_request_state contact-request-state
              :settings {:posts_hidden hidden-by-me?}
              :their_contacts (mapv #(-> % crdt.user/->value db.contacts/->contact) their-contacts)
              :in_common {:contacts (->> contacts-in-common
                                         (mapv #(-> % crdt.user/->value db.contacts/->contact)))}}))))

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
   [:friends_of_friends [:vec schema/Contact]]
   [:group {:optional true} schema/Group]])

(defn get-all-contacts [{:keys [auth/user-id auth/user biff/db] :as ctx}]
  (let [{:keys [group_id]} (parse-get-contact-params (:params ctx))]
    (if group_id
      (let [group (db.group/by-id db group_id)
            contact-ids (:group/members group)
            group-contacts (mapv (partial db.user/by-id db) contact-ids)]
        (json-response {:user (crdt.user/->value user)
                        :contacts (mapv #(-> % crdt.user/->value db.contacts/->contact)
                                        group-contacts)
                        :friends_of_friends []
                        :group group}))
      (let [my-contact-ids (:contacts/ids (db.contacts/by-uid db user-id))
            my-contacts (->> my-contact-ids
                             (map (partial db.user/by-id db))
                             (mapv #(-> % crdt.user/->value db.contacts/->contact)))
            friends-of-friends (->> (-> (db.contacts/friends-of-friends db user-id)
                                        (set/difference my-contact-ids #{user-id}))
                                    (map (partial db.user/by-id db))
                                    (mapv #(-> % crdt.user/->value db.contacts/->contact)))]
        (json-response {:user (crdt.user/->value user)
                        :contacts my-contacts
                        :friends_of_friends friends-of-friends
                        :group nil})))))

;; ======================================================================
;; Contact request actions


;; export type ContactRequestActionType =
;; | "requested"
;; | "accepted"
;; | "ignored"
;; | "removed";

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

(defn handle-request! [{:keys [biff/db auth/user auth/user-id] :as ctx}]
  (let [{:keys [to action]} (parse-contact-request-params (:params ctx))]
    (cond
      (not (and to action)) (err-resp "invalid_params" "Invalid parameters")
      (= user-id to) (err-resp "invalid_params" "Invalid parameters")

      :else
      (let [from-user user
            to-user (db.user/by-id db to)
            _ (assert (not (db.user/mutually-blocked? from-user to-user)))
            {:keys [request]} (db.contacts/apply-request! ctx {:them to :action action})
            contact-request-state (db.contacts/state-for request user-id)]
        (when (= :contact_request/accepted contact-request-state)
          (when-let [notification (notify/friend-accepted (crdt.user/->value to-user)
                                                          (crdt.user/->value from-user))]
            (biff/submit-job ctx :notify/any {:notify/notifications [notification]})))
        (when-let [event-name (action->evt-name action)]
          (posthog/capture! ctx event-name {:contact_request_id (:id request)
                                            :by user-id
                                            :contact_id to}))
        (json-response {:status "success"
                        :state contact-request-state})))))

;; ======================================================================
;; Contact hide actions

(def hide-contact-params
  [:map
   [:contact_id schema/UserId]])

(defn parse-hide-contact-params [params]
  (cond-> params
    (some? (:contact_id params)) (update :contact_id strict-str->uuid)))

(defn hide! [{:keys [auth/user-id params] :as ctx}]
  (let [{:keys [contact_id]} (parse-hide-contact-params params)]
    (db.contacts/hide! ctx {:hidden-by user-id :hidden contact_id})
    (json-response {:status "success"})))

(defn unhide! [{:keys [auth/user-id params] :as ctx}]
  (let [{:keys [contact_id]} (parse-hide-contact-params params)]
    (db.contacts/unhide! ctx {:hidden-by user-id :hidden contact_id})
    (json-response {:status "success"})))
