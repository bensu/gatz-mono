(ns gatz.notify
  (:require [clojure.set :as set]
            [chime.core :as chime]
            [gatz.db :as db]
            [sdk.expo :as expo]
            [xtdb.api :as xt])
  (:import [java.time LocalDateTime ZoneId Instant Duration]
           [java.util Date]))

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
                                   {:to expo-token
                                    :title title
                                    :body body
                                    :data {:url url}})))]
    (println "notifications" notifications)
    ;; TODO: check for notification preferences
    (when-not (empty? notifications)
      (expo/push-many! secret notifications))))

(defn render-friends [friends]

  {:pre [(not (empty? friends)) (every? string? friends)]
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

(defn ->token [user]
  (get-in user [:user/push_tokens :push/expo :push/token]))

(defn friends-activity!
  [{:keys [biff/secret] :as _ctx}
   to-user
   friend-usernames]

  {:pre [(every? string? friend-usernames)]}

  (let [friends (remove #(= % (:user/name to-user)) friend-usernames)]
    (when-not (empty? friends)
      (when-let [expo-token (->token to-user)]
        (println "sending notification to" (:user/name to-user) "with friends" friends)
        (let [notification {:to expo-token
                            :title "New activity in Gatz"
                            :body (str "From " (render-friends friends))}]
          (expo/push-many! secret [notification]))))))

(defn hours-ago [n]

  {:pre [(integer? n) (>= n 0)]
   :post [(inst? %)]}

  (let [ldt (LocalDateTime/now)
        ago (.minusHours ldt n)
        zone-id (ZoneId/systemDefault)
        zone-date (.atZone ago zone-id)]
    (Date/from (.toInstant zone-date))))

(defn activity-for-user-since
  [{:keys [biff.xtdb/node] :as _ctx} user]

  (let [db (xtdb.api/db node)
        uid (:xt/id user)
        since-ts (or (db/user-last-active db uid)
                     (hours-ago 8))
        message-senders (db/message-senders-to-user-since db uid since-ts)
        discussion-creators (db/discussion-creators-for-user-id-created-since db uid since-ts)]
    {:since-ts since-ts
     :message-senders message-senders
     :discussion-creators discussion-creators}))

(defn activity-for-all-users!
  [{:keys [biff.xtdb/node] :as ctx}]

  (println "running activity-for-all-users!")

  (let [db (xtdb.api/db node)]
    (doseq [user (db/get-all-users db)]
      (when (some? (->token user))
        (try
          (let [uid (:xt/id user)

                {:keys [message-senders discussion-creators]}
                (activity-for-user-since ctx user)

                friends (vec (sort (set/union message-senders discussion-creators)))]
            (friends-activity! ctx user friends)
            ;; make sure they don't see these notifications again
            (db/mark-user-active! ctx uid))
          (catch Throwable e
            ;; TODO: handle
            (println "Error in activity-for-all-users!")
            (println e)))))))

(def plugin
  {:tasks [{:task activity-for-all-users!
            :schedule (fn []
                        (rest
                         (chime/periodic-seq (Instant/now) (Duration/ofHours 8))))}]})