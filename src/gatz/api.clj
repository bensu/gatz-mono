(ns gatz.api
  "All the operations but in an API"
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.data.json :as json]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [gatz.auth :as auth]
            [gatz.connections :as conns]
            [gatz.db :as db]
            [gatz.notify :as notify]
            [malli.transform :as mt]
            [ring.adapter.jetty9 :as jetty]
            [sdk.twilio :as twilio]
            [sdk.s3 :as s3]
            [xtdb.api :as xt]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

;; ======================================================================
;; User

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))

(defn get-me
  [{:keys [biff/db auth/user-id] :as _ctx}]
  (let [user (db/user-by-id db user-id)]
    (json-response {:user user})))

(defn get-user
  [{:keys [params biff/db] :as _ctx}]
  (if-let [user-id (some-> (:user-id params) mt/-string->uuid)]
    (let [user (db/user-by-id db user-id)]
      (json-response {:user user}))
    {:status 400 :body "invalid params"}))

(defn create-user!
  [{:keys [params] :as ctx}]
  (if-let [username (some-> (:username params) str/trim)]
    (if (db/valid-username? username)
      (let [user (db/create-user! ctx {:username username})]
        (json-response {:user user}))
      (err-resp "invalid_username" "Username is invalid"))
    (err-resp "username_taken" "Username is already taken")))

(defn add-push-token!
  [{:keys [params auth/user-id] :as ctx}]
  (if-let [push-token (:push_token params)]
    (let [new-token {:push/service :push/expo
                     :push/token push-token
                     :push/created_at (java.util.Date.)}
          user (db/add-push-token! ctx {:user-id user-id
                                        :push-token {:push/expo new-token}})]
      (json-response {:status "success" :user user}))
    (err-resp "push_token_missing" "Missing push token parameter")))

(defn disable-push!
  [{:keys [auth/user-id] :as ctx}]
  (let [user (db/remove-push-tokens! ctx user-id)]
    (json-response {:status "success" :user user})))

(defn sign-in!
  [{:keys [params biff/db] :as _ctx}]
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (if-let [user (db/user-by-name db username)]
      (json-response {:user user
                      :token (auth/create-auth-token (:xt/id user))})
      (err-resp "user_not_found" "Username not found"))
    (err-resp "invalid_username" "Invalid username")))

(defn clean-username [s] (-> s str/trim))

