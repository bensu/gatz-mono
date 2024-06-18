(ns gatz.api.invite-link
  (:require [clojure.data.json :as json]
            [clojure.set :as set]
            [crdt.core :as crdt]
            [com.biffweb :as biff]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [sdk.posthog :as posthog]
            [xtdb.api :as xtdb])
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
;; Create invite link

(def post-invite-link-response
  [:map
   [:url string?]])

(defn post-contact-invite-link [{:keys [auth/user-id] :as ctx}]
  (assert user-id "The user should be authenticated by now")
  (let [invite-link (db.invite-link/create! ctx {:uid user-id
                                                 :type :invite_link/contact})
        link-id (:xt/id invite-link)]
    (posthog/capture! ctx "invite_link.new" invite-link)
    (json-response {:url (db.invite-link/make-url ctx link-id)})))

(def post-group-invite-link-params
  [:map
   [:group_id crdt/ulid?]])

(defn parse-group-invite-link-params [params]
  (cond-> params
    (some? (:group_id params)) (update :group_id crdt/parse-ulid)))

(defn post-group-invite-link [{:keys [auth/user-id biff/db] :as ctx}]
  (let [params (parse-group-invite-link-params (:params ctx))]
    (if-let [group-id (:group_id params)]
      (if-let [group (db.group/by-id db group-id)]
        (if (contains? (:group/admins group) user-id)
          (let [invite-link (db.invite-link/create! ctx {:uid user-id
                                                         :gid group-id
                                                         :type :invite_link/group
                                                         :now (Date.)})
                link-id (:xt/id invite-link)]
            (posthog/capture! ctx "invite_link.new" invite-link)
            (json-response {:url (db.invite-link/make-url ctx link-id)}))
          (err-resp "not_found" "Group not found"))
        (err-resp "not_found" "Group not found"))
      (err-resp "invalid_params" "Invalid params"))))

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
        (if-let [invite-link (db.invite-link/by-id db invite-link-id)]
          (if (db.invite-link/expired? invite-link)
            (err-resp "expired" "Invite Link expired")
            (let [response (invite-link-response ctx invite-link)]
              (posthog/capture! ctx "invite_link.viewed" invite-link)
              (json-response response)))
          (err-resp "link_not_found" "Link not found"))
        (err-resp "invalid_params" "Invalid params")))))

(def post-join-invite-link-params
  [:map
   [:id crdt/ulid?]])

(defn parse-join-link-params [params]
  (cond-> params
    (some? (:id params)) (update :id crdt/parse-ulid)))

(defn invite-to-group!
  [{:keys [auth/user-id] :as ctx} invite-link]

  (assert user-id)
  (assert (= :invite_link/group (:invite_link/type invite-link)))
  (assert (:invite_link/group_id invite-link))

  (let [invited-by-uid (:invite_link/created_by invite-link)
        now (Date.)
        invite-link-args {:id (:xt/id invite-link)
                          :user-id user-id
                          :now now}
        gid (:invite_link/group_id invite-link)
        group-action {:xt/id gid
                      :group/by_uid invited-by-uid
                      :group/action :group/add-member
                      :group/delta {:group/updated_at now
                                    :group/members #{user-id}}}]
    (biff/submit-tx
     ctx
     [[:xtdb.api/fn :gatz.db.group/add-to-group-and-discussions {:action group-action}]
      [:xtdb.api/fn :gatz.db.invite-links/mark-used {:args invite-link-args}]])))

(defn make-friends-with-my-contacts-txn [db my-uid new-uid now]

  {:pre [(uuid? my-uid) (uuid? new-uid) (inst? now)]}

  (let [existing-uids (:contacts/ids (db.contacts/by-uid db my-uid))]
    (mapv (fn [existing-uid]
            (let [args {:from new-uid :to existing-uid :now now}]
              [:xtdb.api/fn :gatz.db.contacts/add-contacts {:args args}]))
          existing-uids)))

(def test-special-contact #uuid "7295a445-0935-4cf4-853b-dd6f8a991fc6")

(def prod-uids
  {"sebas" #uuid "06942e79-cda8-4f55-8bd0-50ce61ebfb60"})

(def invite-all-users
  (set/union #{test-special-contact} (set (vals prod-uids))))

(defn invite-to-contact!

  ([ctx {:invite_link/keys [contact_id] :as invite-link}]
   (let [special-contact? (contains? invite-all-users contact_id)]
     (invite-to-contact! ctx invite-link {:make-friends-with-contacts? special-contact?})))

  ([{:keys [auth/user-id biff.xtdb/node] :as ctx}
    invite-link
    {:keys [make-friends-with-contacts?]}]

   (assert user-id)
   (assert (= :invite_link/contact (:invite_link/type invite-link)))
   (assert (:invite_link/contact_id invite-link))

   (let [db (xtdb/db node)
         by-uid (:invite_link/created_by invite-link)
         now (Date.)
         cid (:invite_link/contact_id invite-link)
         contact-args {:by-uid cid
                       :to-uid user-id
                       :now now}
         invite-link-args {:id (:xt/id invite-link) :user-id user-id :now now}
         txns (cond-> [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args contact-args}]
                       [:xtdb.api/fn :gatz.db.invite-links/mark-used {:args invite-link-args}]]
                make-friends-with-contacts?
                (concat (make-friends-with-my-contacts-txn db cid user-id now)))]
     (assert (= by-uid cid))
     (biff/submit-tx ctx (vec txns)))))

(defn post-join-invite-link

  [{:keys [biff/db auth/user-id] :as ctx}]

  (assert user-id)

  (let [params (parse-join-link-params (:params ctx))]
    (if-let [id (:id params)]
      (if-let [invite-link (db.invite-link/by-id db id)]
        (if (db.invite-link/expired? invite-link)
          (err-resp "expired" "Invite Link expired")
          (do
            (case (:invite_link/type invite-link)
              :invite_link/group   (invite-to-group! ctx invite-link)
              :invite_link/contact (invite-to-contact! ctx invite-link))
            (posthog/capture! ctx "invite_link.joined" invite-link)
            (json-response {:success "true"})))
        (err-resp "not_found" "Invite Link not found"))
      (err-resp "invalid_params" "Invalid params"))))

