(ns gatz.api
  "All the operations but in an API"
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [gatz.connections :as conns]
            [gatz.db :as db]
            [clojure.data.json :as json]
            [clojure.java.io :as io]
            [malli.transform :as mt]
            [ring.adapter.jetty9 :as jetty]
            [xtdb.api :as xt]
            [gatz.auth :as auth]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

;; ======================================================================
;; User

(defn get-user
  [{:keys [params biff/db] :as _ctx}]
  (if-let [user-id (some-> (:user-id params) mt/-string->uuid)]
    (let [user (db/user-by-id db user-id)]
      (json-response {:user user}))
    {:status 400 :body "invalid params"}))

(defn create-user!
  [{:keys [params] :as ctx}]
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (let [user (db/create-user! ctx {:username username})]
      (json-response {:user user}))
    {:status 400 :body "invalid params"}))

(defn sign-in!
  [{:keys [params biff/db] :as ctx}]
  (def -ctx ctx)
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (if-let [user (db/user-by-name db username)]
      (json-response {:user user
                      :token (auth/create-auth-token (:xt/id user))})
      {:status 400 :body "User not found"})
    {:status 400 :body "invalid params"}))

;; ====================================================================== 
;; Discussions 

(defn get-discussion [{:keys [biff/db params] :as _ctx}]
  (let [did (mt/-string->uuid (:id params))
        {:keys [discussion messages user-ids]} (db/discussion-by-id db did)]
    (json-response {:discussion discussion
                    :users (map (partial db/user-by-id db) user-ids)
                    :messages messages})))

;; discrepancy in how this gets params
(defn get-full-discussions [{:keys [biff/db auth/user-id] :as _ctx}]
  (def -dctx _ctx)
  (let [dis (db/discussions-by-user-id db user-id)
        ds (map (partial db/discussion-by-id db) dis)
        users (db/all-users db)]
    (json-response {:discussions ds :users users})))

(defn create-discussion! [{:keys [params] :as ctx}]
  (def -ctx ctx)
  (let [d (db/create-discussion! ctx params)]
    (json-response {:discussion d})))

(defn add-member! [{:keys [params auth/user-id] :as ctx}]
  (let [did (mt/-string->uuid (:discussion_id params))
        uid (mt/-string->uuid (:user_id params))]
    (if (and (uuid? did) (uuid? did))
      ;; check if auth/id is admin
      (let [d (db/add-member! ctx {:discussion/id did :user/id uid})]
        (json-response {:discussion d}))
      {:status 400 :body "invalid params"})))

;; ====================================================================== 
;; Messages

(defn create-message! [{:keys [params] :as ctx}]
  (def -mctx ctx)
  (let [msg (db/create-message! ctx params)]
    (json-response {:message msg})))

(defn fetch-messages [db]
  (q db
     '{:find (pull msg [*])
                 ;; TODO: better index to get all the messages
       :where [[msg :text _]]}))

(defn delete-msg! [ctx msg-id]
  (biff/submit-tx ctx
                  [{:db/op :delete
                    :xt/id msg-id}]))

;; ====================================================================== 
;; Websocket

;; export type ConnectionOpen<
;;   StreamChatGenerics extends ExtendableGenerics = DefaultGenerics
;; > = {
;;   connection_id: string;
;;   cid?: string;
;;   created_at?: string;
;;   me?: OwnUserResponse<StreamChatGenerics>;
;;   type?: string;
;; };

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
     (if-let [user (some->> user-id (db/user-by-id db))]
       (let [user-id (:xt/id user)
             conn-id (random-uuid)]
         (jetty/ws-upgrade-response
          {:on-connect (fn [ws]
                         (let [db (xt/db node)
                               ds (or (db/discussions-by-user-id db user-id) #{})]
                           (swap! conns-state conns/add-conn {:ws ws
                                                              :user-id user-id
                                                              :conn-id conn-id
                                                              :user-channels ds}))
                         (jetty/send! ws (json/write-str (connection-response user-id conn-id))))
           :on-close (fn [ws status-code reason]
                       (let [db (xt/db node)
                             ds (or (db/discussions-by-user-id db user-id) #{})]
                         (swap! conns-state conns/remove-conn {:user-id user-id
                                                               :conn-id conn-id
                                                               :user-channels ds}))
                       (jetty/send! ws (json/write-str {:reason reason :status status-code :conn-id conn-id :user-id user-id})))
           :on-text (fn [ws text]
                      (println "on-text" text)
                      (jetty/send! ws (json/write-str {:conn-id conn-id :user-id user-id :echo text :state @conns-state}))
                      #_(let [{:keys [ch-id message]} (json/read-str text)]
                      ;; TODO: create channel or add member to channel 
                      ;; are special because they change the conns-state
                          ))}))
       {:status 400 :body "Invalid user"}))))

