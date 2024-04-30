(ns gatz.api
  "All the operations but in an API"
  (:require [chime.core :as chime]
            [clojure.data.json :as json]
            [clojure.java.io :as io]
            [gatz.auth :as auth]
            [gatz.api.discussion :as api.discussion]
            [gatz.api.media :as api.media]
            [gatz.api.message :as api.message]
            [gatz.api.user :as api.user]
            [gatz.connections :as conns]
            [gatz.crdt.message :as crdt.message]
            [gatz.db :as db]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
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
                         (db.user/mark-user-active! ctx user-id))
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
                       (db.user/mark-user-active! ctx user-id))
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

(defmethod handle-evt! :message.crdt/delta
  [{:keys [biff.xtdb/node] :as ctx} evt]
  (let [db (xtdb/db node)
        did (:evt/did evt)
        mid (:evt/mid evt)
        discussion (db.discussion/by-id db did)
        message (crdt.message/->value (db.message/by-id db mid))]
    (propagate-message-delta! ctx message (:message.crdt/delta evt))
    (api.message/handle-message-evt! ctx discussion message evt)))

(defn propagate-new-message!
  [{:keys [conns-state] :as _ctx} did m]
  (let [evt {:event/type :event/new_message
             :event/data {:message m :did did :mid (:xt/id m)}}]
    (doseq [ws (conns/did->wss @conns-state did)]
      (jetty/send! ws (json/write-str evt)))))

(defn register-new-discussion!
  [{:keys [conns-state biff.xtdb/node] :as _ctx} did]
  (let [db (xtdb/db node)
        {:keys [discussion messages user_ids]} (db/discussion-by-id db did)
        members (:discussion/members discussion)
        msg {:event/type :event/new_discussion
             :event/data {:discussion discussion
                          :messages (mapv crdt.message/->value messages)
                          :users (mapv (partial db.user/by-id db) user_ids)}}
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
    (when (= :discussion.crdt/new-message action-type)
      (let [did (:evt/did evt)
            delta (get-in evt [:evt/data :discussion.crdt/delta])]
        (doseq [[_mid m] (:discussion/messages delta)]
          (propagate-new-message! ctx did (crdt.message/->value m)))))))

(defn on-evt! [ctx tx]
  (doseq [[op & args] (::xtdb/tx-ops tx)]
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

(defn headers->file [headers]
  (let [url (get headers "arena-url")
        method (get headers "arena-method")]
    (assert (and url method))
    (io/file (str "logs/" url "/" method ".log"))))

(defn log-request [{:keys [params headers] :as _ctx}]
  (let [log-id (random-uuid)
        file (headers->file headers)]
    (io/make-parents file)

    (spit file (str (json/write-str params) "\n\n"))
    #_(biff/submit-tx ctx
                      [{:db/doc-type :log
                        :xt/id log-id
                        :log/params params}])
    {:status 200
     :body (json/write-str {:log/id (str log-id) :params params})}))

(defn cached-log [{:keys [headers] :as _ctx}]
  (let [file (headers->file headers)
        contents (json/read-str (slurp file))]
    {:status 200
    ;;  :headers (get contents "headers")
     :body (json/write-str (get contents "body"))}))

(def alive-message {:status "ok"})

(defn ping-every-connection!
  [{:keys [conns-state] :as ctx}]
  ;; (println "pinging every connection")
  (let [all-wss (conns/all-wss @conns-state)
        msg (json/write-str alive-message)]
    (doseq [ws all-wss]
      (jetty/send! ws msg))))

(def plugin
  {:on-tx on-tx
   :tasks [{:task ping-every-connection!
            :schedule (fn []
                        (chime/periodic-seq (Instant/now) (Duration/ofSeconds 30)))}]

   :api-routes [["/ws" {:middleware [auth/wrap-api-auth]}
                 ["/connect" {:get start-connection}]]
                 ;; unauthenticated
                ["/api"
                 ["/signin" {:post api.user/sign-in!}]
                 ["/signup" {:post api.user/sign-up!}]

                 ["/verify/start" {:post api.user/verify-phone!}]
                 ["/verify/code" {:post api.user/verify-code!}]
                 ["/user/check-username" {:post api.user/check-username}]]

                ;; authenticated
                ["/api" {:middleware [auth/wrap-api-auth]}
                 ["/log-request" {:post log-request}]
                 ["/log-response" {:get cached-log
                                   :post cached-log}]
                 ["/me" {:get   api.user/get-me}]
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

                 ["/discussions" {:get  api.discussion/get-full-discussions
                                  :post api.discussion/create-discussion!}]
                 ["/discussion" {:get   api.discussion/get-discussion}]
                 ["/discussion/mark-many-seen" {:post api.discussion/mark-many-seen!}]
                 ;; this route is deprecated should be removed when all clients
                 ;; are upgraded
                 ["/discussion/mark-seen" {:post  api.discussion/mark-seen!}]
                 ["/discussion/mark-message-seen" {:post api.discussion/mark-message-seen!}]
                 ["/discussion/archive" {:post api.discussion/archive!}]
                 ["/discussion/subscribe" {:post api.discussion/subscribe-to-discussion!}]
                 ["/discussion/unsubscribe" {:post api.discussion/unsubscribe-to-discussion!}]]]})
