(ns gatz.api.invite-link
  (:require [clojure.data.json :as json]
            [clojure.set :as set]
            [crdt.core :as crdt]
            [com.biffweb :as biff]
            [gatz.http :as http]
            [gatz.api.user :as api.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.feed :as db.feed]
            [gatz.db.group :as db.group]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.user :as db.user]
            [gatz.crdt.user :as crdt.user]
            [gatz.schema :as schema]
            [sdk.posthog :as posthog]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(defn err-resp [err-type err-msg]
  {:status 400
   :headers {"Content-Type" "application/json"}
   :body (json/write-str {:type "error" :error err-type :message err-msg})})

;; ======================================================================
;; Create invite link

(defn ->out [ctx il]
  {:id (:xt/id il)
   :code (:invite_link/code il)
   :url (db.invite-link/make-url ctx (:invite_link/code il))})

(def post-invite-link-response
  [:map
   [:id string?]
   [:code string?]
   [:url string?]])

(def post-group-invite-link-params
  [:map
   [:group_id crdt/ulid?]])

(defn parse-group-invite-link-params [params]
  (cond-> params
    (some? (:group_id params)) (update :group_id crdt/parse-ulid)))

(def post-invite-link-crew-params post-group-invite-link-params)
(def parse-invite-link-crew-params parse-group-invite-link-params)

(defn post-crew-invite-link [{:keys [auth/user-id params] :as ctx}]
  (assert user-id "The user should be authenticated by now")
  (let [{:keys [group_id]} (parse-group-invite-link-params params)
        screen (db.invite-link/get-screen ctx)]
    (if (:invite_screen/can_user_invite screen)
      (let [invite-link (db.invite-link/create! ctx {:uid user-id
                                                     :gid group_id
                                                     :type :invite_link/crew})]

        (posthog/capture! ctx "invite_link.new" invite-link)
        (http/ok ctx (->out ctx invite-link)))
      (err-resp "not_allowed" "You can't invite to a crew right now"))))

(defn post-contact-invite-link [{:keys [auth/user-id] :as ctx}]
  (assert user-id "The user should be authenticated by now")
  (let [screen (db.invite-link/get-screen ctx)]
    (if (:invite_screen/can_user_invite screen)
      (let [invite-link (db.invite-link/create! ctx {:uid user-id
                                                     :type :invite_link/contact})]
        (posthog/capture! ctx "invite_link.new" invite-link)
        (http/ok ctx (->out ctx invite-link)))
      (err-resp "not_allowed" "You can't invite to a contact right now"))))

(defn post-group-invite-link [{:keys [auth/user-id biff/db] :as ctx}]
  (let [now (Date.)
        params (parse-group-invite-link-params (:params ctx))
        screen (db.invite-link/get-screen ctx)]
    (if (:invite_screen/can_user_invite screen)
      (if-let [group-id (:group_id params)]
        (if-let [group (db.group/by-id db group-id)]
          (if (contains? (:group/admins group) user-id)
            (let [crew? (= :group.invites/crew
                           (get-in group [:group/settings :invites/mode]))
                  il-type (if crew?
                            :invite_link/crew
                            :invite_link/group)
                  invite-link (db.invite-link/create!
                               ctx {:uid user-id
                                    :gid group-id
                                    :type il-type
                                    :now now})]
              (posthog/capture! ctx "invite_link.new" invite-link)
              (http/ok ctx (->out ctx invite-link)))
            (err-resp "not_found" "Group not found"))
          (err-resp "not_found" "Group not found"))
        (err-resp "invalid_params" "Invalid params"))
      (err-resp "not_allowed" "You can't invite to a group right now"))))

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
    [:invited_by schema/Contact]
    [:type [:enum :invite_link/group]]
    [:in_common [:map
                 [:contact_ids [:set schema/UserId]]
                 [:contacts [:vec schema/Contact]]]]]
   [:map
    [:invte_link schema/InviteLink]
    [:invited_by schema/Contact]
    [:type [:enum :invite_link/crew]]
    [:group schema/Group]
    [:members [:vec schema/Contact]]]
   [:map
    [:contact schema/Contact]
    [:invite_link schema/InviteLink]
    [:invited_by schema/Contact]
    [:type [:enum :invite_link/contact]]
    [:in_common [:map
                 [:contact_ids [:set schema/UserId]]
                 [:contacts [:vec schema/Contact]]]]]])

