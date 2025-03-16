(ns gatz.api
  "All the operations but in an API"
  (:require [chime.core :as chime]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json]
            [crdt.core :as crdt]
            [ddl.api :as ddl.api]
            [gatz.auth :as auth]
            [gatz.api.contacts :as api.contacts]
            [gatz.api.discussion :as api.discussion]
            [gatz.api.feed :as api.feed]
            [gatz.api.group :as api.group]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.api.search :as api.search]
            [gatz.api.media :as api.media]
            [gatz.api.message :as api.message]
            [gatz.api.user :as api.user]
            [gatz.connections :as conns]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.db :as db]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.feed :as db.feed]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.group :as db.group]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.settings :as settings]
            [link-preview.api :as link-preview]
            [ring.adapter.jetty9 :as jetty]
            [sdk.sentry :as sentry]
            [xtdb.api :as xtdb])
  (:import [java.time Instant Duration]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))

;; ======================================================================
;; Websocket

(defn connection-response [user-id conn-id]
  {:connection_id conn-id
   :user_id user-id
   :created_at (java.util.Date.)})

;; TODO: how to catch and handle errors that are happening in the websocket?
(defmacro try-print [& body]
  `(try
     ~@body
     (catch Exception e#
       (def -e e#)
       (println e#))))

(defn start-connection
  [{:keys [conns-state auth/user-id biff/db biff.xtdb/node] :as ctx}]
  (assert conns-state)
  (when (jetty/ws-upgrade-request? ctx)
    ;; TODO: asert this user is actually in the database
    (if-let [user (some->> user-id (db.user/by-id db))]
      (let [user-id (:xt/id user)
            conn-id (random-uuid)]
        (jetty/ws-upgrade-response
         {:on-connect (fn [ws]
                        (sentry/try-and-send!
                         (log/info "connecting websocket for user" user-id)
                         (let [db (xtdb/db node)
                               ds (or (db/discussions-by-user-id db user-id) #{})]
                           (swap! conns-state conns/add-conn {:ws ws
                                                              :user-id user-id
                                                              :conn-id conn-id
                                                              :user-discussions ds}))
                         (jetty/send! ws (json/write-str
                                          (connection-response user-id conn-id)))
                         (db.user/mark-active! (assoc ctx :auth/user-id user-id))))
          :on-close (fn [_ws status-code reason]
                      (sentry/try-and-send!
                       (log/info "closing websocket for user" user-id status-code reason)
                       (let [db (xtdb/db node)
                             ds (or (db/discussions-by-user-id db user-id) #{})]
                         (swap! conns-state conns/remove-conn {:user-id user-id
                                                               :conn-id conn-id
                                                               :user-discussions ds}))
                       (db.user/mark-active! (assoc ctx :auth/user-id user-id))))
          :on-text (fn [ws text]
                      ;; TODO: create discussion or add member
                      ;; are special because they change the conns-state
                     (sentry/try-and-send!
                      (jetty/send! ws (json/write-str {:conn-id conn-id :user-id user-id :echo text :state @conns-state}))))}))
      {:status 400 :body "Invalid user"})))

(defn propagate-message!
  [{:keys [conns-state] :as _ctx} d m]
  (let [did (:xt/id d)
        mid (:xt/id m)
        conns @conns-state]
    (doseq [uid (conns/discussion-users conns did)
            :let [d (db.discussion/->external d uid)]
            ws (conns/user-wss conns uid)]
      (log/info "sending message delta to connected clients for" uid)
      ;; did and mid no longer needed as of v1.1.18
      (jetty/send! ws (json/write-str {:event/type :event/message_edited
                                       :event/data {:did did :mid mid
                                                    :message m :discussion d}})))))

(defmulti handle-evt! (fn [_ctx evt]
                        (:evt/type evt)))

(defn propagate-user-delta-to-user!
  [{:keys [conns-state] :as _ctx} u action]
  (let [uid (:xt/id u)
        evt {:event/type :gatz.crdt.user/delta
             :event/data {:user u
                          :delta (:gatz.crdt.user/delta action)}}
        evt-str (pr-str evt)]
    ;; 1. Connections for the same user want to hear everything
    (log/info "sending user delta to connected clients for" uid)
    (doseq [ws (conns/user-wss @conns-state uid)]
      (jetty/send! ws evt-str))))

(def user-deltas-for-friends
  #{:gatz.crdt.user/update-avatar})

(defn propagate-user-delta-to-friends!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} u delta]
  ;; TODO: only certain changes
  ;; 2. Connections for friends want to hear about avatar, username changes
  (when (contains? user-deltas-for-friends (:gatz.crdt.user/action delta))
    (let [uid (:xt/id u)
          db (xtdb.api/db node)
          friend-ids (db.user/get-friend-ids db uid)
          evt {:event/type (:gatz.crdt.user/action delta)
               :event/data {:user (crdt.user/->value (crdt.user/->friend u))
                            :delta (crdt/-value delta)}}]
      (doseq [ws (conns/uids->wss @conns-state friend-ids)]
        (jetty/send! ws (json/write-str evt))))))

(defmethod handle-evt! :gatz.crdt.user/delta
  [{:keys [biff.xtdb/node] :as ctx} evt]
  (let [db (xtdb/db node)
        u (db.user/by-id db (:evt/uid evt))]
    #_(propagate-user-delta-to-friends! ctx u (:evt/data evt))
    (propagate-user-delta-to-user! ctx u (:evt/data evt))))

(defmethod handle-evt! :message.crdt/delta
  [{:keys [biff.xtdb/node] :as ctx} evt]
  (let [db (xtdb/db node)
        did (:evt/did evt)
        mid (:evt/mid evt)
        d (crdt.discussion/->value (db.discussion/by-id db did))
        m (crdt.message/->value (db.message/by-id db mid))]
    (propagate-message! ctx d m)
    (api.message/handle-message-evt! ctx d m evt)))

(defn register-new-discussion!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} did]
  (let [db (xtdb/db node)
        {:keys [discussion messages user_ids]} (db/discussion-by-id db did)
        feed-item (db.feed/last-by-did db did)
        members (:discussion/members discussion)
        messages (map crdt.message/->value messages)
        users (map (comp crdt.user/->value
                         (partial db.user/by-id db))
                   user_ids)
        conns @conns-state]
    ;; register these users to listen to the discussion
    (swap! conns-state conns/add-users-to-d {:did did :user-ids members})
    ;; Sending this to the members is not necessary 
    ;; because they are now listening to feed items
    ;; as of v1.1.18
    (doseq [uid members
            :let [d (-> discussion
                        (crdt.discussion/->value)
                        (db.discussion/->external uid))]
            ws (conns/user-wss conns uid)]
      (log/info "sending new discussion to connected clients for" uid)
      (jetty/send! ws (json/write-str
                       {:event/type :event/new_discussion
                        :event/data {:discussion d
                                     :item feed-item
                                     :messages messages
                                     :users users}})))))

(defmethod handle-evt! :discussion.crdt/delta
  [ctx evt]
  (let [action-type (get-in evt [:evt/data :discussion.crdt/action])]
    (when (= :discussion.crdt/append-message action-type)
      (let [db (xtdb/db (:biff.xtdb/node ctx))
            did (:evt/did evt)
            mid (:evt/mid evt)
            d (crdt.discussion/->value (db.discussion/by-id db did))
            m (crdt.message/->value (gatz.db.message/by-id db mid))]
        (propagate-message! ctx d m)))))

(defn handle-feed-item! [{:keys [biff.xtdb/node conns-state] :as ctx} feed-item]
  (let [conns @conns-state]
    (when (= :feed.type/new_post (:feed/feed_type feed-item))
      (register-new-discussion! ctx (:feed/ref feed-item)))
    (doseq [uid (:feed/uids feed-item)
            ws (conns/uids->wss conns #{uid})]
      (let [db (xtdb/db node)
            user (db.user/by-id db uid)
            ctx (assoc ctx
                       :biff/db db
                       :auth/user-id uid
                       :auth/user user)
            hfi (api.feed/hydrate-item ctx feed-item)
            group-ids (api.feed/collect-group-ids hfi)
            groups (map (partial db.group/by-id db) group-ids)
            contact-ids (api.feed/collect-contact-ids hfi)
            contacts (map (comp db.contacts/->contact
                                crdt.user/->value
                                (partial db.user/by-id db))
                          contact-ids)
            evt {:event/type :event/new_feed_item
                 :event/data {:feed_item hfi
                              :groups groups
                              :contacts contacts}}]
        (jetty/send! ws (json/write-str evt))))))

(defn flatten-tx-ops
  "Returns a sequence of 'final' tx-ops without nesting"
  [tx]
  (if-let [tx-ops (:xtdb.api/tx-ops tx)]
    (mapcat (fn [[_op _args nested-tx :as tx-op]]
              (if (and (map? nested-tx)
                       (contains? nested-tx :xtdb.api/tx-ops))
                (cons tx-op (flatten-tx-ops nested-tx))
                [tx-op]))
            tx-ops)
    tx))

(defn on-evt! [ctx tx]
  (doseq [[op & args] (flatten-tx-ops tx)]
    (when (= op ::xtdb/put)
      (let [[evt] args]
        (case (:db/type evt)
          :gatz/evt (try
                      (handle-evt! ctx evt)
                      (catch Throwable t
                        (sentry/send-event-error! t evt)))
          :gatz/feed_item (try
                            (handle-feed-item! ctx evt)
                            (catch Throwable t
                              (sentry/send-event-error! t evt)))
          nil)))))

;; TODO: if one of these throws an exception, the rest of the on-tx should still run
(defn on-tx [ctx tx]
  (on-evt! ctx tx))

(def alive-message {:status "ok"})

(defn ping-every-connection!
  [{:keys [conns-state] :as ctx}]
  ;; (println "pinging every connection")
  (let [all-wss (conns/all-wss @conns-state)
        msg (json/write-str alive-message)]
    (doseq [ws all-wss]
      (jetty/send! ws msg))))

(defn get-manifest [_]
  (json-response settings/manifest))

(def plugin
  {:on-tx on-tx
   :tasks [{:task ping-every-connection!
            :schedule (fn []
                        (chime/periodic-seq (Instant/now) (Duration/ofSeconds 30)))}]

   :api-routes [["/ws" {:middleware [auth/wrap-api-auth]}
                 ["/connect" {:get start-connection}]]
                 ;; unauthenticated
                ["/api"
                 ["/manifest" {:get get-manifest}]
                 ["/signin" {:post api.user/sign-in!}]
                 ["/signup" {:post api.user/sign-up!}]

                 ["/ddl/register" {:post ddl.api/register-link!}]

                 ["/verify/start" {:post api.user/verify-phone!}]
                 ["/verify/code" {:post api.user/verify-code!}]
                 ["/user/check-username" {:post api.user/check-username}]]

                ;; authenticated
                ["/api" {:middleware [auth/wrap-api-auth]}
                 ["/me" {:get api.user/get-me}]
                 ["/user" {:get api.user/get-user}]
                 ["/user/push-token" {:post   api.user/add-push-token!}]
                 ["/user/disable-push" {:post api.user/disable-push!}]
                 ["/user/avatar" {:post api.user/update-avatar!}]
                 ["/user/settings/notifications" {:post api.user/update-notification-settings!}]
                 ["/user/delete" {:post api.user/delete-account!}]
                 ["/user/block" {:post api.user/block!}]
                 ["/user/settings/urls" {:post api.user/update-urls!}]
                 ["/user/settings/profile" {:post api.user/update-profile!}]

                 ["/me/crdt" {:get api.user/get-me-crdt
                              :post api.user/post-me-crdt}]


                 ["/file/presign" {:post api.media/presigned-url!}]
                 ["/media" {:post api.media/create-media!}]

                 ["/link-preview" {:post link-preview/post-preview}]

                 ["/message" {:post api.discussion/create-message!}]
                 ["/message/delete" {:post api.message/delete-message!}]
                 ["/message/flag" {:post api.message/flag!}]
                 ["/message/edit" {:post  api.message/edit-message!}]
                 ["/message/react" {:post api.message/react-to-message!}]
                 ["/message/undo-react" {:post api.message/undo-react-to-message!}]

                 ["/feed/posts" {:get api.discussion/feed}]
                 ["/feed/active" {:get api.discussion/active}]

                 ["/feed/items" {:get api.feed/feed}]
                 ["/feed/dismiss" {:post api.feed/dismiss!}]
                 ["/feed/mark-seen" {:post api.feed/mark-many-seen!}]

                 ["/search" {:get api.search/search-term}]

                 ["/contact" {:get api.contacts/get-contact}]
                 ["/contacts" {:get api.contacts/get-all-contacts}]
                 ["/contact/request" {:post api.contacts/handle-request!}]
                 ["/contact/share-link" {:post api.invite-link/post-contact-invite-link}]
                 ["/contact/hide" {:post api.contacts/hide!}]
                 ["/contact/unhide" {:post api.contacts/unhide!}]

                 ["/group" {:get api.group/get-group
                            :post api.group/create!}]
                 ["/groups" {:get api.group/get-user-groups}]
                 ["/group/avatar" {:post api.group/update-avatar!}]
                 ["/group/request" {:post api.group/handle-request!}]
                 ["/group/share-link" {:post api.invite-link/post-group-invite-link}]

                 ["/invite-link" {:get api.invite-link/get-invite-link}]
                 ["/invite-link/join" {:post api.invite-link/post-join-invite-link}]
                 ["/invite-link/crew-share-link" {:post api.invite-link/post-crew-invite-link}]

                 ["/ddl/pending" {:post ddl.api/pending-links!}]

                 ["/discussions" {:get  api.discussion/get-full-discussions
                                  :post api.discussion/create-discussion!}]
                 ["/discussion" {:get   api.discussion/get-discussion}]
                 ["/discussion/mark-many-seen" {:post api.discussion/mark-many-seen!}]
                 ;; this route is deprecated should be removed when all clients
                 ;; are upgraded
                 ["/discussion/mark-seen" {:post  api.discussion/mark-seen!}]
                 ["/discussion/mark-message-seen" {:post api.discussion/mark-message-read!}]
                 ["/discussion/archive" {:post api.discussion/archive!}]
                 ["/discussion/unarchive" {:post api.discussion/unarchive!}]
                 ["/discussion/subscribe" {:post api.discussion/subscribe-to-discussion!}]
                 ["/discussion/unsubscribe" {:post api.discussion/unsubscribe-to-discussion!}]]]})
