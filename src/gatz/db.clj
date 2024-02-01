(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [gatz.schema :as schema]
            [malli.core :as m]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]))

;; ====================================================================== 
;; User

(def default-img "http://www.gravatar.com/avatar")

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

(defn create-user! [ctx {:keys [username phone]}]

  (assert (nil? (user-by-name (:biff/db ctx) username)))

  (let [now (java.util.Date.)
        user-id (random-uuid)
        user {:db/doc-type :gatz/user
              :db/type :gatz/user
              :xt/id user-id
              :user/name username
              :user/phone_number phone
              :user/created_at now
              :user/updated_at now
              :user/image default-img}]
    (biff/submit-tx ctx [user])
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

(defn add-push-token!
  [{:keys [biff/db] :as ctx} {:keys [user-id push-token]}]

  {:pre [(uuid? user-id)
         (m/validate schema/push-tokens push-token)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :db/doc-type :gatz/user)
                           (assoc :user/push_tokens push-token))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn remove-push-tokens!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :db/doc-type :gatz/user)
                           (assoc :user/push_tokens nil))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

;; ====================================================================== 
;; Messages

#_(defn ->uuid [s]
    (if (string? s)
      (try
        (java.util.UUID/fromString s)
        (catch Exception _ nil))))

(defn create-message!

  [{:keys [auth/user-id] :as ctx}
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
             :message/text text}]
    (biff/submit-tx ctx [msg])
    msg))

(defn messages-by-did [db did]
  (q db '{:find (pull m [*])
          :in [did]
          :where [[m :message/did did]
                  [m :db/type :gatz/message]]}
     did))

;; ====================================================================== 
;; Discussion 

(defn d-by-id [db did]
  (first (q db '{:find (pull d [*])
                 :in [did]
                 :where [[d :xt/id did]
                         [d :db/type :gatz/discussion]]}
            did)))

(defn discussion-by-id [db did]
  {:pre [(uuid? did)]}
  (let [discussion (d-by-id db did)
        messages (messages-by-did db did)]
    (assert discussion)
    {:discussion discussion
     :user_ids (:discussion/members discussion)
     :messages messages}))

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
           :discussion/updated_at now
           :discussion/seen_at {}
           :discussion/archived_at {}
           :discussion/members (conj (set member-uids) user-id)}]
    (biff/submit-tx ctx [d])
    d))

(defn mark-as-seen! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        seen-at (:discussion/seen_at d {})
        d (-> {:discussion/archived_at {}}
              (merge d)
              (assoc :discussion/seen_at (assoc seen-at uid now)))]
    (biff/submit-tx ctx [(assoc d :db/doc-type :gatz/discussion)])
    d))

(defn archive! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        archive-at (:discussion/archived_at d {})
        d (assoc d :discussion/archived_at (assoc archive-at uid now))]
    (biff/submit-tx ctx [(assoc d :db/doc-type :gatz/discussion)])
    d))


(defn add-member! [ctx p]
  (let [d (discussion-by-id (:biff/db ctx) (:discussion/id p))
        new-d (-> (:discussion d)
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members conj (:user/id p)))]
    (biff/submit-tx ctx [new-d])))

(defn discussions-by-user-id [db user-id]
  (let [dids (q db '{:find [did]
                     :in [user-id]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]]}
                user-id)]
    (set (map first dids))))



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