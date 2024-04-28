(ns gatz.notify
  (:require [clojure.set :as set]
            [chime.core :as chime]
            [gatz.db :as db]
            [gatz.db.message :as db.message]
            [sdk.expo :as expo]
            [xtdb.api :as xt])
  (:import [java.time LocalDateTime ZoneId Instant Duration]
           [java.util Date]))

(defn ->token [user]
  (get-in user [:user/push_tokens :push/expo :push/token]))

(def MAX_MESSAGE_LENGTH 30)

(defn message-preview [{:keys [message/text]}]
  (if (<= (count text) MAX_MESSAGE_LENGTH)
    text
    (str (subs text 0 MAX_MESSAGE_LENGTH) "...")))

(defn discussion-url [did]
  {:pre [(uuid? did)]}
  (str "/discussion/" did))

(defn new-discussion-to-members!
  [{:keys [biff.xtdb/node biff/secret] :as ctx}
   {:discussion/keys [members created_by] :as d}
   message]
  (let [db (xt/db node)
        id (:xt/id d)
        ;; _ (assert message "No messages in discussion")
        ;; creator doesn't need a notification
        creator (db/user-by-id db created_by)
        users (->> members
                   (remove (partial = created_by))
                   (keep (partial db/user-by-id db))
                   vec)
        title (format "%s started a discussion" (:user/name creator))
        body (message-preview message)
        url (discussion-url id)
        notifications (->> users
                           (keep #(get-in % [:user/push_tokens :push/expo :push/token]))
                           (mapv (fn [expo-token]
                                   {:expo/to expo-token
                                    :expo/title title
                                    :expo/body body
                                    :expo/data {:url url}})))]
    ;; TODO: check for notification preferences
    (when-not (empty? notifications)
      (expo/push-many! secret notifications))))

(defn render-friends [friends]

  {:pre  [(not (empty? friends)) (every? string? friends)]
   :post [(string? %)]}

  (let [n (count friends)]
    (cond
      (= 1 n) (first friends)
      (= 2 n) (let [[f1 f2] friends]
                (format "%s and %s" f1 f2))
      (= 3 n) (let [[f1 f2 f3] friends]
                (format "%s, %s, and %s" f1 f2 f3))
      :else (let [[f1 f2 & more] friends]
              (format "%s, %s, and %s more" f1 f2 (count more))))))

(defn render-activity [dids mids]
  {:post [(string? %)]}

  (let [n-dids (count dids)
        n-mids (count mids)]
    (condp = [(zero? n-dids) (zero? n-mids)]
      [true true]  "No activity"
      [true false] (format "%s new replies" n-mids)
      [false true]  (if (= 1 n-dids)
                      (format "%s new post" n-dids)
                      (format "%s new posts" n-dids))
      [false false] (condp = [(= 1 n-dids) (= 1 n-mids)]
                      [true true]   (format "%s new post, %s new reply" n-dids n-mids)
                      [true false]  (format "%s new post, %s new replies" n-dids n-mids)
                      [false true]  (format "%s new posts, %s new reply" n-dids n-mids)
                      [false false] (format "%s new posts, %s new replies" n-dids n-mids)))))

;; sebas replied to _your post_ | sebas replied to milan's post
;; Here goes the content of the reply

(defn render-comment-header [poster replier receiver]
  {:post [(string? %)]}
  (cond
    (= (:xt/id poster) (:xt/id receiver))
    (format "%s commented on your post" (:user/name replier))

    (= (:xt/id poster) (:xt/id replier))
    (format "%s commented on their own post" (:user/name replier))

    :else
    (format "%s commented on %s's post" (:user/name replier) (:user/name poster))))

(defn render-reply-header [replier]
  {:post [(string? %)]}
  (format "%s replied to your post" (:user/name replier)))

(defn render-at-mention-header [commenter]
  {:post [(string? %)]}
  (format "%s mentioned you in their comment" (:user/name commenter)))

(defn find-at-mentions [text]
  {:pre [(string? text)]}
  []
  #_(let [re #"\B@(\w+)\b"]
      (set (map second (re-seq re text)))))

(defn notifications-for-comment [db m]
  (let [d (db/d-by-id db (:message/did m))
        _ (assert d "No discussion for message")
        commenter (db/user-by-id db (:message/user_id m))
        poster (db/user-by-id db (:discussion/created_by d))
        m-preview (message-preview m)
        data {:url (discussion-url (:message/did m))}]
    (->> (:discussion/subscribers d)
         (keep (partial db/user-by-id db))
         (keep (fn [receiver]
                 (when-not (= (:xt/id commenter) (:xt/id receiver))
                   (when-let [token (->token receiver)]
                     (let [uid (:xt/id receiver)
                           settings (get-in receiver [:user/settings :settings/notifications])]
                       (when (:settings.notification/overall settings)
                         {:expo/to token
                          :expo/uid uid
                          :expo/body m-preview
                          :expo/data data
                          :expo/title (render-comment-header poster commenter receiver)}))))))
         vec)))

