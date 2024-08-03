(ns gatz.api.discussion
  (:require [clojure.data.json :as json]
            [clojure.set :as set]
            [crdt.core :as crdt]
            [gatz.auth]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.group :as db.group]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.notify :as notify]
            [gatz.schema :as schema]
            [malli.core :as m]
            [malli.util :as mu]
            [malli.transform :as mt]
            [sdk.posthog :as posthog]
            [xtdb.api :as xt])
  (:import [java.util Date]))

;; ====================================================================== 
;; Utils

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))

(defmacro when-authorized-for-message [[user-id m] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (nil? ~m) (err-resp "missing_message" "Message not found")
     (= ~user-id (:message/user_id ~m)) (do ~@body)
     :else (err-resp "unauthorized" "You are unauthorized")))

(defmacro if-authorized-for-discussion [[user-id d] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (nil? ~d) (err-resp "discussion_not_found" "Discussion not found")
     (contains? (:discussion/members ~d) ~user-id) (do ~@body)
     :else (err-resp "not_in_discussion" "You are not in this discussion")))

(defmacro when-authorized-for-discussions [[user-id ds] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (or (nil? ~ds) (empty? ~ds)) (err-resp "discussion_not_found" "Discussion not found")

     (not (every? (fn [d#]
                    (contains? (:discussion/members d#) ~user-id))
                  ~ds))
     (err-resp "not_in_discussion" "You are not in this discussion")

     :else (do ~@body)))

(defmacro if-admin-for-discussion [[user-id d] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (nil? ~d) (err-resp "discussion_not_found" "Discussion not found")
     (= (:discussion/created_by ~d) ~user-id)
     (do ~@body)
     :else (err-resp "not_admin" "You are not an admin for this discussion")))

;; ====================================================================== 
;; Endpoints

(defn get-discussion
  [{:keys [biff/db biff.xtdb/node params auth/user auth/user-id] :as _ctx}]
  (let [latest-tx (xt/latest-completed-tx node)
        tx-id (some-> (:latest_tx params) mt/-string->long)]
    (if (= tx-id (::xt/tx-id latest-tx))
      (json-response {:current true
                      :latest_tx {:id (::xt/tx-id latest-tx)
                                  :ts (::xt/tx-time latest-tx)}})
      (let [did (mt/-string->uuid (:id params))
            {:keys [discussion messages user_ids]} (db/discussion-by-id db did)
            poster (db.user/by-id db (:discussion/created_by discussion))
            _ (assert poster)
            _ (assert (not (db.user/mutually-blocked? user poster)))
            group (when-let [gid (:discussion/group_id discussion)]
                    (db.group/by-id db gid))
            all-user-ids (if group
                           (set/union (:group/members group) (set user_ids))
                           (set user_ids))]
        (if-authorized-for-discussion
         [user-id discussion]
         (json-response {:current false
                         :latest_tx {:id (::xt/tx-id latest-tx)
                                     :ts (::xt/tx-time latest-tx)}
                         :discussion discussion
                         :group group
                         :users (map (comp crdt.user/->value
                                           (partial db.user/by-id db))
                                     all-user-ids)
                         :messages (mapv crdt.message/->value messages)}))))))

(defn ^:deprecated

  mark-seen!

  "Only for older clients"

  [{:keys [biff/db auth/user-id params] :as ctx}]

  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        d (crdt.discussion/->value (gatz.db.discussion/by-id db did))]
    (if-authorized-for-discussion
     [user-id d]
     (do
       ;; TODO: notify posthog that this deprecated endpoint was called
       (db.discussion/mark-as-seen! ctx user-id [did] (Date.))
       (json-response {:status "ok"})))))

(defn mark-many-seen! [{:keys [biff/db auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [dids (map mt/-string->uuid (:dids params))
        ds (mapv (comp crdt.discussion/->value
                       (partial db.discussion/by-id db))
                 dids)]
    (when-authorized-for-discussions
     [user-id ds]
     (do
       (posthog/capture! ctx "discussion.mark_seen")
       (db.discussion/mark-as-seen! ctx user-id dids (Date.))
       (json-response {:status "ok"})))))

(defn mark-message-read! [{:keys [auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        mid (mt/-string->uuid (:mid params))
        {:keys [discussion]} (db.discussion/mark-message-read! ctx user-id did mid)]
    (posthog/capture! ctx "discussion.read" {:did did :mid mid})
    (json-response {:discussion (crdt.discussion/->value discussion)})))

(defn archive! [{:keys [biff/db auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        {:keys [discussion]} (db.discussion/archive! ctx did user-id)
        d (crdt.discussion/->value discussion)
        ;; fine if these values are stale compared to the discussion
        users (->> (:discussion/members d)
                   (mapv (comp crdt.user/->value
                               (partial db.user/by-id db))))
        messages (db.message/by-did db did)]
    (posthog/capture! ctx "discussion.archive" {:did did})
      ;; TODO: change to only return the discussion
      ;; The client has already been fixed to handle this
    (json-response {:discussion d
                    :users users
                    :messages (mapv crdt.message/->value messages)})))

(defn subscribe-to-discussion!
  [{:keys [auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        {:keys [discussion]} (db.discussion/subscribe! ctx did user-id)]
    (posthog/capture! ctx "discussion.subscribe" {:did did})
    (json-response {:discussion (crdt.discussion/->value discussion)})))

(defn unsubscribe-to-discussion!
  [{:keys [auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        {:keys [discussion]} (db.discussion/unsubscribe! ctx did user-id)]
    (posthog/capture! ctx "discussion.unsubscribe" {:did did})
    (json-response {:discussion (crdt.discussion/->value discussion)})))

;; ====================================================================== 
;; Actions

(def action-params
  [:map
   [:id uuid?]
   [:action [:enum :discussion/add-members]]
   [:delta  [:or [(mu/select-keys schema/AddMembersDelta [:discussion/members])]]]])

(defn parse-delta [{:keys [members]}]
  (cond-> {}
    (coll? members) (assoc :discussion/members (set (map mt/-string->uuid members)))))

(defn parse-action-params [{:keys [id action delta]}]
  (cond-> {}
    (some? id) (assoc :id mt/-string->uuid)
    (some? action) (assoc :action (keyword "discussion" action))
    (some? delta) (assoc :delta (parse-delta delta))))

(defn delta->crdt [clock {:discussion/keys [members]}]
  (cond-> {}
    (some? members) (assoc :discussion/members (crdt/lww-set-delta clock members))))

(defn action->evt-name [action]
  (case action
    :discussion/add-members "discussion.add_members"
    :discussion/archive "discussion.archive"
    :discussion/unarchive "discussion.unarchive"
    :discussion/subscribe "discussion.subscribe"
    :discussion/unsubscribe "discussion.unsubscribe"
    nil))

(defn handle-request! [{:keys [auth/user-id] :as ctx}]
  (let [now (Date.)
        clock (crdt/new-hlc user-id now)
        {:keys [id action delta]} (parse-action-params (:params ctx))
        delta (delta->crdt clock delta)
        full-action {:discussion/action action
                     :discussion/delta (-> delta
                                           (assoc :discussion/updated_at now)
                                           (assoc :crdt/clock clock))}]
    (cond
      (not (and id action delta))
      (err-resp "invalid_params" "Invalid params")

      (not (m/validate schema/DiscussionAction full-action))
      (err-resp "invalid_params" "Invalid params")

      :else
      (let [{:keys [discussion]}
            (db.discussion/apply-action! ctx id full-action)]
        (posthog/capture! ctx (action->evt-name action) {:id id})
        (json-response {:discussion discussion})))))

;; ====================================================================== 
;; Feeds

;; The cut-off for discussions is when they were created but the feed sorting is
;; based on when they were updated. This will close problems when there is more activity
;; and certain updates are not reflected in the latest feed because they are not the latest...

;; Can I push the seen and updated criteria to the database?

;; I'll punt on this and think a little harder about it later

;; discrepancy in how this gets params
(defn get-full-discussions
  [{:keys [biff/db biff.xtdb/node auth/user-id params] :as _ctx}]
  (let [latest-tx (xt/latest-completed-tx node)
        tx-id (some-> (:latest_tx params) mt/-string->long)]
    (if (= (::xt/tx-id latest-tx) tx-id)
      (json-response {:current true
                      :latest_tx {:id (::xt/tx-id latest-tx)
                                  :ts (::xt/tx-time latest-tx)}})
      (let [dis (if-let [older-than-ts (some->> (:last_did params)
                                                mt/-string->uuid
                                                (db/discussion-by-id db)
                                                :discussion
                                                :discussion/created_at)]
                  (db/discussions-by-user-id-older-than db user-id older-than-ts)
              ;; This second function might not be sorting according to what the user saw
                  (db/discussions-by-user-id-up-to db user-id))
            ds (map (partial db/discussion-by-id db) dis)
            ;; TODO: this should be a union of the right users, not all users
            users (db.user/all-users db)]
        (json-response {:discussions (mapv crdt.discussion/->value ds)
                        :users (mapv crdt.user/->value users)
                        :current false
                        :latest_tx {:id (::xt/tx-id latest-tx)
                                    :ts (::xt/tx-time latest-tx)}})))))

;; TODO: validate all params at the API level, not the db level
;; TODO: members are not validated as existing
(defn create-discussion! [{:keys [params biff/db] :as ctx}]
  (if-let [post-text (:text params)]
    (if-not (db/valid-post? post-text (:media_id params))
      (err-resp "invalid_post" "Invalid post")
      (let [params (assoc params :to_all_contacts (if (boolean? (:to_all_contacts params))
                                                    (:to_all_contacts params)
                                                    (if (:selected_users params)
                                                      false
                                                      true)))
            {:keys [discussion message]} (db/create-discussion-with-message! ctx params)
            d (crdt.discussion/->value discussion)]
        (posthog/capture! ctx "discussion.new" {:did (:xt/id d)})
        ;; TODO: change shape of response
        (json-response
         {:discussion d
          :users (mapv (comp crdt.user/->value (partial db.user/by-id db))
                       (:discussion/members d))
          :messages [(crdt.message/->value message)]})))
    (err-resp "invalid_params" "Invalid params: missing post text")))

#_(defn add-member! [{:keys [params auth/user-id biff/db] :as ctx}]
    (let [did (mt/-string->uuid (:discussion_id params))
          uid (mt/-string->uuid (:user_id params))]
      (if (and (uuid? did) (uuid? did))
        (let [d (crdt.discussion/->value (db.discussion/by-id db did))]
          (if-admin-for-discussion
           [user-id d]
           (let [{:keys [discussion]} (db.discussion/add-member! ctx did uid)]
             (json-response {:discussion (crdt.discussion/->value d)}))))
        {:status 400 :body "invalid params"})))

(defn create-message! [{:keys [params biff/db auth/user-id] :as ctx}]
  (let [{:keys [text id discussion_id]} params
        mid (let [mid (some-> id mt/-string->uuid)]
              (if (uuid? mid) mid (random-uuid)))
        media-ids (if-let [media-id (some-> (:media_id params) mt/-string->uuid)]
                    [media-id]
                    (when-let [media-ids (some->> (:media_ids params)
                                                  (map mt/-string->uuid)
                                                  (distinct))]
                      (assert (<= (count media-ids) 10))
                      media-ids))
        reply-to (some-> (:reply_to params) mt/-string->uuid)
        did (mt/-string->uuid discussion_id)
        d (crdt.discussion/->value (db.discussion/by-id db did))]
    (if-authorized-for-discussion
     [user-id d]
     (let [msg (db/create-message! ctx {:did did
                                        :mid mid
                                        :text text
                                        :reply_to reply-to
                                        :media_ids media-ids})]
       (try
         (notify/submit-comment-job! ctx (crdt.message/->value msg))
         (catch Exception e
           (println "failed submitting the job" e)))
       (posthog/capture! ctx "message.new" {:did (:xt/id d) :mid (:xt/id msg)})
       (json-response {:message (crdt.message/->value msg)})))))

(def feed-query-params
  [:map
   [:group_id {:optional true} crdt/ulid?]
   [:contact_id {:optional true} uuid?]
   [:last_did {:optional true} uuid?]])

(def feed-response
  [:map
   [:discussion [:vec schema/Discussion]]
   [:users [:vec schema/User]]
   [:groups [:vec schema/Group]]
   [:contact_requests [:vec [:contact_request schema/ContactRequest
                             :contact schema/Contact
                             :in_common [:contacts [:vec schema/Contact]
                                         :groups [:vec schema/Group]]]]]])

(defn strict-str->uuid [s]
  (let [out (mt/-string->uuid s)]
    (if (uuid? out) out nil)))

(defn parse-feed-params [params]
  (cond-> params
    (some? (:contact_id params)) (update :contact_id strict-str->uuid)
    (some? (:group_id params))   (update :group_id crdt/parse-ulid)
    (some? (:last_did params))   (update :last_did strict-str->uuid)))

(defn feed
  [{:keys [params biff.xtdb/node biff/db auth/user auth/user-id] :as ctx}]

  ;; TODO: specify what kind of feed it is
  (posthog/capture! ctx "discussion.feed")

  ;; TODO: return early depending on latest-tx
  ;; TODO: should be using the latest-tx from the _db_ not the node
  (let [params (parse-feed-params params)
        latest-tx (xt/latest-completed-tx node)
        older-than (some->> (:last_did params)
                            (db.discussion/by-id db)
                            :discussion/created_at)
        contact (some->> (:contact_id params) (db.user/by-id db))
        contact_id (some->> contact :xt/id)
        group (some->> (:group_id params) (db.group/by-id db))
        group_id (:xt/id group)
        _ (when contact
            (assert (not (db.user/mutually-blocked? user contact))))

        dids (db.discussion/posts-for-user db user-id
                                           {:older-than-ts older-than
                                            :contact_id contact_id
                                            :group_id group_id})
        blocked-uids (:user/blocked_uids (crdt.user/->value user))
        poster-blocked? (fn [{:keys [discussion]}]
                          (contains? blocked-uids (:discussion/created_by discussion)))
        ds (->> dids
                (map (partial db/discussion-by-id db))
                (remove poster-blocked?))
        d-group-ids (set (keep (comp :discussion/group_id :discussion) ds))
        d-user-ids  (reduce set/union (map :user_ids ds))

        contact-requests (db.contacts/pending-requests-to db user-id)
        crs (mapv (fn [{:contact_request/keys [from] :as cr}]
                    {:contact_request cr
                     :in_common {:contacts (db.contacts/get-in-common db user-id from)
                                 :groups (db.group/ids-with-members-in-common db user-id from)}})
                  contact-requests)
        c-group-ids (reduce set/union (map (comp :groups :in_common) crs))
        c-user-ids  (reduce set/union (map (comp :contacts :in_common) crs))

        ;; TODO: not only send the gruop-ids from the discussions, 
        ;; also from the contact request
        groups (conj (mapv (partial db.group/by-id db)
                           (set/union c-group-ids d-group-ids))
                     group)
        ;; TODO: only send the users that are in the discussions
        ;; and in the contact requests
        users (or (db.user/all-users db)
                  (mapv (partial db.user/by-id db) (set/union d-user-ids c-user-ids)))]
    (json-response {:discussions (mapv crdt.discussion/->value ds)
                    :users (mapv crdt.user/->value users)
                    :groups groups
                    :contact_requests crs
                    ;; TODO: remove this
                    :current false
                    :latest_tx {:id (::xt/tx-id latest-tx)
                                :ts (::xt/tx-time latest-tx)}})))

(def parse-active-params parse-feed-params)

(defn active
  [{:keys [params biff.xtdb/node biff/db auth/user-id] :as ctx}]

  ;; TODO: specify what kind of feed it is
  (posthog/capture! ctx "discussion.active")

  ;; TODO: return early depending on latest-tx
  ;; TODO: should be using the latest-tx from the _db_ not the node
  (let [params (parse-active-params params)
        latest-tx (xt/latest-completed-tx node)
        older-than (some->> (:last_did params)
                            (db.discussion/by-id db)
                            :discussion/created_at)
        contact_id (some->> (:contact_id params)
                            (db.user/by-id db)
                            :xt/id)
        group_id (some->> (:group_id params)
                          (db.group/by-id db)
                          :xt/id)
        dids (db.discussion/active-for-user db user-id
                                            {:older-than-ts older-than
                                             :contact_id contact_id
                                             :group_id group_id})
        ds (map (partial db/discussion-by-id db) dids)
        group-ids (set (keep (comp :discussion/group_id :discussion) ds))
        groups (mapv (partial db.group/by-id db) group-ids)
        users (db.user/all-users db)]
    (json-response {:discussions (mapv crdt.discussion/->value ds)
                    :users (mapv crdt.user/->value users)
                    :groups groups
                    :contact_requests []
                    ;; TODO: remove this
                    :current false
                    :latest_tx {:id (::xt/tx-id latest-tx)
                                :ts (::xt/tx-time latest-tx)}})))

