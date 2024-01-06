(ns gatz.api
  "All the operations but in an API"
  (:require [com.biffweb :as biff :refer [q]]
            [gatz.subscriptions :as sub]
            [gatz.connections :as conns]
            [gatz.db :as db]
            [gatz.ui :as ui]
            [clojure.string :as str]
            [clojure.data.json :as json]
            [clojure.java.io :as io]
            [malli.transform :as mt]
            [ring.adapter.jetty9 :as jetty]
            [xtdb.api :as xt]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

;; ====================================================================== 
;; App config

(def default-app-config {:name "Gatz"})

(defn get-app-settings [_ctx]
  {:status 200
   :body (json/write-str {:app default-app-config})})

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
  (def -ctx ctx)
  ;; TODO: do params validation
  (if-let [username (:username params)]
    (let [user (db/create-user! ctx {:username username})]
      (json-response {:user user}))
    {:status 400 :body "invalid params"}))

;; ======================================================================
;; Channel

(defn get-channels [{:keys [biff/db] :as ctx}]
  (let [chs (q db
               '{:find (pull ch [*])
                 ;; TODO: better index to get all the messages
                 :where [[ch :type "messaging"]]})]
    (json-response {:channels chs})))

;; ====================================================================== 
;; Channels

(defn get-channel [{:keys [biff/db params] :as ctx}]
  (let [ch-id (mt/-string->uuid (:channel_id params))]
    (json-response (db/channel-by-id db ch-id))))

(defn get-full-channels [{:keys [biff/db] :as ctx}]
  (let [chs (q db
               '{:find (pull ch [*])
                 ;; TODO: better index to get all the messages
                 :where [[ch :type "messaging"]]})
        channels (map (partial db/channel-by-id db) (map :xt/id chs))]
    (json-response {:channels channels})))

(defn create-channel! [{:keys [params] :as ctx}]
  (def -ctx ctx)
  (let [channel (db/create-channel! ctx params)]
    (json-response {:channel channel})))

;; ====================================================================== 
;; Messages

(defn create-message! [{:keys [params] :as ctx}]
  (def -mctx ctx)
  (let [msg (db/create-message! ctx params)]
    (json-response {:message msg}))
  #_(let [now (java.util.Date.)
          message (:message params)
          msg-id (random-uuid)
          content (:text message)
          ch-id (:channel_id message)
          ch-id (if (string? ch-id)
                  (mt/-string->uuid ch-id)
                  (:channel_id params))
          msg {:db/doc-type :message
               :xt/id msg-id
               :cid ch-id
               :created_at now
               :updated_at now
               :type "regular"
               :channel_id ch-id
               :user db/test-user-id
               :mentioned_users []

               :text content
               :html (str "<p>" content "</p>")

               :pinned false
               :pinned_by nil
               :pin_expires nil
               :pinned_at nil

               :shadowed false
               :silent false

               :reply_count 0
               :deleted_reply_count 0

               :latest_reactions []
               :own_reactions []
               :reaction_counts {}
               :reaction_scores {}

               :attachments []}]
      #_msg
      (biff/submit-tx ctx [msg])
      (json-response {:msg msg})))

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
   :user-id user-id
   :created_at (java.util.Date.)})

