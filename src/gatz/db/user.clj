(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.util :as db.util]
            [gatz.db.evt :as db.evt]
            [gatz.schema :as schema]
            [malli.core :as malli]
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
        (update :user/updated_at #(crdt/->MinWins %))
        (update :user/last_active #(crdt/->MaxWins %))
        (update :user/avatar #(crdt/->LWW clock %))
        (update :user/push_tokens #(crdt/->LWW clock %))
        (update-in [:user/settings :settings/notfications]
                   (fn [np]
                     (map-vals #(crdt/->LWW clock %) np))))))

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
                 username)]
    ;; TODO: there is a way to guarantee uniqueness of usernames with biff
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first
         (db.util/->latest-version all-migrations))))

(defn by-phone [db phone]
  {:pre [(string? phone) (not (empty? phone))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [phone]
                   :where [[u :user/phone_number phone]
                           [u :db/type :gatz/user]]}
                 phone)]
    ;; TODO: there is a way to guarantee uniqueness of phones with biff
    (->> users
         (remove nil?)
         (sort-by (comp :user/created_at #(.getTime %)))
         first
         (db.util/->latest-version all-migrations))))

(defn get-all-users [db]
  (q db
     '{:find (pull u [*])
       :where [[u :db/type :gatz/user]]}))


(defn create-user!
  [{:keys [biff/db] :as ctx} {:keys [username phone id]}]

  {:pre [(crdt.user/valid-username? username)]}

  (assert (nil? (by-name db username)))

  (let [user (crdt.user/new-user {:id id :phone phone :username username})]
    (biff/submit-tx ctx [(assoc user :db/doc-type :gatz.crdt/user)])
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
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} uid action] ;; TODO: use cid
  {:pre [(uuid? uid)]}
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
             :user (by-id db-after uid)})
          (assert false "Transaction would've failed")))
      (assert false "Invaild event"))))

(defn mark-active! [ctx uid]
  {:pre [(uuid? uid)]}
  (let [now (Date.)
        clock (crdt/new-hlc uid now)
        action {:gatz.crdt.user/action :gatz.crdt.user/mark-active
                :gatz.crdt.user/delta {:crdt/clock clock
                                       :user/last_active now}}]
    (apply-action! ctx uid action)))

(defn update-avatar! [ctx uid avatar–url]
  {:pre [(uuid? uid) (string? avatar–url)]}
  (let [now (Date.)
        clock (crdt/new-hlc uid now)
        action {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                :gatz.crdt.user/delta {:crdt/clock clock
                                       :user/avatar avatar–url}}]
    (apply-action! ctx uid action)))

(defn add-push-token!
  [{:keys [biff/db] :as ctx} {:keys [user-id push-token]}]

  {:pre [(uuid? user-id)
         (malli/validate schema/PushTokens push-token)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens push-token)
                           (update :user/settings assoc :settings/notifications crdt.user/notifications-on)
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn remove-push-tokens!
  [{:keys [biff/db] :as ctx} user-id]

  {:pre [(uuid? user-id)]}

  (if-let [user (by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/push_tokens nil)
                           (update :user/settings assoc :settings/notifications crdt.user/notifications-off)
                           (crdt.user/update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn turn-off-notifications! [{:keys [biff/db] :as ctx} uid]
  {:pre [(uuid? uid)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (update :user/settings assoc :settings/notifications crdt.user/notifications-off)
                         (crdt.user/update-user))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn edit-notifications!
  [{:keys [biff/db] :as ctx} uid notification-settings]
  {:pre [(uuid? uid)
         ;; TODO: This should allow a subset of the notification-preferences schema
         #_(malli/validate schema/notification-preferences notification-settings)]}
  (let [user (by-id db uid)
        updated-user (-> user
                         (crdt.user/update-user)
                         (update-in [:user/settings :settings/notifications] #(merge % notification-settings)))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

(defn user-last-active [db uid]

  {:pre [(uuid? uid)]
   :post [(or (nil? %) (inst? %))]}

  (let [r (q db '{:find [activity-ts]
                  :in [user-id]
                  :order-by [[activity-ts :desc]]
                  :where [[uid :xt/id user-id]
                          [uid :db/type :gatz/user]
                          ;; TODO: does this work if it is a CRDT?
                          [uid :user/last_active activity-ts]]}
             uid)]
    (ffirst r)))