(defn clean-phone
  "The standard format is +{AREA}{NUMBER} without separators. Examples:

   +14159499931
   +16507919090
   +5491137560419"
  [phone]
  (let [only-numbers (some-> phone (str/replace #"[^0-9]" ""))]
    (some->> only-numbers (str "+"))))

;; TODO: use a proper validation function
(defn valid-phone?
  "Strips the phone number of all non-numeric characters, then check if it's a valid phone number. "
  [phone]
  (let [phone (or (some-> phone clean-phone) "")]
    (and (not-empty phone)
         (<= 9 (count phone)))))

;; TODO: do params validation
(defn sign-up!
  [{:keys [params biff/db] :as ctx}]
  (if-let [username (some-> (:username params) clean-username)]
    (if-let [phone (some-> (:phone_number params) clean-phone)]
      (cond
        (some? (db/user-by-name db username))
        (err-resp "username_taken" "Username is already taken")

        (some? (db/user-by-phone db phone))
        (err-resp "phone_taken" "Phone is already taken")

        (not (db/valid-username? username))
        (err-resp "invalid_username" "Username is invalid")

        :else
        (let [user (db/create-user! ctx {:username username :phone phone})]
          (json-response {:type "sign_up"
                          :user user
                          :token (auth/create-auth-token (:xt/id user))})))
      (err-resp "invalid_phone" "Invalid phone number"))
    (err-resp "invalid_username" "Invalid username")))

(defn clean-code [s] (-> s str/trim))

(defn twilio-to-response [v]
  {:id (:sid v)
   :status (:status v)
   :attempts (- 6 (count (:send_code_attempts v)))})

(defn verify-phone! [{:keys [params biff/db biff/secret] :as _ctx}]
  (let [{:keys [phone_number]} params
        phone (clean-phone phone_number)]
    (if-not (valid-phone? phone)
      (err-resp "invalid_phone" "Invalid phone number")
      (let [v (twilio/start-verification! secret {:phone phone})]
        (json-response (merge {:phone_number phone}
                              (twilio-to-response v)
                              (when-let [user (db/user-by-phone db phone)]
                                {:user user})))))))

(defn verify-code! [{:keys [params biff/secret biff/db] :as _ctx}]
  (let [{:keys [phone_number code]} params
        phone (clean-phone phone_number)
        code (clean-code code)
        v (twilio/check-code! secret {:phone phone :code code})
        approved? (= "approved" (:status v))]
    (json-response
     (merge {:phone_number phone}
            (twilio-to-response v)
            (when-not approved?
              {:status "wrong_code"})
            (when approved?
              (when-let [user (db/user-by-phone db phone)]
                {:user user
                 :token (auth/create-auth-token (:xt/id user))}))))))

(defn check-username [{:keys [params biff/db] :as _ctx}]
  (let [{:keys [username]} params
        existing-user (db/user-by-name db username)]
    (json-response {:username username :available (nil? existing-user)})))

;; ====================================================================== 
;; Discussions 

(defmacro if-authorized-for-discussion [[user-id d] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (nil? ~d) (err-resp "discussion_not_found" "Discussion not found")
     (contains? (:discussion/members ~d) ~user-id) (do ~@body)
     :else (err-resp "not_in_discussion" "You are not in this discussion")))

(defmacro if-admin-for-discussion [[user-id d] & body]
  `(cond
     (nil? ~user-id) (err-resp "not_logged_in" "You are not logged in")
     (nil? ~d) (err-resp "discussion_not_found" "Discussion not found")
     (= (:discussion/created_by ~d) ~user-id)
     (do ~@body)
     :else (err-resp "not_admin" "You are not an admin for this discussion")))

(defn get-discussion [{:keys [biff/db params auth/user-id] :as _ctx}]
  (let [did (mt/-string->uuid (:id params))
        {:keys [discussion messages user_ids]} (db/discussion-by-id db did)]
    (if-authorized-for-discussion
     [user-id discussion]
     (json-response {:discussion discussion
                     :users (map (partial db/user-by-id db) user_ids)
                     :messages messages}))))

(defn mark-seen! [{:keys [biff/db auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        d (db/d-by-id db did)]
    (if-authorized-for-discussion
     [user-id d]
     (let [d (db/mark-as-seen! ctx user-id did (java.util.Date.))
           {:keys [messages user_ids]} (db/discussion-by-id db did)]
       (json-response {:discussion d
                       :users (map (partial db/user-by-id db) user_ids)
                       :messages messages})))))

(defn archive! [{:keys [biff/db auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [did (mt/-string->uuid (:did params))
        d (db/d-by-id db did)]
    (if-authorized-for-discussion
     [user-id d]
     (let [d (db/archive! ctx user-id did (java.util.Date.))
           {:keys [messages user_ids]} (db/discussion-by-id db did)]
       (json-response {:discussion d
                       :users (map (partial db/user-by-id db) user_ids)
                       :messages messages})))))

(def discussion-fetch-batch 20)

;; discrepancy in how this gets params
(defn get-full-discussions [{:keys [biff/db auth/user-id params] :as _ctx}]
  (let [dis (if-let [older-than-ts (some->> (:last_did params)
                                            mt/-string->uuid
                                            (db/discussion-by-id db)
                                            :discussion
                                            :discussion/created_at)]
              (db/discussions-by-user-id-older-than db user-id older-than-ts discussion-fetch-batch)
              (db/discussions-by-user-id-up-to db user-id discussion-fetch-batch))
        ds (map (partial db/discussion-by-id db) dis)
        users (db/all-users db)]
    (json-response {:discussions ds :users users})))

;; TODO: validate all params at the API level, not the db level
;; TODO: members are not validated as existing
(defn create-discussion! [{:keys [params biff/db] :as ctx}]
  (def -dctx ctx)
  (if-let [post-text (:text params)]
    (if-not (db/valid-post? post-text (:media_id params))
      (err-resp "invalid_post" "Invalid post")
      (let [{:keys [discussion message]} (db/create-discussion-with-message! ctx params)]
        (json-response
         {:discussion discussion
          :users (mapv (partial db/user-by-id db) (:discussion/members discussion))
          :messages [message]})))
    (let [{:keys [discussion/members] :as discussion}
          (db/create-discussion! ctx params)]
      (json-response
       {:discussion discussion
        :users (mapv (partial db/user-by-id db) members)
        :messages []}))))

(defn add-member! [{:keys [params auth/user-id biff/db] :as ctx}]
  (let [did (mt/-string->uuid (:discussion_id params))
        uid (mt/-string->uuid (:user_id params))]
    (if (and (uuid? did) (uuid? did))
      (let [d (db/d-by-id db did)]
        (if-admin-for-discussion
         [user-id d]
         (let [d (db/add-member! ctx {:discussion/id did :user/id uid})]
           (json-response {:discussion d}))))
      {:status 400 :body "invalid params"})))

;; ====================================================================== 
;; Messages

(defn create-message! [{:keys [params biff/db auth/user-id] :as ctx}]
  (def -mctx ctx)
  (let [{:keys [text id discussion_id]} params
        mid (let [uid (some-> id mt/-string->uuid)]
              (if (uuid? uid) uid (random-uuid)))
        media-id (some-> (:media_id params) mt/-string->uuid)
        did (mt/-string->uuid discussion_id)
        d (db/d-by-id db did)]
    (if-authorized-for-discussion
     [user-id d]
     (let [msg (db/create-message! ctx {:did did
                                        :mid mid
                                        :text text
                                        :media_id media-id})]
       (when (nil? (:discussion/first_message d))
         #_(future
             (notify/new-discussion-to-members! ctx d msg)))
       (json-response {:message msg})))))

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
                                                              :user-discussions ds}))
                         (jetty/send! ws (json/write-str
                                          (connection-response user-id conn-id)))
                         (db/mark-user-active! ctx user-id))
           :on-close (fn [ws status-code reason]
                       (let [db (xt/db node)
                             ds (or (db/discussions-by-user-id db user-id) #{})]
                         (swap! conns-state conns/remove-conn {:user-id user-id
                                                               :conn-id conn-id
                                                               :user-discussions ds}))
                       (jetty/send! ws (json/write-str
                                        {:reason reason
                                         :status status-code
                                         :conn-id conn-id
                                         :user-id user-id}))
                       (db/mark-user-active! ctx user-id))
           :on-text (fn [ws text]
                      (println "on-text" text)
                      (jetty/send! ws (json/write-str {:conn-id conn-id :user-id user-id :echo text :state @conns-state}))
                      ;; TODO: create discussion or add member 
                      ;; are special because they change the conns-state
                      )}))
       {:status 400 :body "Invalid user"}))))

;; TODO: fix to send message
(defn on-new-message [{:keys [biff.xtdb/node conns-state] :as nctx} tx]
  (println "tx:" tx)
  (let [db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)]
      (when (= op ::xt/put)
        (let [[message] args]
          ;; TODO: replace with :db/type = :gatz/message
          (when (and (contains? message :message/text)
                     (nil? (xt/entity db-before (:xt/id message))))
            (let [db-after (xt/db node)
                  did (:message/did message)
                  full-message (db/full-message-by-id db-after (:xt/id message))
                  msg {:event/type :event/new_message
                       :event/data {:message full-message :did did}}
                  wss (conns/did->wss @conns-state did)]
              (doseq [ws wss]
                (jetty/send! ws (json/write-str msg))))))))))

;; TODO: if a user is added to a discussion, they should be registered too

(defn on-new-discussion [{:keys [biff.xtdb/node conns-state] :as ctx} tx]
  (def -ctx ctx)
  (def -tx tx)
  (println "tx:" tx)
  (let [db-after (xt/db node)
        db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)]
      (when (= op ::xt/put)
        (let [[d] args]
          ;; TODO: replace with :db/type = :gatz/message
          ;; TODO: this way of detecting if the discussion is new is not reliable
          (when (and (contains? d :discussion/members)
                     (nil? (xt/entity db-before (:xt/id d))))
            (let [members (:discussion/members d)
                  did (:xt/id d)
                  {:keys [discussion messages user_ids]} (db/discussion-by-id db-after did)
                  msg {:event/type :event/new_discussion
                       :event/data {:discussion discussion
                                    :messages messages
                                    :users (mapv (partial db/user-by-id db-after) user_ids)}}
                  conns @conns-state
                  wss (mapcat (partial conns/user-wss conns) members)]
              ;; register these users to listen to the discussion
              (swap! conns-state conns/add-users-to-d {:did did :user-ids members})
              (doseq [ws wss]
                (println "sending " msg)
                (jetty/send! ws (json/write-str msg))))))))))



#_(defn on-new-subscription [{:keys [biff.xtdb/node] :as ctx} tx]
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
  (let [file (headers->file headers)
        contents (json/read-str (slurp file))]
    {:status 200
    ;;  :headers (get contents "headers")
     :body (json/write-str (get contents "body"))}))

(def folders #{"media" "avatars"})

(defn presigned-url! [{:keys [params] :as ctx}]
  (let [folder (get params :folder)]
    (if (contains? folders folder)
      (let [id (random-uuid)
            k  (format "%s/%s" folder id)
            presigned (.toString
                       (s3/presigned-url! ctx k))]
        (json-response {:id id
                        :presigned_url presigned
                        :url (s3/make-path k)}))
      (err-resp "invalid_folder" "Invalid folder"))))

(defn update-avatar!
  [{:keys [params auth/user-id] :as ctx}]
  (if-let [url (:file_url params)]
    (let [user (db/update-user-avatar! ctx user-id url)]
      (json-response {:user user}))
    (err-resp "invalid_file_url" "Invalid file url")))

(def media-kinds (set (map name db/media-kinds)))

(defn str->media-kind [s]
  {:pre [(string? s)
         (contains? media-kinds s)]}
  (keyword "media" s))

;; TODO: fill in the other elements of the media type
;; TODO: this should be authenticated
(defn create-media!
  [{:keys [params] :as ctx}]
  (def -ctx ctx)
  (if (and (string? (:file_url params))
           (string? (:kind params))
           (contains? media-kinds (:kind params)))
    (if-let [id (some-> (:id params) mt/-string->uuid)]
      (if-let [media-kind (str->media-kind (:kind params))]
        (let [media (db/create-media! ctx {:kind media-kind
                                           :id id
                                      ;; :mime (:mime params)
                                      ;; :size (:size params)
                                           :url (:file_url params)})]
          (json-response {:media media}))
        (err-resp "invalid_media_type" "Invalid media type"))
      (err-resp "invalid_id" "Invalid id"))
    (err-resp "invalid_params" "Invalid params")))



(def plugin
  {:on-tx on-tx
   :api-routes [["/ws" {:middleware [auth/wrap-api-auth]}
                 ["/connect" {:get start-connection}]]
                 ;; unauthenticated
                ["/api"
                 ["/signin" {:post sign-in!}]
                 ["/signup" {:post sign-up!}]

                 ["/verify/start" {:post verify-phone!}]
                 ["/verify/code" {:post verify-code!}]
                 ["/user/check-username" {:post check-username}]]

                ;; authenticated
                ["/api" {:middleware [auth/wrap-api-auth]}
                 ["/log-request" {:post log-request}]
                 ["/log-response" {:get cached-log
                                   :post cached-log}]
                 ["/me" {:get get-me}]
                 ["/user/push-token" {:post add-push-token!}]
                 ["/user/disable-push" {:post disable-push!}]
                 ["/user/avatar" {:post update-avatar!}]

                 ["/file/presign" {:post presigned-url!}]
                 ["/media" {:post create-media!}]

                 ;; converted
                 ["/user" {:get get-user
                           :post create-user!}]
                 ["/message" {:post create-message!}]
                 ["/discussions" {:get get-full-discussions
                                  :post create-discussion!}]
                 ["/discussion" {:get get-discussion}]
                 ["/discussion/mark-seen" {:post mark-seen!}]
                 ["/discussion/archive" {:post archive!}]]]})
