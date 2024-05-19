(ns gatz.api.discussion
  (:require [clojure.data.json :as json]
            [gatz.auth]
            [gatz.db :as db]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.user :as db.user]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.notify :as notify]
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
  [{:keys [biff/db biff.xtdb/node params auth/user-id] :as _ctx}]
  (let [latest-tx (xt/latest-completed-tx node)
        tx-id (some-> (:latest_tx params) mt/-string->long)]
    (if (= tx-id (::xt/tx-id latest-tx))
      (json-response {:current true
                      :latest_tx {:id (::xt/tx-id latest-tx)
                                  :ts (::xt/tx-time latest-tx)}})
      (let [did (mt/-string->uuid (:id params))
            {:keys [discussion messages user_ids]} (db/discussion-by-id db did)]
        (if-authorized-for-discussion
         [user-id discussion]
         (json-response {:current false
                         :latest_tx {:id (::xt/tx-id latest-tx)
                                     :ts (::xt/tx-time latest-tx)}
                         :discussion discussion
                         :users (map (comp crdt.user/->value
                                           (partial db.user/by-id db))
                                     user_ids)
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
        {:keys [messages user_ids]} (db/discussion-by-id db did)]
    (posthog/capture! ctx "discussion.archive" {:did did})
      ;; TODO: change to only return the discussion
    (json-response {:discussion d
                    :users (mapv (comp crdt.user/->value
                                       (partial db.user/by-id db))
                                 user_ids)
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
      (let [{:keys [discussion message]} (db/create-discussion-with-message! ctx params)
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
        media-id (some-> (:media_id params) mt/-string->uuid)
        reply-to (some-> (:reply_to params) mt/-string->uuid)
        did (mt/-string->uuid discussion_id)
        d (crdt.discussion/->value (db.discussion/by-id db did))]
    (if-authorized-for-discussion
     [user-id d]
     (let [msg (db/create-message! ctx {:did did
                                        :mid mid
                                        :text text
                                        :reply_to reply-to
                                        :media_id media-id})]
       (try
         (notify/submit-comment-job! ctx (crdt.message/->value msg))
         (catch Exception e
           (println "failed submitting the job" e)))
       (posthog/capture! ctx "message.new" {:did (:xt/id d) :mid (:xt/id msg)})
       (json-response {:message (crdt.message/->value msg)})))))


(def feed-query-params
  [:map
   [:last_did {:optional true} uuid?]])

(defn feed
  [{:keys [params biff.xtdb/node biff/db auth/user-id] :as ctx}]

  ;; TODO: specify what kind of feed it is
  (posthog/capture! ctx "discussion.feed")

  ;; TODO: parse older-than-ts 
  ;; TODO: return early depending on latest-tx
  ;; TODO: should be using the latest-tx from the _db_ not the node
  (let [latest-tx (xt/latest-completed-tx node)
        dids (db.discussion/posts-for-user db user-id)
        ds (map (partial db/discussion-by-id db) dids)
        users (db.user/all-users db)]
    (json-response {:discussions (mapv crdt.discussion/->value ds)
                    :users (mapv crdt.user/->value users)
                    :current false
                    :latest_tx {:id (::xt/tx-id latest-tx)
                                :ts (::xt/tx-time latest-tx)}})))