;; TODO: how to catch and handle errors that are happening in the websocket?
(defmacro try-print [& body]
  `(try
     ~@body
     (catch Exception e#
       (def -e e#)
       (println e#))))

(defn start-connection
  [{:keys [conns-state params biff/db biff.xtdb/node] :as ctx}]
  (assert conns-state)
  (when (jetty/ws-upgrade-request? ctx)
    ;; TODO: asert this user is actually in the database
    (try-print
     (if-let [user (some->> (:user_id params)
                            mt/-string->uuid
                            (db/user-by-id db))]
       (let [user-id (:xt/id user)
             conn-id (random-uuid)]
         (jetty/ws-upgrade-response
          {:on-connect (fn [ws]
                         (let [db (xt/db node)
                               channels (or (db/channels-by-user-id db user-id) #{})]
                           (swap! conns-state conns/add-conn {:user-id user-id
                                                              :conn-id conn-id
                                                              :user-channels channels}))
                         (jetty/send! ws (json/write-str (connection-response user-id conn-id))))
           :on-close (fn [ws status-code reason]
                       (let [db (xt/db node)
                             channels (or (db/channels-by-user-id db user-id) #{})]
                         (swap! conns-state conns/remove-conn {:user-id user-id
                                                               :conn-id conn-id
                                                               :user-channels channels}))
                       (jetty/send! ws (json/write-str {:reason reason :status status-code :conn-id conn-id :user-id user-id})))
           :on-text (fn [ws text]
                      (println "on-text" text)
                      (jetty/send! ws (json/write-str {:conn-id conn-id :user-id user-id :echo text :state @conns-state}))
                      #_(let [{:keys [ch-id message]} (json/read-str text)]
                      ;; TODO: create channel or add member to channel 
                      ;; are special because they change the conns-state
                          ))}))
       {:status 400 :body "Invalid user"}))))

(defn on-new-message [{:keys [biff.xtdb/node gatz/chat-clients]} tx]
  (println "tx:" tx)
  (let [db-before (xt/db node {::xt/tx-id (dec (::xt/tx-id tx))})]
    (doseq [[op & args] (::xt/tx-ops tx)]
      (when (= op ::xt/put)
        (let [[doc] args]
          (when (and (contains? doc :text)
                     (nil? (xt/entity db-before (:xt/id doc))))
            (let [msg {:message doc
                       :cid (:cid doc)}]
              (println "ws"  (get @chat-clients (:cid doc)))
              (doseq [ws (get @chat-clients (:cid doc))]
                (println "sending to ws" ws)
                (println msg)
                (jetty/send! ws msg)))))))))

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
  (on-new-subscription ctx tx))











(defn new-community [{:keys [session] :as ctx}]
  (let [comm-id (random-uuid)]
    (biff/submit-tx ctx
                    [{:db/doc-type :community
                      :xt/id comm-id
                      :comm/title (str "Community #" (rand-int 1000))}
                     {:db/doc-type :membership
                      :mem/user (:uid session)
                      :mem/comm comm-id
                      :mem/roles #{:admin}}])
    {:status 303
     :headers {"Location" (str "/community/" comm-id)}}))

(defn join-community [{:keys [user community] :as ctx}]
  (biff/submit-tx ctx
                  [{:db/doc-type :membership
                    :db.op/upsert {:mem/user (:xt/id user)
                                   :mem/comm (:xt/id community)}
                    :mem/roles [:db/default #{}]}])
  {:status 303
   :headers {"Location" (str "/community/" (:xt/id community))}})

#_(defn new-channel [{:keys [community roles] :as ctx}]
    (if (and community (contains? roles :admin))
      (let [chan-id (random-uuid)]
        (biff/submit-tx ctx
                        [{:db/doc-type :channel
                          :xt/id chan-id
                          :chan/title (str "Channel #" (rand-int 1000))
                          :chan/comm (:xt/id community)}])
        {:status 303
         :headers {"Location" (str "/community/" (:xt/id community) "/channel/" chan-id)}})
      {:status 403
       :body "Forbidden."}))

(defn delete-channel [{:keys [biff/db channel roles] :as ctx}]
  (when (contains? roles :admin)
    (biff/submit-tx ctx
                    (for [id (conj (q db
                                      '{:find msg
                                        :in [channel]
                                        :where [[msg :msg/channel channel]]}
                                      (:xt/id channel))
                                   (:xt/id channel))]
                      {:db/op :delete
                       :xt/id id})))
  [:<>])

(defn community [{:keys [biff/db user community] :as ctx}]
  (let [member (some (fn [mem]
                       (= (:xt/id community) (get-in mem [:mem/comm :xt/id])))
                     (:user/mems user))]
    (ui/app-page
     ctx
     (if member
       [:<>
        [:.border.border-neutral-600.p-3.bg-white.grow
         "Messages window"]
        [:.h-3]
        [:.border.border-neutral-600.p-3.h-28.bg-white
         "Compose window"]]
       [:<>
        [:.grow]
        [:h1.text-3xl.text-center (:comm/title community)]
        [:.h-6]
        (biff/form
         {:action (str "/community/" (:xt/id community) "/join")
          :class "flex justify-center"}
         [:button.btn {:type "submit"} "Join this community"])
        [:div {:class "grow-[1.75]"}]]))))

(defn message-view [{:msg/keys [mem text created-at]}]
  (let [username (if (= :system mem)
                   "🎅🏻 System 🎅🏻"
                   (str "User " (subs (str mem) 0 4)))]
    [:div
     [:.text-sm
      [:span.font-bold username]
      [:span.w-2.inline-block]
      [:span.text-gray-600 (biff/format-date created-at "d MMM h:mm aa")]]
     [:p.whitespace-pre-wrap.mb-6 text]]))

(defn command-tx [{:keys [biff/db channel roles params]}]
  (let [subscribe-url (second (re-find #"^/subscribe ([^\s]+)" (:text params)))
        unsubscribe-url (second (re-find #"^/unsubscribe ([^\s]+)" (:text params)))
        list-command (= (str/trimr (:text params)) "/list")
        message (fn [text]
                  {:db/doc-type :message
                   :msg/mem :system
                   :msg/channel (:xt/id channel)
                   :msg/text text
                   ;; Make sure this message comes after the user's message.
                   :msg/created-at (biff/add-seconds (java.util.Date.) 1)})]
    (cond
      (not (contains? roles :admin))
      nil

      subscribe-url
      [{:db/doc-type :subscription
        :db.op/upsert {:sub/url subscribe-url
                       :sub/chan (:xt/id channel)}}
       (message (str "Subscribed to " subscribe-url))]

      unsubscribe-url
      [{:db/op :delete
        :xt/id (biff/lookup-id db :sub/chan (:xt/id channel) :sub/url unsubscribe-url)}
       (message (str "Unsubscribed from " unsubscribe-url))]

      list-command
      [(message (apply
                 str
                 "Subscriptions:"
                 (for [url (->> (q db
                                   '{:find (pull sub [:sub/url])
                                     :in [channel]
                                     :where [[sub :sub/chan channel]]}
                                   (:xt/id channel))
                                (map :sub/url)
                                sort)]
                   (str "\n - " url))))])))


(defn channel-page [{:keys [biff/db community channel] :as ctx}]
  (let [msgs (q db
                '{:find (pull msg [*])
                  :in [channel]
                  :where [[msg :msg/channel channel]]}
                (:xt/id channel))
        href (str "/community/" (:xt/id community)
                  "/channel/" (:xt/id channel))]
    (ui/app-page
     ctx
     [:.border.border-neutral-600.p-3.bg-white.grow.flex-1.overflow-y-auto#messages
      {:hx-ext "ws"
       :ws-connect (str href "/connect")
       :_ "on load or newMessage set my scrollTop to my scrollHeight"}
      (map message-view (sort-by :msg/created-at msgs))]
     [:.h-3]
     (biff/form
      {:hx-post href
       :hx-target "#messages"
       :hx-swap "beforeend"
       :_ (str "on htmx:afterRequest"
               " set <textarea/>'s value to ''"
               " then send newMessage to #messages")
       :class "flex"}
      [:textarea.w-full#text {:name "text"}]
      [:.w-2]
      [:button.btn {:type "submit"} "Send"]))))

(defn wrap-community [handler]
  (fn [{:keys [biff/db user path-params] :as ctx}]
    (if-some [community (xt/entity db (parse-uuid (:id path-params)))]
      (let [mem (->> (:user/mems user)
                     (filter (fn [mem]
                               (= (:xt/id community) (get-in mem [:mem/comm :xt/id]))))
                     first)
            roles (:mem/roles mem)]
        (handler (assoc ctx :community community :roles roles :mem mem)))
      {:status 303
       :headers {"location" "/app"}})))

(defn wrap-channel [handler]
  (fn [{:keys [biff/db user mem community path-params] :as ctx}]
    (let [channel (xt/entity db (parse-uuid (:chan-id path-params)))]
      (if (and (= (:chan/comm channel) (:xt/id community)) mem)
        (handler (assoc ctx :channel channel))
        {:status 303
         :headers {"Location" (str "/community/" (:xt/id community))}}))))

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
  {:api-routes [["/ws"
                 ["/connect" {:get start-connection}]]

                ["/api" ;; {:middleware [mid/wrap-signed-in]}
                 ["/log-request" {:post log-request}]
                 ["/log-response" {:get cached-log
                                   :post cached-log}]
                ;; converted
                 ["/app"           {:get get-app-settings}]
                 ["/user" {:get get-user
                           :post create-user!}]
                 ["/message" {:post create-message!}]

                 ["/channels" {:post get-full-channels
                             ;; :post new-channel
                               }]
                 ["/channel" {:post create-channel!
                              :get get-channel}]

                ;; from example
                 ["/community"     {:post new-community}]
                 ["/community/:id" {:middleware [wrap-community]}
                  [""      {:get community}]
                  ["/join" {:post join-community}]
                  ["/channel" {:post create-channel!}]
                  ["/channel/:chan-id" {:middleware [wrap-channel]}
                   ["" {:get channel-page
                        :post create-message!
                        :delete delete-channel}]
                  ;; ["/connect" {:get connect}]
                   ]]]]
   :on-tx on-tx})
