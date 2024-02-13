(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [gatz.schema :as schema]
            [malli.core :as m]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]))

;; ====================================================================== 
;; Utils

(defn valid-post? [s]
  (and (string? s) (not (empty? s))))

;; ====================================================================== 
;; User

(defn user-by-name [db username]
  {:pre [(string? username) (not (empty? username))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [username]
                   :where [[u :user/name username]
                           [u :db/type :gatz/user]]}
                 username)]
           ;; XXX: we can't guarantee uniqueness of usernames
    (->> users
         (sort-by (comp :user/created_at #(.getTime %)))
         first)))

(defn user-by-phone [db phone]
  {:pre [(string? phone) (not (empty? phone))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [phone]
                   :where [[u :user/phone_number phone]
                           [u :db/type :gatz/user]]}
                 phone)]
           ;; XXX: we can't guarantee uniqueness of phones
    (->> users
         (sort-by (comp :user/created_at #(.getTime %)))
         first)))

(defn get-all-users [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/user]]}))


(def MIN_LENGTH_USERNAME 3)
(def MAX_LENGTH_USERNAME 20)

(defn valid-username? [s]
  (boolean
   (and (string? s)
        (= s (str/lower-case s))
        (< (count s) MAX_LENGTH_USERNAME)
        (< MIN_LENGTH_USERNAME (count s))
        (re-matches #"^[a-z0-9._-]+$" s))))

(def user-defaults
  {:db/type :gatz/user
   :db/doc-type :gatz/user
   :user/avatar nil
   :user/push_tokens nil
   :user/is_test false
   :user/is_admin false})

(defn- update-user
  ([u] (update-user u (java.util.Date.)))
  ([u now]
   (-> (merge user-defaults
              {:user/last_active now}
              u)
       (assoc :db/doc-type :gatz/user)
       (assoc :user/updated_at now))))

(defn create-user! [ctx {:keys [username phone]}]

  {:pre [(valid-username? username)]}

  (assert (nil? (user-by-name (:biff/db ctx) username)))

  (let [now (java.util.Date.)
        user-id (random-uuid)
        user {:xt/id user-id
              :user/name username
              :user/phone_number phone
              :user/created_at now}]
    (biff/submit-tx ctx [(update-user user now)])
    user))

(defn user-by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (first
   (q db
      '{:find (pull user [*])
        :in [user-id]
        :where [[user :xt/id user-id]
                [user :db/type :gatz/user]]}
      user-id)))

(defn mark-user-active!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id) (some? db)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/last_active (java.util.Date.))
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))


(defn add-push-token!
  [{:keys [biff/db] :as ctx} {:keys [user-id push-token]}]

  {:pre [(uuid? user-id)
         (m/validate schema/push-tokens push-token)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens push-token)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn remove-push-tokens!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens nil)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

;; ====================================================================== 
;; Discussion 

(defn d-by-id [db did]
  (first (q db '{:find (pull d [*])
                 :in [did]
                 :where [[d :xt/id did]
                         [d :db/type :gatz/discussion]]}
            did)))

(def discussion-defaults
  {:discussion/seen_at {}
   :discussion/archived_at {}
   :discussion/first_message nil
   :discussion/latest_message nil})

(defn- update-discussion
  ([d] (update-discussion d (java.util.Date.)))
  ([d now]
   (-> (merge discussion-defaults d)
       (assoc :db/doc-type :gatz/discussion)
       (assoc :discussion/updated_at now))))

(defn create-discussion!

  [{:keys [auth/user-id] :as ctx} {:keys [name selected_users]}]

  {:pre [(or (nil? name)
             (and (string? name) (not (empty? name))))]}

  (let [now (java.util.Date.)
        did (random-uuid)
        member-uids (keep mt/-string->uuid selected_users)
        d {:db/doc-type :gatz/discussion
           :db/type :gatz/discussion
           :xt/id did
           :discussion/did did
           :discussion/name name
           :discussion/created_by user-id
           :discussion/created_at now
           :discussion/members (conj (set member-uids) user-id)}]
    (biff/submit-tx ctx [(update-discussion d now)])
    d))