;; TODO: fix to send message
(defn on-new-message [{:keys [biff.xtdb/node conns-state] :as nctx} tx]
  (def -nctx nctx)
  (println "tx:" tx)
  (let [db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)]
      (when (= op ::xt/put)
        (let [[message] args]
          ;; TODO: replace with :db/type = :gatz/message
          (when (and (contains? message :message/text)
                     (nil? (xt/entity db-before (:xt/id message))))
            (let [did (:message/did message)
                  msg {:event/type :event/new_message
                       :event/data {:message message :did did}}
                  wss (conns/ch-id->wss @conns-state did)]
              (doseq [ws wss]
                (jetty/send! ws (json/write-str msg))))))))))

;; TODO: if a user is added to a discussion, they should be registered too

(defn on-new-discussion [{:keys [biff.xtdb/node conns-state] :as nctx} tx]
  (def -dctx nctx)
  (println "tx:" tx)
  (let [db-after (xt/db node)
        db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)]
      (when (= op ::xt/put)
        (let [[d] args]
          ;; TODO: replace with :db/type = :gatz/message
          (when (and (contains? d :discussion/members)
                     (nil? (xt/entity db-before (:xt/id d))))
            (let [members (:discussion/members d)
                  did (:xt/id d)
                  msg {:event/type :event/new_discussion
                       :event/data (db/discussion-by-id db-after did)}
                  conns @conns-state
                  wss (mapcat (partial conns/user-wss conns) members)]
              ;; register these users to listen to the channel
              (swap! conns-state conns/add-users-to-ch {:ch-id did :user-ids members})
              (doseq [ws wss]
                (println msg)
                (jetty/send! ws (json/write-str msg))))))))))



(defn on-new-subscription [{:keys [biff.xtdb/node] :as ctx} tx]
  (let [db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)
            :when (= op ::xt/put)
            :let [[doc] args]
            :when (and (contains? doc :sub/url)
                       (nil? (xt/entity db-before (:xt/id doc))))]
      (biff/submit-job ctx :fetch-rss (assoc doc :biff/priority 0)))))

(defn on-tx [ctx tx]
  (println "new txn" tx)
  (on-new-message ctx tx)
  (on-new-discussion ctx tx)
  #_(on-new-subscription ctx tx))


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
  (def -log-ctx _ctx)
  (let [file (headers->file headers)
        contents (json/read-str (slurp file))]
    {:status 200
    ;;  :headers (get contents "headers")
     :body (json/write-str (get contents "body"))}))

(def plugin
  {:api-routes [["/ws" {:middleware [auth/wrap-api-auth]}
                 ["/connect" {:get start-connection}]]
                 ;; unauthenticated
                ["/api"
                 ["/signin" {:post sign-in!}]]

                ;; authenticated
                ["/api" {:middleware [auth/wrap-api-auth]}
                 ["/log-request" {:post log-request}]
                 ["/log-response" {:get cached-log
                                   :post cached-log}]
                 ;; converted
                 ["/user" {:get get-user
                           :post create-user!}]
                 ["/message" {:post create-message!}]
                 ["/discussions" {:get get-full-discussions
                                  :post create-discussion!}]
                 ["/discussion" {:get get-discussion}]]]
   :on-tx on-tx})