(defn parse-get-invite-link-params [params]
  (cond-> params
    (some? (:id params)) (update :id crdt/parse-ulid)))

(defn invite-link-response

  [{:keys [biff/db auth/user-id] :as _ctx} invite-link]

  (let [my-contacts (db.contacts/by-uid db user-id)
        my-contact-ids (:contacts/ids my-contacts)]
    (case (:invite_link/type invite-link)

      :invite_link/crew
      (let [invited-by (when-let [uid (:invite_link/created_by invite-link)]
                         (-> (db.user/by-id db uid)
                             crdt.user/->value
                             db.contacts/->contact))
            group (when-let [gid (:invite_link/group_id invite-link)]
                    (db.group/by-id db gid))
            member-ids (conj (:group/members group) (:xt/id invited-by))
            members (mapv (comp db.contacts/->contact
                                crdt.user/->value
                                (partial db.user/by-id db))
                          member-ids)]
        {:invite_link invite-link
         :invited_by invited-by
         :group group
         :type :invite_link/crew
         :members members})

      :invite_link/group
      (let [gid (:invite_link/group_id invite-link)
            group (db.group/by-id db gid)
            member-ids (:group/members group)
            in-common (set/intersection member-ids my-contact-ids)
            contacts-in-common (mapv (comp db.contacts/->contact
                                           crdt.user/->value
                                           (partial db.user/by-id db))
                                     in-common)
            invited-by (when-let [uid (:invite_link/created_by invite-link)]
                         (-> (db.user/by-id db uid)
                             crdt.user/->value
                             db.contacts/->contact))]
        (assert group)
        {:invite_link invite-link
         :invited_by invited-by
         :type :invite_link/group
         :group group
         :in_common {:contact_ids in-common
                     :contacts contacts-in-common}})

      :invite_link/contact
      (let [cid (:invite_link/contact_id invite-link)
            contact (-> (db.user/by-id db cid)
                        crdt.user/->value
                        db.contacts/->contact)
            in-common (db.contacts/get-in-common db user-id cid)
            contacts-in-common (->> in-common
                                    (mapv (comp db.contacts/->contact
                                                crdt.user/->value
                                                (partial db.user/by-id db))))
           ;; TODO: these are likely the same as contact
            invited-by (when-let [uid (:invite_link/created_by invite-link)]
                         (-> (db.user/by-id db uid)
                             crdt.user/->value
                             db.contacts/->contact))]
        {:invite_link invite-link
         :invited_by invited-by
         :type :invite_link/contact
         :contact contact
         :in_common {:contact_ids in-common
                     :contacts contacts-in-common}})

      {:type "error"
       :error "unknown_type"
       :message "We don't recognize this type of invite"})))

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
              (http/ok ctx response)))
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

(defn make-contacts-with-txn [new-uid contact-ids now]
  {:pre [(every? uuid? contact-ids) (uuid? new-uid) (inst? now)]}
  (mapv (fn [cid]
          (let [args {:by-uid new-uid :to-uid cid :now now}]
            [:xtdb.api/fn :gatz.db.contacts/invite-contact {:args args}]))
        (set contact-ids)))

(defn make-friends-with-my-contacts-txn [db my-uid new-uid now]

  {:pre [(uuid? my-uid) (uuid? new-uid) (inst? now)]}

  (let [existing-uids (:contacts/ids (db.contacts/by-uid db my-uid))]
    (make-contacts-with-txn new-uid existing-uids now)))