(defn update-message
  ([m] (update-message m (java.util.Date.)))
  ([m now]
   (-> m
       (assoc :db/doc-type :gatz/message)
       (assoc :message/updated_at now))))

(defn create-discussion-with-message!

  [{:keys [auth/user-id] :as ctx} {:keys [name selected_users text]}]

  {:pre [(or (nil? name)
             (and (string? name) (not (empty? name)))
             (valid-post? text))]}

  (let [now (java.util.Date.)
        did (random-uuid)
        member-uids (keep mt/-string->uuid selected_users)
        d {:db/type :gatz/discussion
           :xt/id did
           :discussion/did did
           :discussion/name name
           :discussion/created_by user-id
           :discussion/created_at now
           :discussion/members (conj (set member-uids) user-id)}
        msg {:db/type :gatz/message
             :xt/id (random-uuid)
             :message/did did
             :message/created_at now
             :message/updated_at now
             :message/user_id user-id
             :message/text text}]
    (biff/submit-tx ctx [(update-discussion d now)
                         (update-message msg now)])
    {:discussion d :message msg}))

(defn mark-as-seen! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        seen-at (:discussion/seen_at d {})
        d (assoc d :discussion/seen_at (assoc seen-at uid now))]
    (biff/submit-tx ctx [(update-discussion d now)])
    d))

(defn archive! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        archive-at (:discussion/archived_at d {})
        d (assoc d :discussion/archived_at (assoc archive-at uid now))]
    (biff/submit-tx ctx [(update-discussion d now)])
    d))

(defn get-all-discussions [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/discussion]]}))

(declare messages-by-did)

(defn discussion-by-id [db did]
  {:pre [(uuid? did)]}
  (let [discussion (d-by-id db did)
        messages (messages-by-did db did)]
    (assert discussion)
    {:discussion discussion
     :user_ids (:discussion/members discussion)
     :messages messages}))

(defn add-member! [ctx p]
  (let [d (discussion-by-id (:biff/db ctx) (:discussion/id p))
        new-d (-> (:discussion d)
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members conj (:user/id p)))]
    (biff/submit-tx ctx [(update-discussion new-d)])))

;; TODO: add a max limit
(defn discussions-by-user-id [db user-id]
  (let [dids (q db '{:find [did]
                     :in [user-id]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]]}
                user-id)]
    (set (map first dids))))


(defn discussions-by-user-id-up-to [db user-id limit]
  (let [dids (q db '{:find [did created-at]
                     :in [user-id]
                     :order-by [[created-at :desc]]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/created_at created-at]
                             [did :discussion/members user-id]]}
                user-id)]
    (mapv first (take limit dids))))


(defn discussions-by-user-id-older-than

  [db user-id older-than-ts limit]

  {:pre [(uuid? user-id) (inst? older-than-ts)]}

  (let [dids (q db '{:find [did created-at]
                     :in [user-id older-than-ts]
                     :order-by [[created-at :desc]]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]
                             [did :discussion/created_at created-at]
                             [(< created-at older-than-ts)]]}
                user-id older-than-ts)]
    (mapv first (take limit dids))))


;; ====================================================================== 
;; Activity for notifications

(defn user-last-active [db uid]

  {:pre [(uuid? uid)]
   :post [(or (nil? %) (inst? %))]}

  (let [r (q db '{:find [activity-ts]
                  :in [user-id]
                  :order-by [[activity-ts :desc]]
                  :where [[uid :xt/id user-id]
                          [uid :db/type :gatz/user]
                          [uid :user/last_active activity-ts]]}
             uid)]
    (ffirst r)))

