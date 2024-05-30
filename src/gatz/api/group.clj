(ns gatz.api.group
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [clojure.set :as set]
            [crdt.core :as crdt]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [malli.transform :as mt]
            [malli.core :as m]
            [sdk.posthog :as posthog])
  (:import [java.util Date]))


(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  {:status 400
   :headers {"Content-Type" "application/json"}
   :body (json/write-str {:type "error" :error err-type :message err-msg})})


(def get-group-params
  [:map
   [:id crdt/ulid?]])

(def get-group-response
  [:map
   [:group schema/Group]
   [:all_contacts [:vec schema/ContactResponse]]
   [:in_common [:map
                [:contact_ids [:vec schema/UserId]]]]])

(defn strict-str->uuid [s]
  (let [out (mt/-string->uuid s)]
    (if (uuid? out) out nil)))

(defn parse-group-params [params]
  (cond-> params
    (some? (:id params)) (update :id crdt/parse-ulid)))

(defn get-group [{:keys [auth/user-id biff/db] :as ctx}]
  (let [params (parse-group-params (:params ctx))]
    (if-let [id (:id params)]
      (if-let [group (db.group/by-id db id)]
        (if (contains? (:group/members group) user-id)
          (let [member-ids (:group/members group)
                my-contacts (db.contacts/by-uid db user-id)
                my-contact-ids (:contacts/ids my-contacts)
                all-contact-ids (set/union member-ids my-contact-ids)
                in-common (set/intersection member-ids my-contact-ids)
                all-contacts (mapv (comp db.contacts/->contact
                                         crdt.user/->value
                                         (partial db.user/by-id db))
                                   all-contact-ids)]
            (posthog/capture! ctx "group.viewed" {:id id})
            (json-response {:group group
            ;; should this include me?
                            :all_contacts all-contacts
                            :in_common {:contact_ids in-common}}))
          (err-resp "not_found" "Group not found"))
        (err-resp "not_found" "Group not found"))
      (err-resp "invalid_params" "Invalid params"))))

;; ======================================================================
;; Create group

(def create-group-params
  [:map
   [:name string?]
   [:description {:optional true} string?]
   [:avatar {:optional true} string?]])

(def create-group-response
  [:map
   [:group schema/Group]])

;; TODO:
(defn parse-url [s]
  (if (str/blank? s)
    nil
    s))

(defn parse-create-group [{:keys [name description avatar]}]
  (cond-> {}
    (string? name)        (assoc :group/name (str/trim name))
    (string? description) (assoc :group/description (str/trim description))
    (string? avatar)      (assoc :group/avatar (parse-url avatar))))


(defn create! [{:keys [auth/user-id] :as ctx}]
  (let [params (parse-create-group (:params ctx))
        group (db.group/create! ctx {:owner user-id
                                     :members #{}
                                     :name (:group/name params)
                                     :description (:group/description params)
                                     :avatar (:group/avatar params)})]
    (posthog/capture! ctx "group.created" {:id (:xt/id group)})
    (json-response {:group group})))

;; ======================================================================
;; Handle request

(def group-request-params
  [:map
   [:id schema/GroupId]
   [:action db.group/ActionTypes]
   [:delta db.group/Delta]])

(defn parse-action-type [s]
  {:pre [(string? s)]
   :post [(or (nil? %)
              (contains? db.group/action-types %))]}
  (let [k (keyword "group" s)]
    (when (contains? db.group/action-types k) k)))

(defn parse-set-uuids [xs]
  (when (coll? xs)
    (set (keep strict-str->uuid xs))))

(defn parse-delta [{:keys [owner admins members name description avatar]}]
  (cond-> {}
    (string? owner)       (assoc :group/owner (strict-str->uuid owner))
    (some? admins)        (assoc :group/admins (parse-set-uuids admins))
    (some? members)       (assoc :group/members (parse-set-uuids members))
    (string? name)        (assoc :group/name name)
    (string? description) (assoc :group/description description)
    (string? avatar)      (assoc :group/avatar avatar)))

(defn parse-request-params [{:keys [id action delta]}]
  (cond-> {}
    (some? id)     (assoc :xt/id (crdt/parse-ulid id))
    (some? action) (assoc :group/action (parse-action-type action))
    (some? delta)  (assoc :group/delta (parse-delta delta))))

(defn action->evt-name [action]
  (case action
    :group/update-attrs       "group.updated_attrs"
    :group/remove-member      "group.remove_members"
    :group/add-member         "group.add_members"
    :group/remove-admin       "group.remove_admins"
    :group/leave              "group.leave"
    :group/add-admin          "group.add_admins"
    :group/transfer-ownership "group.transfer_ownership"
    nil))

(defn handle-request! [{:keys [auth/user-id] :as ctx}]
  (let [{:group/keys [action delta]
         :xt/keys [id]}
        (parse-request-params (:params ctx))]
    (if (not (and id action delta))
      (err-resp "invalid_params" "Invalid parameters")
      (let [now (Date.)
            full-action {:xt/id id
                         :group/by_uid user-id
                         :group/action action
                         :group/delta (assoc delta :group/updated_at now)}]
        (if-not (m/validate db.group/Action full-action)
          (err-resp "invalid_params" "Invalid parameters")
          (let [{:keys [group]} (db.group/apply-action! ctx full-action)]
            (when-let [event-name (action->evt-name action)]
              (posthog/capture! ctx event-name {:id id}))
            (json-response {:status "success"
                            :group group})))))))
