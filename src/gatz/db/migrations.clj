(ns gatz.db.migrations
  (:require [gatz.db :refer :all]
            [clojure.string :as str]
            [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb]))

(def good-users
  {"sbensu"  "+12222222222"
   "bensu" "+10000000000"
   "sebas" "+14159499932"
   "devon" "+16509067099"
   "test" "+11111111111"})

(defn get-env [k]
  {:post [(string? %)]}
  (System/getenv k))

(defn get-node []
  (biff/use-xt {:biff.xtdb/topology :standalone
                :biff.xtdb.jdbc/jdbcUrl (get-env "DATABASE_URL")}))

(defn delete-bad-users! [ctx]
  (let [node (:biff.xtdb/node ctx)
        db (xtdb/db node)
        all-users (get-all-users db)
        txns (->> all-users
                  (remove (fn [user]
                            (contains? good-users (:user/name user))))
                  (map :xt/id)
                  (mapv (fn [uid]
                          [::xtdb/delete uid])))]
    (xtdb/submit-tx node txns)))

(defn add-phone-number-to-good-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [[username phone] good-users]
               (some-> (user-by-name db username)
                       (assoc :db/doc-type :gatz/user)
                       (assoc :user/phone_number phone)))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-first-and-last-message-to-discussions!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [d (get-all-discussions db)]
               (when (or (nil? (:discussion/first_message d))
                         (nil? (:discussion/latest_message d)))
                 (let [messages (messages-by-did db (:discussion/did d))]
                   (when-not (empty? messages)
                     (let [first-message (or (:discussion/first_message d)
                                             (:xt/id (first messages)))
                           last-message (or (:discussion/latest_message d)
                                            (:xt/id (last messages)))]
                       (assert (and first-message last-message))
                       (-> d
                           (assoc :discussion/first_message first-message
                                  :discussion/latest_message last-message)
                           (update-discussion)))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn lower-case-usernames!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [u (get-all-users db)]
               (let [username (:user/name u)]
                 (when (not= username (str/lower-case username))
                   (-> u
                       (assoc :db/doc-type :gatz/user)
                       (assoc :user/name (str/lower-case username))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn get-users-without-push-notifications [db]
  (let [users (get-all-users db)]
    (->> users
         (remove :user/push_tokens)
         (map :user/name)
         set)))

(def admin-usernames #{"sebas"})
(def test-usernames #{"test" "test2" "test3" "test4" "bensu" "sbensu"})

(defn add-admin-and-test-to-all-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [u (get-all-users db)]
               (let [username (:user/name u)]
                 (cond
                   (contains? admin-usernames username)
                   (-> u
                       (assoc :user/is_admin true)
                       (update-user))

                   (contains? test-usernames username)
                   (-> u
                       (assoc :user/is_test true)
                       (update-user))

                   :else (update-user u))))]
    #_(vec (remove nil? txns))
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn username-img [username]
  {:pre [(string? username)]}
  (format "https://gatzapi.com/avatars/%s.jpg" username))

;; images are now hosted in cloudflare
(def picture-in-cloudflare
  #{"sebas"
    "devon"
    "tara"
    "jack"
    "grantslatton"
    "bensu"
    "martin"
    "willyintheworld"
    "tbensu"
    "lconstable"
    "ameesh"
    "ankit"
    "viktor"
    "zack"
    "max"
    "biglu"})

(defn add-user-images!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        users (all-users db)
        txns (for [u users]
               (let [username (:user/name u)]
                 (when (contains? picture-in-cloudflare username)
                   (let [img (username-img username)]
                     (-> u
                         (assoc :user/avatar img)
                         (update-user)
                         (dissoc :user/image))))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-last-message-read!
  "Adds the last message read to all discussions"
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        txns (for [d (get-all-discussions db)]
               (let [last-update (or (:discussion/updated_at d)
                                     (:discussion/created_at d))
                     members (:discussion/members d)]
                 (when-let [last-message (or (:discussion/latest_message d)
                                             (:discussion/first_message d))]
                   (let [all-read (into {} (for [m members]
                                             [m last-message]))]
                     (-> d
                         (assoc :discussion/last_message_read all-read)
                         (update-discussion last-update))))))]
    #_(vec (remove nil? txns))
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn messages-with-n-or-more-reactions
  "Finds messages that were reacted to n or more time"
  [db n]
  (vec
   (filter (fn [d]
             (let [reactions (:message/reactions d)]
               (<= n (count-reactions reactions))))
           (get-all-messages db))))


(defn add-notification-settings-to-users!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-users (get-all-users db)
        now (java.util.Date.)
        txns (for [u all-users]
               (when (nil? (get-in u [:user/settings :settings/notifications]))
                 (let [token (get-in u [:user/push_tokens :push/expo :push/token])
                       new-nts (if (nil? token)
                                 notifications-off
                                 notifications-on)]
                   (-> u
                       (update :user/settings merge {:settings/notifications new-nts})
                       (update-user now)))))]
    (vec (remove nil? txns))))

(defn get-discussions-without-last-message [db]
  (q db
     '{:find (pull d [*])
       :where [[d :db/type :gatz/discussion]
               [d :discussion/latest_message nil]]}))

(defn add-latest-message!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        ds (get-discussions-without-last-message db)
        now (java.util.Date.)
        txns (for [d ds]
               (when-let [latest-message (d-latest-message db (:xt/id d))]
                 (let [latest-activity-ts (:message/created_at latest-message)]
                   (-> d
                       (assoc :discussion/latest_message (:xt/id latest-message))
                       (assoc :discussion/latest_activity_ts latest-activity-ts)
                       (update-discussion now)))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))

(defn add-latest-activity-ts!
  [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-discussions (get-all-discussions-with-latest-message db)
        now (java.util.Date.)
        txns (for [[d latest-message] all-discussions]
               (let [latest-activity-ts (:message/created_at latest-message)]
                 (-> d
                     (assoc :discussion/latest_activity_ts latest-activity-ts)
                     (update-discussion now))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))


(defn fix-first-and-last-message! [{:keys [biff.xtdb/node] :as ctx}]
  (let [db (xtdb/db node)
        all-discussions (get-all-discussions db)
        now (java.util.Date.)
        txns (for [d all-discussions]
               (let [messages (messages-by-did db (:discussion/did d))
                     first-message (first messages)
                     last-message (last messages)]
                 (-> d
                     (assoc :discussion/first_message (:xt/id first-message)
                            :discussion/latest_message (:xt/id last-message))
                     (update-discussion now))))
        txns (vec (remove nil? txns))]
    (biff/submit-tx ctx txns)))

(defn rename-user! [{:keys [biff.xtdb/node] :as ctx} old-name new-name]
  (let [db (xtdb/db node)
        user (user-by-name db old-name)
        now (java.util.Date.)
        new-user (-> user
                     (assoc :user/name new-name)
                     (update-user now))]
    (biff/submit-tx ctx [new-user])))