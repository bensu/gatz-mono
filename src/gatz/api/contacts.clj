(ns gatz.api.contacts
  (:require [clojure.data.json :as json]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [malli.util :as mu]
            [malli.transform :as mt]))

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
   [:contact_request_state [:enum db.contacts/contact-request-state-schema]]
   [:in_common [:map
                [:contacts [:vec schema/ContactResponse]]]]])

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
            viewed-contacts (db.contacts/by-uid db id)
            my-contacts (db.contacts/by-uid db user-id)
            in-common-uids (db.contacts/in-common my-contacts viewed-contacts)
            users-in-common (mapv (partial db.user/by-id db) in-common-uids)]
        (json-response {:contact (-> viewed-user crdt.user/->value db.contacts/->contact)
                        :contact_request_state (db.contacts/state-for viewed-contacts user-id)
                        :in_common {:contacts (mapv #(-> % crdt.user/->value db.contacts/->contact)
                                                    users-in-common)}}))

      (err-resp "invalid_params" "Invalid params"))))


;; export type ContactRequestActionType =
;; | "request"
;; | "accept"
;; | "ignore"
;; | "remove";


(def contact-request-actions-schema
  [:enum
   :contact_request/request
   :contact_request/accept
   :contact_request/ignore
   :contact_request/remove])

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

(defn handle-request! [{:keys [auth/user-id] :as ctx}]
  (let [{:keys [to action]} (parse-contact-request-params (:params ctx))]
    (cond
      (not (and to action)) (err-resp "invalid_params" "Invalid parameters")
      (= user-id to) (err-resp "invalid_params" "Invalid parameters")

      :else
      (let [{:keys [to-contacts]}
            (db.contacts/apply-request! ctx {:from user-id :to to :action action})
            contact-request-state (db.contacts/state-for to-contacts user-id)]
        (json-response {:status "success"
                        :state contact-request-state})))))