(defn notify-comment!
  [{:keys [biff/secret biff.xtdb/node] :as _ctx} comment]
  (let [db (xtdb.api/db node)
        d (db/d-by-id db (:message/did comment))
        _ (assert d "No discussion for message")
        ;; commenter (db/user-by-id db (:message/user_id comment))
        ;; poster (db/user-by-id db (:discussion/created_by d))
        ;; m-preview (message-preview comment)
        ;; data {:url (discussion-url (:message/did comment))}

        ;; is it a reply to a comment?
        ;; notification-to-og-commenter
        ;; (when-let [reply-to (some->> (:message/reply_to comment)
        ;;                              (db/message-by-id db))]
        ;;   (let [og-commenter (db/user-by-id db (:message/user_id reply-to))
        ;;         settings (get-in og-commenter [:user/settings :settings/notifications])]
        ;;     (when-let [token (->token og-commenter)]
        ;;       (when (and (:settings.notification/overall settings)
        ;;                  (:settings.notification/replies_to_comment settings))
        ;;         {(:xt/id og-commenter)
        ;;          {:to token
        ;;           :body m-preview
        ;;           :data data
        ;;           :title (render-reply-header commenter)}}))))

        ;; does it have an @at-mention?
        ;; at-mentions (find-at-mentions (:message/text comment))
        ;; notification-to-at-mentioned
        ;; (->> at-mentions
        ;;      (keep (partial db/user-by-name db))
        ;;      (keep (fn [u]
        ;;              (when-let [token (->token u)]
        ;;                (let [uid (:xt/id u)
        ;;                      settings (get-in u [:user/settings :settings/notifications])]
        ;;                  (when (and (:settings.notification/overall settings)
        ;;                             (:settings.notification/at_mentions settings))
        ;;                    [uid
        ;;                     {:to token
        ;;                      :body m-preview
        ;;                      :data data
        ;;                      :title (render-at-mention-header commenter)}])))))
        ;;      (into {}))

        notifications-to-subscribers (->> (notifications-for-comment db comment)
                                          (map (fn [{:keys [expo/uid] :as n}]
                                                 [uid n]))
                                          (into {}))
        ;; this guarantees that each user will see at most one notification
        uid->notifications (merge notifications-to-subscribers
                                  #_notification-to-og-commenter
                                  #_notification-to-at-mentioned)
        notifications (vec (vals uid->notifications))]
    (when-not (empty? notifications)
      (expo/push-many! secret notifications))))

(def trigger-emoji #{"❓" "❗"})

(def trigger-emoji-threshold 3)

(defn notification-on-reaction [db message reaction]
  (when (contains? trigger-emoji (:reaction/emoji reaction))
    (let [user (db/user-by-id db (:message/user_id message))]
      (when-let [token (->token user)]
        (let [settings (get-in user [:user/settings :settings/notifications])]
          (when (and (:settings.notification/overall settings)
                     (:settings.notification/suggestions_from_gatz settings))
            (let [mid (:xt/id message)
                  did (:message/did message)
                  flat-reactions (db.message/flatten-reactions mid did (:message/reactions message))
                  n-reactions (count (filter #(and (contains? trigger-emoji (:reaction/emoji %))
                                                   (not= (:xt/id user) (:reaction/by_uid %)))
                                             flat-reactions))]
              (when (= trigger-emoji-threshold n-reactions)
                [{:expo/to token
                  :expo/uid (:xt/id user)
                  :expo/data {:url (str "/discussion/" did "/message/" mid)}
                  :expo/title (format "%s friends are interested in your comment" n-reactions)
                  :expo/body "Consider posting more about it"}]))))))))

(defn notify-on-reaction!
  [{:keys [biff/db biff/secret]} message reaction]
  (let [nts (notification-on-reaction db message reaction)]
    (when-not (empty? nts)
      (expo/push-many! secret nts))))

;; sebas, ameesh, and tara are in gatz
;; 3 new posts, 2 replies

(defn hours-ago [n]

  {:pre [(integer? n) (>= n 0)]
   :post [(inst? %)]}

  (let [ldt (LocalDateTime/now)
        ago (.minusHours ldt n)
        zone-id (ZoneId/systemDefault)
        zone-date (.atZone ago zone-id)]
    (Date/from (.toInstant zone-date))))

(defn activity-notification-for-user [db uid]
  (let [to-user (db/user-by-id db uid)
        settings (get-in to-user [:user/settings :settings/notifications])
        since-ts (or (:user/last_active to-user) (hours-ago 8))]
    (when-let [expo-token (->token to-user)]
      (when (and (:settings.notification/overall settings)
                 (= :settings.notification/daily (:settings.notification/activity settings)))
        (let [{:keys [senders mids]} (db/messages-sent-to-user-since db uid since-ts)
              {:keys [creators dids]} (db/discussions-for-user-since-ts db uid since-ts)
              friends-usernames (vec (distinct (concat creators senders)))
              friends (remove #(= % (:user/name to-user)) friends-usernames)]
          (when-not (empty? friends)
            {:expo/to expo-token
             :expo/uid uid
             :expo/title (if (= 1 (count friends))
                           (format "%s is in gatz" (render-friends friends))
                           (format "%s are in gatz" (render-friends friends)))
             :expo/body (render-activity dids mids)}))))))

(defn activity-for-all-users!
  [{:keys [biff.xtdb/node biff/secret] :as ctx}]

  (let [db (xtdb.api/db node)
        ctx (assoc ctx :biff/db db)]
    (doseq [user (db/get-all-users db)]
      (try
        (let [uid (:xt/id user)]
          (when-let [notification (activity-notification-for-user db uid)]
            (expo/push-many! secret [notification]))
          (db/mark-user-active! ctx uid))
        (catch Throwable e
            ;; TODO: handle
          (println "Error in activity-for-all-users!")
          (println e))))))

(def plugin
  {:tasks []
   #_[{:task activity-for-all-users!
       :schedule (fn []
                   (rest
                    (chime/periodic-seq (Instant/now) (Duration/ofHours 8))))}]})

