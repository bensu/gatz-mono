(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [clojure.java.io :as io]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.util :as db.util]
            [gatz.db.evt :as db.evt]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [malli.util :as mu]
            [medley.core :refer [map-vals]]
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

(defn create-user!
  [ctx {:keys [username phone id now]}]

  {:pre [(crdt.user/valid-username? username) (string? phone)]}

  (let [user (crdt.user/new-user {:id id
                                  :phone phone
                                  :username username
                                  :now now})]
    (biff/submit-tx ctx [(-> user
                             (assoc :user/is_test (not= :env/prod (:env ctx)))
                             (assoc :db/doc-type :gatz.crdt/user :db/op :create)
                             (update :user/name (fn [n] [:db/unique n]))
                             (update :user/phone_number (fn [p] [:db/unique p])))])
    user))

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
  {:gatz.db.user/apply-delta user-apply-delta-expr})

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
            (biff/submit-tx ctx txs)
            {:evt (xtdb.api/entity db-after (:evt/id evt))
             :user (by-id db-after user-id)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

(defn mark-active!
  ([ctx]
   (mark-active! ctx {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} {:keys [now]}]
   {:pre [(uuid? user-id)]}
   (let [clock (crdt/new-hlc user-id now)
         action {:gatz.crdt.user/action :gatz.crdt.user/mark-active
                 :gatz.crdt.user/delta {:crdt/clock clock
                                        :user/updated_at now
                                        :user/last_active now}}]
     (apply-action! ctx action))))

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

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))


(defn get-friend-ids [db uid]
  ;; TOOD: change with friendship
  (all-ids db))
