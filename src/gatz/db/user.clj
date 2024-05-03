(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [clojure.test :refer [deftest testing is]]
            [clojure.java.io :as io]
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
        (update-in [:user/settings :settings/notifications]
                   #(crdt/->lww-map (merge crdt.user/notifications-off %)
                                    clock)))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}])

(deftest migrate-existing-users
  (testing "We can migrate users we already have"
    (let [v0-users (read-string (slurp (io/resource "test/users_v0.edn")))
          v1-users (mapv #(db.util/->latest-version % all-migrations)
                         v0-users)]
      (is (= (count v0-users) (count v1-users)))
      (doseq [user v1-users]
        (is (malli/validate schema/UserCRDT user)
            (vec (:errors (malli/explain schema/UserCRDT user))))))))

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
    (db.util/->latest-version user all-migrations)))

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
                  (sort-by (comp :user/created_at #(.getTime %)))
                  first)]
    (db.util/->latest-version user all-migrations)))

(defn all-ids [db]
  (q db
     '{:find  u
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
  [ctx {:keys [uid push-token]}]

  {:pre [(uuid? uid)
         (malli/validate schema/PushTokens push-token)]}

  (let [now (Date.)
        clock (crdt/new-hlc uid now)
        delta {:crdt/clock clock
               :user/push_tokens (crdt/->LWW clock push-token)
               :user/settings {:settings/notfications (crdt.user/notifications-on-crdt clock)}}
        action {:gatz.crdt.user/action :gatz.crdt.user/add-push-token
                :gatz.crdt.user/delta delta}]
    (apply-action! ctx uid action)))

(defn remove-push-tokens!
  [ctx {:keys [uid]}]

  {:pre [(uuid? uid)]}

  (let [now (Date.)
        clock (crdt/new-hlc uid now)
        delta {:crdt/clock clock
               :user/push_tokens (crdt/->LWW clock nil)
               :user/settings {:settings/notfications (crdt.user/notifications-off-crdt clock)}}
        action {:gatz.crdt.user/action :gatz.crdt.user/remove-push-token
                :gatz.crdt.user/delta delta}]
    (apply-action! ctx uid action)))

(defn edit-notifications!
  [ctx uid notification-settings]

  {:pre [(uuid? uid)]}

  (let [now (Date.)
        clock (crdt/new-hlc uid now)
        delta {:crdt/clock clock
               :user/settings {:settings/notfications (crdt/->lww-map notification-settings clock)}}
        action {:gatz.crdt.user/action :gatz.crdt.user/remove-push-token
                :gatz.crdt.user/delta delta}]
    (apply-action! ctx uid action)))

(defn turn-off-notifications! [ctx uid]
  (edit-notifications! ctx uid crdt.user/notifications-off))

(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))


(defn get-friend-ids [db uid]
  ;; TOOD: change with friendship
  (all-ids db))

(deftest user-actions
  (testing "The user actions have the right schema"
    (let [now (Date.)
          cid (random-uuid)
          clock (crdt/new-hlc cid now)
          actions [{:gatz.crdt.user/action :gatz.crdt.user/mark-active
                    :gatz.crdt.user/delta {:crdt/clock clock
                                           :user/last_active now}}
                   {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                    :gatz.crdt.user/delta
                    {:crdt/clock clock
                     :user/avatar (crdt/->LWW clock "https://example.com/avatar.jpg")}}
                   {:gatz.crdt.user/action :gatz.crdt.user/add-push-token
                    :gatz.crdt.user/delta
                    {:crdt/clock clock
                     :user/push_tokens (crdt/->LWW clock
                                                   {:push/expo
                                                    {:push/service :push/expo
                                                     :push/token "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                                                     :push/created_at now}})
                     :user/settings {:settings/notifications
                                     (crdt.user/notifications-on-crdt clock)}}}
                   {:gatz.crdt.user/action :gatz.crdt.user/remove-push-token
                    :gatz.crdt.user/delta
                    {:crdt/clock clock
                     :user/push_tokens (crdt/->LWW clock nil)
                     :user/settings {:settings/notifications
                                     (crdt.user/notifications-off-crdt clock)}}}
                   {:gatz.crdt.user/action :gatz.crdt.user/update-notifications
                    :gatz.crdt.user/delta
                    {:crdt/clock clock
                     :user/settings {:settings/notifications
                                     (crdt/->lww-map {:settings.notification/activity :settings.notification/daily}
                                                     clock)}}}]]
      (doseq [action actions]
        (is (malli/validate schema/UserAction action)
            (malli/explain schema/UserAction action))))))