(def test-special-contact #uuid "64a719fa-4963-42e2-bc7e-0cb7beb8844c")

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
                       :accepted_invite_feed_item_id (db.feed/new-feed-item-id)
                       :invite_link_id (:xt/id invite-link)
                       :now now}
         invite-link-args {:id (:xt/id invite-link) :user-id user-id :now now}
         feed-item-args {:feed_item_id (db.feed/new-feed-item-id)
                         :now now
                         :uid user-id
                         :invited_by_uid by-uid}
         txns (cond-> [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args contact-args}]
                       [:xtdb.api/fn :gatz.db.feed/new-user-item feed-item-args]
                       [:xtdb.api/fn :gatz.db.invite-links/mark-used {:args invite-link-args}]]
                make-friends-with-contacts?
                (concat (make-friends-with-my-contacts-txn db cid user-id now)))]
     (assert (= by-uid cid))
     (biff/submit-tx ctx (vec txns)))))

(defn invite-to-crew!

  ([ctx invite-link]
   (let [special-contact? (contains? invite-all-users (:invite_link/created_by invite-link))]
     (invite-to-crew! ctx invite-link {:make-friends-with-contacts? special-contact?})))

  ([{:keys [auth/user-id biff.xtdb/node] :as ctx}
    invite-link
    {:keys [make-friends-with-contacts?]}]

   (assert user-id)
   (assert (= :invite_link/crew (:invite_link/type invite-link)))

   (let [db (xtdb/db node)
         by-uid (:invite_link/created_by invite-link)
         now (Date.)
         group (when-let [gid (:invite_link/group_id invite-link)]
                 (db.group/by-id db gid))
         group-action (when group
                        {:xt/id (:xt/id group)
                         :group/by_uid by-uid
                         :group/action :group/add-member
                         :group/delta {:group/updated_at now
                                       :group/members #{user-id}}})

         crew-members (if group
                        (:group/members group)
                        ;; in case the user has already been added to the crew
                        (-> (:invite_link/used_by invite-link)
                            (disj user-id)))

         crew-members (if (and (not group) make-friends-with-contacts?)
                        (let [my-contacts (:contacts/ids (db.contacts/by-uid db by-uid))]
                          (set/union crew-members my-contacts))
                        crew-members)

         contact-args {:by-uid by-uid
                       :to-uid user-id
                       :accepted_invite_feed_item_id (db.feed/new-feed-item-id)
                       :invite_link_id (:xt/id invite-link)
                       :now now}

         invite-link-args {:id (:xt/id invite-link) :user-id user-id :now now}

         feed-item-args {:feed_item_id (db.feed/new-feed-item-id)
                         :now now
                         :uid user-id
                         :invited_by_uid by-uid}

         txns (concat
               [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args contact-args}]
                [:xtdb.api/fn :gatz.db.invite-links/mark-used {:args invite-link-args}]]

               (if group
                 [[:xtdb.api/fn :gatz.db.group/add-to-group-and-discussions {:action group-action}]]
                 [[:xtdb.api/fn :gatz.db.feed/new-user-item feed-item-args]])

               (make-contacts-with-txn user-id crew-members now))]

     ;; (assert (= by-uid cid))
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
              :invite_link/crew    (invite-to-crew! ctx invite-link)
              :invite_link/group   (invite-to-group! ctx invite-link)
              :invite_link/contact (invite-to-contact! ctx invite-link))
            (posthog/capture! ctx "invite_link.joined" invite-link)
            (http/ok ctx {:success "true"})))
        (err-resp "not_found" "Invite Link not found"))
      (err-resp "invalid_params" "Invalid params"))))

(def get-invite-by-code-params
  [:map
   [:code string?]])

(defn get-invite-by-code [{:keys [auth/user-id biff/db] :as ctx}]
  (if-not user-id
    (err-resp "unauthenticated" "Must be authenticated")
    (let [params (:params ctx)]
      (if-let [code (:code params)]
        (if-let [invite-link (db.invite-link/by-code db code)]
          (if (db.invite-link/expired? invite-link)
            (err-resp "expired" "Invite Link expired")
            (let [response (invite-link-response ctx invite-link)]
              (posthog/capture! ctx "invite_link.viewed" invite-link)
              (http/ok ctx response)))
          (http/ok ctx {}))
        (err-resp "invalid_params" "Invalid params")))))


(defn get-invite-screen [ctx]
  (let [me-data (api.user/get-me-data ctx)
        invite-screen (db.invite-link/get-screen ctx)]
    (http/ok ctx (assoc me-data :invite_screen invite-screen))))