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

(def contact-ks [:xt/id :user/name :user/avatar])

(def ContactResponse
  (mu/select-keys schema/User contact-ks))

(defn ->contact [u] (select-keys u contact-ks))

(def get-contact-response
  [:map
   [:contact ContactResponse]
   [:contact_request_state [:enum db.contacts/contact-request-state-schema]]
   [:in_common [:map
                [:contacts [:vec ContactResponse]]]]])

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
        (json-response {:contact  (-> viewed-user crdt.user/->value ->contact)
                        :contact_request_state (db.contacts/state-for viewed-contacts user-id)
                        :in_common {:contacts (mapv #(-> % crdt.user/->value ->contact)
                                                    users-in-common)}}))

      (err-resp "invalid_params" "Invalid params"))))