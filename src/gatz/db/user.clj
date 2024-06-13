(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.evt :as db.evt]
            [gatz.db.util :as db.util]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [malli.util :as mu]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ======================================================================
;; Migrations

(def migration-client-id #uuid "08f711cd-1d4d-4f61-b157-c36a8be8ef95")

(defn v0->v1 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> (merge crdt.user/user-defaults data)
        (assoc :crdt/clock clock
               :db/version 1
               :db/doc-type :gatz.crdt/user
               :db/type :gatz/user)
        (update :user/updated_at #(crdt/->MaxWins %))
        (update :user/last_active #(crdt/->MaxWins %))
        (update :user/avatar #(crdt/->LWW clock %))
        (update :user/push_tokens #(crdt/->LWW clock %))
        (update-in [:user/settings :settings/notifications]
                   #(crdt/->lww-map (merge crdt.user/notifications-off %)
                                    clock)))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}])

(defn- as-unique [x] [:db/unique x])

;; ======================================================================
;; Activity 

;; We keep what used to be :user/last_active in a separate document
;; so that the user document doesn't get updated every time the user
;; visits the app.

(defn new-activity-doc [{:keys [uid now id]}]
  (let [doc {:db/doc-type :gatz/user_activity
             :db/op :create
             :db/type :gatz/user_activity
             :db/version 1
             :xt/id (or id (random-uuid))
             :user_activity/user_id uid
             :user_activity/last_active now}]
    (update doc :user_activity/user_id as-unique)))

(defn activity-by-uid [db uid]
  {:pre [(uuid? uid)]}
  (first
   (q db
      '{:find (pull a [*])
        :in [uid]
        :where [[a :db/type :gatz/user_activity]
                [a :user_activity/user_id uid]]}
      uid)))


(defn max-date [^Date a ^Date b]
  (if (.after a b) a b))

(defn mark-active-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [uid now]} args]
    (when-let [activity-doc (activity-by-uid db uid)]
      (let [new-doc (-> activity-doc
                        (update :user_activity/last_active #(max-date % now)))]
        [[:xtdb.api/put (assoc new-doc :db/doc-type :gatz/user_activity)]]))))

(def mark-active-expr
  '(fn mark-active-fn [ctx args]
     (gatz.db.user/mark-active-txn ctx args)))

;; ====================================================================== 
;; User

(defn by-name [db username]
  {:pre [(string? username) (not (empty? username))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [username]
                   :where [[u :user/name username]
                           [u :db/type :gatz/user]]}
                 username)
        ;; TODO: there is a way to guarantee uniqueness of usernames with biff
        user (->> users
                  (remove nil?)
                  (sort-by (comp :user/created_at #(.getTime %)))
                  first)]
    (some-> user (db.util/->latest-version all-migrations))))

(defn by-phone [db phone]
  {:pre [(string? phone) (not (empty? phone))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [phone]
                   :where [[u :user/phone_number phone]
                           [u :db/type :gatz/user]]}
                 phone)
        ;; TODO: there is a way to guarantee uniqueness of phones with biff
        user (->> users
                  (remove nil?)
                  (sort-by (comp #(.getTime %) :user/created_at))
                  first)]
    (some-> user (db.util/->latest-version  all-migrations))))

(defn all-ids [db]
  (q db
     '{:find  u
       :where [[u :db/type :gatz/user]]}))

