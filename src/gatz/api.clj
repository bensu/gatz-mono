(ns gatz.api
  "All the operations but in an API"
  (:require [chime.core :as chime]
            [clojure.data.json :as json]
            [crdt.core :as crdt]
            [gatz.auth :as auth]
            [gatz.api.contacts :as api.contacts]
            [gatz.api.discussion :as api.discussion]
            [gatz.api.group :as api.group]
            [gatz.api.invite-link :as api.invite-link]
            [gatz.api.media :as api.media]
            [gatz.api.message :as api.message]
            [gatz.api.user :as api.user]
            [gatz.connections :as conns]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.db :as db]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.settings :as settings]
            [ring.adapter.jetty9 :as jetty]
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
    (try-print
     (if-let [user (some->> user-id (db.user/by-id db))]
       (let [user-id (:xt/id user)
             conn-id (random-uuid)]
         (jetty/ws-upgrade-response
          {:on-connect (fn [ws]
                         (let [db (xtdb/db node)
                               ds (or (db/discussions-by-user-id db user-id) #{})]
                           (swap! conns-state conns/add-conn {:ws ws
                                                              :user-id user-id
                                                              :conn-id conn-id
                                                              :user-discussions ds}))
                         (jetty/send! ws (json/write-str
                                          (connection-response user-id conn-id)))
                         (db.user/mark-active! (assoc ctx :auth/user-id user-id)))
           :on-close (fn [ws status-code reason]
                       (let [db (xtdb/db node)
                             ds (or (db/discussions-by-user-id db user-id) #{})]
                         (swap! conns-state conns/remove-conn {:user-id user-id
                                                               :conn-id conn-id
                                                               :user-discussions ds}))
                       (jetty/send! ws (json/write-str
                                        {:reason reason
                                         :status status-code
                                         :conn-id conn-id
                                         :user-id user-id}))
                       (db.user/mark-active! (assoc ctx :auth/user-id user-id)))
           :on-text (fn [ws text]
                      (jetty/send! ws (json/write-str {:conn-id conn-id :user-id user-id :echo text :state @conns-state}))
                      ;; TODO: create discussion or add member 
                      ;; are special because they change the conns-state
                      )}))
       {:status 400 :body "Invalid user"}))))

(defn propagate-message-delta!
  [{:keys [conns-state] :as _ctx} m delta]
  (let [did (:message/did m)
        evt-type (case (:message.crdt/action delta)
                   :message.crdt/delete :event/delete_message
                   :event/message_edited)
        evt {:event/type evt-type
             :event/data {:message m :did did :mid (:xt/id m)}}]
    (doseq [ws (conns/did->wss @conns-state did)]
      (jetty/send! ws (json/write-str evt)))))

(defmulti handle-evt! (fn [_ctx evt]
                        (:evt/type evt)))

(defn propagate-user-delta-to-user!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} u delta]
  (let [uid (:xt/id u)
        evt {:event/type (:gatz.crdt.user/action delta)
             :event/data {:user (crdt.user/->value u)
                          :delta (crdt/-value delta)}}]
    ;; 1. Connections for the same user want to hear everything
    (doseq [ws (conns/user-wss @conns-state uid)]
      (jetty/send! ws (json/write-str evt)))))

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
  (comment
    (let [db (xtdb/db node)
          u (db.user/by-id db (:evt/uid evt))]
      (propagate-user-delta-to-user! ctx u (:evt/data evt))
      (propagate-user-delta-to-friends! ctx u (:evt/data evt))))
  nil)

(defmethod handle-evt! :message.crdt/delta
  [{:keys [biff.xtdb/node] :as ctx} evt]
  (let [db (xtdb/db node)
        did (:evt/did evt)
        mid (:evt/mid evt)
        discussion (db.discussion/by-id db did)
        message (crdt.message/->value (db.message/by-id db mid))]
    (propagate-message-delta! ctx message (:evt/data evt))
    (api.message/handle-message-evt! ctx discussion message evt)))