(defn discussions-for-user-since-ts

  [db user-id since-ts]

  {:pre [(uuid? user-id) (inst? since-ts)]}
  (let [r (q db '{:find [creator-username did]
                  :in [user-id since-ts]
                      ;; TODO: this is scanning all user discussions ever
                  :where [[did :db/type :gatz/discussion]
                          [did :discussion/members user-id]
                          [did :discussion/created_at created-at]
                          [(< since-ts created-at)]

                          [did :discussion/created_by creator-id]

                          [creator-id :db/type :gatz/user]
                          [creator-id :user/name creator-username]]}
             user-id since-ts)]
    (reduce (fn [acc [username did]]
              (-> acc
                  (update :dids conj did)
                  (update :creators conj username)))
            {:creators  #{} :dids #{}}
            r)))


(defn messages-sent-to-user-since

  [db user-id since-ts]

  {:pre [(uuid? user-id) (inst? since-ts)]}

  (let [r (q db '{:find [sender-name mid]
                  :in [user-id since-ts]
                          ;; TODO: this is scanning all user discussions ever
                  :where [[did :db/type :gatz/discussion]
                          [did :discussion/members user-id]

                          [mid :db/type :gatz/message]
                          [mid :message/created_at m-created-at]
                          [mid :message/did did]
                          [(< since-ts m-created-at)]
                          [mid :message/user_id sender-id]

                          [sid :xt/id sender-id]
                          [sid :db/type :gatz/user]
                          [sid :user/name sender-name]]}
             user-id since-ts)]
    (reduce (fn [acc [username mid]]
              (-> acc
                  (update :mids conj mid)
                  (update :senders conj username)))
            {:senders #{} :mids #{}}
            r)))

;; ====================================================================== 
;; Messages

#_(defn ->uuid [s]
    (if (string? s)
      (try
        (java.util.UUID/fromString s)
        (catch Exception _ nil))))

(defn create-message!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [text mid did]}]

  {:pre [(string? text) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (let [now (java.util.Date.)
        msg {:db/doc-type :gatz/message
             :db/type :gatz/message
             :xt/id mid
             :message/did did
             :message/created_at now
             :message/updated_at now
             :message/user_id user-id
             :message/text text}
        d (d-by-id db did)
        updated-discussion (-> (merge d {:discussion/first_message mid})
                               (assoc :discussion/latest_message mid)
                               (update-discussion now))]
    (biff/submit-tx ctx [msg updated-discussion])
    msg))

;; TODO: should this be sorted?
(defn messages-by-did [db did]
  (->> (q db '{:find (pull m [*])
               :in [did]
               :where [[m :message/did did]
                       [m :db/type :gatz/message]]}
          did)
       (sort-by :message/created_at)
       vec))

;; ======================================================================
;; Migrations

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
(def test-usernames #{"test" "test2" "test3" "bensu" "sbensu"})

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

(def username->img
  {"sebas"        "https://api.gatz.chat/avatars/sebas.jpg"
   "devon"        "https://api.gatz.chat/avatars/devon.jpg"
   "tara"         "https://api.gatz.chat/avatars/tara.jpg"
   "jack"         "https://api.gatz.chat/avatars/jack.jpg"
   "grantslatton" "https://api.gatz.chat/avatars/grantslatton.jpg"
   "bensu"        "https://api.gatz.chat/avatars/sebas.jpg"
   "martin"       "https://api.gatz.chat/avatars/martin.jpg"
   "willyintheworld" "https://api.gatz.chat/avatars/willyintheworld.jpg"
   "ameesh"       "https://api.gatz.chat/avatars/ameesh.jpg"})

(defn add-user-images!
  [{:keys [biff.xtdb/node] :as ctx}]

  (let [db (xtdb/db node)
        users (all-users db)
        txns (for [u users]
               (let [username (:user/name u)]
                 (-> u
                     (assoc :user/avatar (get username->img username))
                     (update-user)
                     (dissoc :user/image))))]
    (biff/submit-tx ctx (vec (remove nil? txns)))))
