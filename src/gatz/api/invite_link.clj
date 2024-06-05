(ns gatz.api.invite-link
  (:require [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.invite-link :as invite-link]
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

;; ====================================================================== 
;; Group Invite links

(def get-invite-link-params
  [:map
   [:id crdt/ulid?]])

(def get-invite-response
  [:or
   [:map
    [:group schema/Group]
    [:invite_link schema/InviteLink]
    [:invited_by schema/Contact]]
   [:map
    [:contact schema/Contact]
    [:invite_link schema/InviteLink]
    [:invited_by schema/Contact]]])

(defn parse-get-invite-link-params [params]
  (cond-> params
    (some? (:id params)) (update :id crdt/parse-ulid)))

(defn invite-link-response

  [{:keys [biff/db] :as _ctx} invite-link]

  (case (:invite_link/type invite-link)

    :invite_link/group
    (let [gid (:invite_link/group_id invite-link)
          group (db.group/by-id db gid)
          invited-by (when-let [uid (:invite_link/created_by invite-link)]
                       (-> (db.user/by-id db uid)
                           crdt.user/->value
                           db.contacts/->contact))]
      (assert group)
      {:invite_link invite-link
       :invited_by invited-by
       :type :invite_link/group
       :group group})

    :invite_link/contact
    (let [cid (:invite_link/contact_id invite-link)
          contact (-> (db.user/by-id db cid)
                      crdt.user/->value
                      db.contacts/->contact)
           ;; TODO: these are likely the same as contact
          invited-by (when-let [uid (:invite_link/created_by invite-link)]
                       (-> (db.user/by-id db uid)
                           crdt.user/->value
                           db.contacts/->contact))]
      {:invite_link invite-link
       :invited_by invited-by
       :type :invite_link/contact
       :contact contact})

    {:type "error"
     :error "unknown_type"
     :message "We don't recognize this type of invite"}))

(defn get-invite-link [{:keys [auth/user-id biff/db] :as ctx}]
  (if-not user-id
    (err-resp "unauthenticated" "Must be authenticated")
    (let [params (parse-get-invite-link-params (:params ctx))]
      (if-let [invite-link-id (:id params)]
        (if-let [invite-link (invite-link/by-id db invite-link-id)]
          (let [response (invite-link-response ctx invite-link)]
            (json-response response))
          (err-resp "link_not_found" "Link not found"))
        (err-resp "invalid_params" "Invalid params")))))