(defn propagate-new-message!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} did m]
  (let [db (xtdb/db node)
        d (db.discussion/by-id db did)
        evt {:event/type :event/new_message
             :event/data {:message m
                          :discussion (crdt.discussion/->value d)
                          :did did
                          :mid (:xt/id m)}}]
    (doseq [ws (conns/did->wss @conns-state did)]
      (jetty/send! ws (json/write-str evt)))))

(defn register-new-discussion!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} did]
  (let [db (xtdb/db node)
        {:keys [discussion messages user_ids]} (db/discussion-by-id db did)
        members (:discussion/members discussion)
        msg {:event/type :event/new_discussion
             :event/data {:discussion (crdt.discussion/->value discussion)
                          :messages (mapv crdt.message/->value messages)
                          :users (mapv (comp crdt.user/->value
                                             (partial db.user/by-id db))
                                       user_ids)}}
        conns @conns-state
        wss (mapcat (partial conns/user-wss conns) members)]
    ;; register these users to listen to the discussion
    (swap! conns-state conns/add-users-to-d {:did did :user-ids members})
    (doseq [ws wss]
      (jetty/send! ws (json/write-str msg)))))

(defmethod handle-evt! :discussion.crdt/delta
  [ctx evt]
  (let [action-type (get-in evt [:evt/data :discussion.crdt/action])]
    (when (= :discussion.crdt/new action-type)
      (register-new-discussion! ctx (:evt/did evt)))
    (when (= :discussion.crdt/append-message action-type)
      (let [db (xtdb/db (:biff.xtdb/node ctx))
            did (:evt/did evt)
            mid (:evt/mid evt)
            m (gatz.db.message/by-id db mid)]
        (propagate-new-message! ctx did (crdt.message/->value m))))))

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
        (when (= :gatz/evt (:db/type evt))
          (try
            (handle-evt! ctx evt)
            (catch Exception e
              (println "Exception handler threw an error" e))))))))


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

                 ["/file/presign" {:post api.media/presigned-url!}]
                 ["/media" {:post api.media/create-media!}]

                 ["/message" {:post api.discussion/create-message!}]
                 ["/message/delete" {:post api.message/delete-message!}]
                 ["/message/edit" {:post  api.message/edit-message!}]
                 ["/message/react" {:post api.message/react-to-message!}]
                 ["/message/undo-react" {:post api.message/undo-react-to-message!}]

                 ["/feed/posts" {:get api.discussion/feed}]
                 ["/feed/active" {:get api.discussion/active}]

                 ["/contact" {:get api.contacts/get-contact}]
                 ["/contacts" {:get api.contacts/get-all-contacts}]
                 ["/contact/request" {:post api.contacts/handle-request!}]
                 ["/contact/share-link" {:post api.contacts/post-invite-link}]

                 ["/group" {:get api.group/get-group
                            :post api.group/create!}]
                 ["/group/request" {:post api.group/handle-request!}]
                 ["/group/share-link" {:post api.group/post-invite-link}]

                 ["/invite-link" {:get api.invite-link/get-invite-link}]
                 ["/invite-link/join" {:post api.group/post-join-invite-link}]

                 ["/discussions" {:get  api.discussion/get-full-discussions
                                  :post api.discussion/create-discussion!}]
                 ["/discussion" {:get   api.discussion/get-discussion}]
                 ["/discussion/mark-many-seen" {:post api.discussion/mark-many-seen!}]
                 ;; this route is deprecated should be removed when all clients
                 ;; are upgraded
                 ["/discussion/mark-seen" {:post  api.discussion/mark-seen!}]
                 ["/discussion/mark-message-seen" {:post api.discussion/mark-message-read!}]
                 ["/discussion/archive" {:post api.discussion/archive!}]
                 ["/discussion/subscribe" {:post api.discussion/subscribe-to-discussion!}]
                 ["/discussion/unsubscribe" {:post api.discussion/unsubscribe-to-discussion!}]]]})
