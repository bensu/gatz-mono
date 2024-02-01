(ns gatz.notify
  (:require [sdk.expo :as expo]
            [xtdb.api :as xt]
            [gatz.db :as db]))

(def MAX_MESSAGE_LENGTH 30)

(defn message-preview [text]
  (if (<= (count text) MAX_MESSAGE_LENGTH)
    text
    (str (subs text 0 MAX_MESSAGE_LENGTH) "...")))

(defn discussion-url [did]
  {:pre [(uuid? did)]}
  (str "/discussion/" did))

(defn new-discussion-to-members!
  [{:keys [biff.xtdb/node biff/secret] :as ctx}
   {:discussion/keys [members created_by] :as d}]
  (let [db (xt/db node)
        id (:xt/id d)
        message (->> (db/messages-by-did db id)
                     (sort-by :message/created_at)
                     first)
        ;; _ (assert message "No messages in discussion")
        ;; creator doesn't need a notification
        creator (db/user-by-id db created_by)
        users (->> members
                   (remove (partial = created_by))
                   (keep (partial db/user-by-id db))
                   vec)
        title (format "%s started a discussion" (:user/name creator))
        body (or (some-> message :message/text message-preview)
                 "No messages yet")
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