(defn new-contacts-txn [{:keys [uid now]}]
  (let [contacts (db.contacts/new-contacts {:uid uid
                                            :now now
                                            :contact-ids #{}})]
    (-> contacts
        (assoc :db/doc-type :gatz/contacts :db/op :create)
        (update :contacts/user_id as-unique))))


(defn create-user!
  ([ctx {:keys [username phone id now]}]

   {:pre [(crdt.user/valid-username? username) (string? phone)]}

   (let [id (or id (random-uuid))
         now (or now (Date.))
         user (crdt.user/new-user {:id id
                                   :phone phone
                                   :username username
                                   :now now})
         txns [(-> user
                   (assoc :user/is_test (not= :env/prod (:env ctx)))
                   (assoc :db/doc-type :gatz.crdt/user :db/op :create)
                   (update :user/name as-unique)
                   (update :user/phone_number as-unique))
               (new-contacts-txn {:uid id :now now})
               (new-activity-doc {:uid id :now now})]]
     (biff/submit-tx ctx txns)
     user)))

(defn by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (-> (xtdb/entity db user-id)
      (db.util/->latest-version all-migrations)))

;; ====================================================================== 
;; Actions

(defn user-apply-delta
  [ctx {:keys [evt] :as _args}]
  (let [uid (:evt/uid evt)
        db (xtdb.api/db ctx)
        user (gatz.db.user/by-id db uid)
        delta (get-in evt [:evt/data :gatz.crdt.user/delta])
        new-user (gatz.crdt.user/apply-delta user delta)]
    [[:xtdb.api/put evt]
     [:xtdb.api/put new-user]]))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  user-apply-delta-expr
  '(fn user-apply-delta-fn [ctx args]
     (gatz.db.user/user-apply-delta ctx args)))

(def tx-fns
  {:gatz.db.user/apply-delta user-apply-delta-expr
   :gatz.db.user/mark-active mark-active-expr})

(defn apply-action!
  "Applies a delta to the user and stores it"
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} action] ;; TODO: use cid
  {:pre [(uuid? user-id)]}
  (let [evt (db.evt/new-evt {:evt/type :gatz.crdt.user/delta
                             :evt/uid user-id
                             :evt/cid cid
                             :evt/data action})]
    (if (true? (malli/validate schema/UserEvent evt))
      (let [txs [[:xtdb.api/fn :gatz.db.user/apply-delta {:evt evt}]]]
        ;; Try the transaction before submitting it
        (if-let [db-after (xtdb.api/with-tx db txs)]
          (do
            (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txs)
            {:evt (xtdb.api/entity db-after (:xt/id evt))
             :user (by-id db-after user-id)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

(defn update-avatar!
  ([ctx avatar–url]
   (update-avatar! ctx avatar–url {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} avatar–url {:keys [now]}]
   {:pre [(uuid? user-id) (string? avatar–url) (inst? now)]}
   (let [clock (crdt/new-hlc user-id now)
         action {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                 :gatz.crdt.user/delta {:crdt/clock clock
                                        :user/updated_at now
                                        :user/avatar (crdt/->LWW clock avatar–url)}}]
     (apply-action! ctx action))))

(defn add-push-token!
  ([ctx params]
   (add-push-token! ctx params {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} {:keys [push-token]} {:keys [now]}]

   {:pre [(uuid? user-id)
          (malli/validate schema/PushTokens push-token)]}

   (let [clock (crdt/new-hlc user-id now)
         delta {:crdt/clock clock
                :user/updated_at now
                :user/push_tokens (crdt/->LWW clock push-token)
                :user/settings {:settings/notifications (crdt.user/notifications-on-crdt clock)}}
         action {:gatz.crdt.user/action :gatz.crdt.user/add-push-token
                 :gatz.crdt.user/delta delta}]
     (apply-action! ctx action))))

(defn remove-push-tokens!
  ([ctx] (remove-push-tokens! ctx {:now (Date.)}))

  ([{:keys [auth/user-id] :as ctx} {:keys [now]}]

   {:pre [(uuid? user-id)]}

   (let [clock (crdt/new-hlc user-id now)
         delta {:crdt/clock clock
                :user/updated_at now
                :user/push_tokens (crdt/->LWW clock nil)
                :user/settings {:settings/notifications (crdt.user/notifications-off-crdt clock)}}
         action {:gatz.crdt.user/action :gatz.crdt.user/remove-push-token
                 :gatz.crdt.user/delta delta}]
     (apply-action! ctx action))))

(defn edit-notifications!

  ([ctx notification-settings]
   (edit-notifications! ctx notification-settings {:now (Date.)}))

  ([{:keys [auth/user-id] :as ctx} notification-settings {:keys [now]}]

   {:pre [(uuid? user-id)
          (malli/validate (mu/optional-keys schema/NotificationPreferences)
                          notification-settings)]}

   (let [clock (crdt/new-hlc user-id now)
         delta {:crdt/clock clock
                :user/updated_at now
                :user/settings {:settings/notifications (crdt/->lww-map notification-settings clock)}}
         action {:gatz.crdt.user/action :gatz.crdt.user/update-notifications
                 :gatz.crdt.user/delta delta}]
     (apply-action! ctx action))))

(defn turn-off-notifications! [ctx]
  (edit-notifications! ctx crdt.user/notifications-off))

(defn mark-active!
  ([ctx]
   (mark-active! ctx {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} {:keys [now]}]
   {:pre [(uuid? user-id)]}
   (let [args {:uid user-id :now now}]
     (biff/submit-tx (assoc ctx :biff.xtdb/retry false)
                     [[:xtdb.api/fn :gatz.db.user/mark-active {:args args}]]))))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))


(defn get-friend-ids [db uid]
  ;; TOOD: change with friendship
  (all-ids db))
