(ns gatz.db.user
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.pprint :as pp]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.evt :as db.evt]
            [gatz.db.util :as db.util]
            [gatz.schema :as schema]
            [malli.core :as malli]
            [malli.util :as mu]
            [sdk.twilio :as twilio]
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

(defn v1->v2 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> data
        (assoc :db/version 2 :crdt/clock clock)
        (update-in [:user/profile :profile/urls] #(merge (crdt.user/empty-links clock) %)))))

(defn v2->v3 [data]
  (let [clock (crdt/new-hlc migration-client-id)
        nts-on (crdt/-value (get-in data [:user/settings :settings/notifications :settings.notification/overall]))]
    (-> data
        (assoc :db/version 3 :crdt/clock clock)
        (assoc-in [:user/settings :settings/notifications :settings.notification/friend_accepted] (crdt/lww clock nts-on)))))

(defn v3->v4 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> data
        (assoc :db/version 4 :crdt/clock clock)
        (update-in [:user/profile :profile/full_name] #(or % (crdt/lww clock nil))))))

(defn v4->v5 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> data
        (assoc :db/version 5 :crdt/clock clock)
        ;; Add top-level auth fields as plain values (immutable)
        (assoc :user/apple_id nil
               :user/google_id nil
               :user/email nil))))

(def all-migrations
  [{:from 0 :to 1 :transform v0->v1}
   {:from 1 :to 2 :transform v1->v2}
   {:from 2 :to 3 :transform v2->v3}
   {:from 3 :to 4 :transform v3->v4}
   {:from 4 :to 5 :transform v4->v5}])

(defn- as-unique [x] [:db/unique x])

;; ======================================================================
;; Activity 

;; We keep what used to be :user/last_active in a separate document
;; so that the user document doesn't get updated every time the user
;; visits the app.

(defn activity-v0->v1 [data]
  (let [clock (crdt/new-hlc migration-client-id)]
    (-> data
        (assoc :db/version 2 :crdt/clock clock)
        (assoc :user_activity/last_location (crdt/lww clock nil))
        (update :user_activity/last_active #(crdt/->MaxWins %)))))

(def activity-migrations
  [{:from 0 :to 1 :transform identity}
   {:from 1 :to 2 :transform activity-v0->v1}])

(defn new-activity-doc [{:keys [uid now id]}]
  (let [clock (crdt/new-hlc uid now)]
    {:db/doc-type :gatz/user_activity
     :xt/id (or id (random-uuid))
     :db/op :create
     :db/type :gatz/user_activity
     :db/version 2
     :user_activity/user_id uid
     :crdt/clock clock
     :user_activity/last_active (crdt/->MaxWins now)
     :user_activity/last_location (crdt/lww clock nil)}))

(defn activity-by-uid [db uid]
  {:pre [(uuid? uid)]}
  (some-> (first
           (q db
              '{:find (pull a [*])
                :in [uid]
                :where [[a :db/type :gatz/user_activity]
                        [a :user_activity/user_id uid]]}
              uid))
          (db.util/->latest-version activity-migrations)))


(defn mark-active-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [uid now]} args
        clock (crdt/new-hlc uid now)
        delta {:crdt/clock clock
               :user_activity/last_active now}
        doc (or (activity-by-uid db uid)
                (new-activity-doc {:uid uid :now now}))]
    [[:xtdb.api/put (-> doc
                        (crdt/-apply-delta delta)
                        (assoc :db/doc-type :gatz/user_activity))]]))

(defn remove-location!
  "Development time only"
  [{:keys [biff.xtdb/node] :as ctx} {:keys [uid now]}]
  {:pre [(uuid? uid) (inst? now)]}
  (let [db (xtdb.api/db node)
        clock (crdt/new-hlc uid now)
        doc (activity-by-uid db uid)
        lww (crdt/lww clock nil)]
    (biff/submit-tx ctx
                    [[:xtdb.api/put (assoc doc
                                           :crdt/clock clock
                                           :user_activity/last_location lww)]])))

(def mark-active-expr
  '(fn mark-active-fn [ctx args]
     (gatz.db.user/mark-active-txn ctx args)))

(defn mark-location-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [location_id uid now]} args
        clock (crdt/new-hlc uid now)
        lww (crdt/lww clock {:location/id location_id :location/ts now})
        delta {:crdt/clock clock
               :user_activity/last_location lww}
        doc (or (activity-by-uid db uid)
                (new-activity-doc {:uid uid :now now}))]
    [[:xtdb.api/put (-> doc
                        (crdt/-apply-delta delta)
                        (assoc :db/doc-type :gatz/user_activity))]]))

(def mark-location-expr
  '(fn mark-location-fn [ctx args]
     (gatz.db.user/mark-location-txn ctx args)))

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

(defn by-apple-id [db apple-id]
  {:pre [(string? apple-id) (not (empty? apple-id))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [apple-id]
                   :where [[u :user/apple_id apple-id]
                           [u :db/type :gatz/user]]}
                 apple-id)]
    (some-> (first users)
            (db.util/->latest-version all-migrations))))

(defn by-google-id [db google-id]
  {:pre [(string? google-id) (not (empty? google-id))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [google-id]
                   :where [[u :user/google_id google-id]
                           [u :db/type :gatz/user]]}
                 google-id)]
    (some-> (first users)
            (db.util/->latest-version all-migrations))))

(defn by-email [db email]
  {:pre [(string? email) (not (empty? email))]}
  (let [users (q db
                 '{:find (pull u [*])
                   :in [email]
                   :where [[u :user/email email]
                           [u :db/type :gatz/user]]}
                 email)]
    (some-> (first users)
            (db.util/->latest-version all-migrations))))

(defn sms-only-user? 
  "Check if a user is SMS-only (legacy user): has phone but no Apple/Google/email"
  [user]
  (and (some? (:user/phone_number user))
       (nil? (:user/apple_id user))
       (nil? (:user/google_id user))
       (nil? (:user/email user))))

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

(defn mask-deleted [user]
  (cond-> user
    (some? (some-> user :user/deleted_at crdt/-value))
    (assoc :user/name "[deleted]"
           :user/avatar nil
           :user/profile {:profile/full_name nil
                          :profile/urls {:profile.urls/twitter nil
                                         :profile.urls/website nil}}
           :user/phone_number nil)))

(defn by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (when-let [e (xtdb/entity db user-id)]
    (-> (merge crdt.user/user-defaults e)
        (db.util/->latest-version all-migrations)
        mask-deleted)))


(defn create-user!
  ([ctx {:keys [username phone id now apple_id google_id email]}]

   {:pre [(crdt.user/valid-username? username) (or (nil? phone) (string? phone))]}

   (let [id (or id (random-uuid))
         now (or now (Date.))
         ;; Always get fresh DB to check for duplicates
         db (xtdb/db (:biff.xtdb/node ctx))
         
         ;; Check for duplicate social auth IDs  
         _ (when (and apple_id (by-apple-id db apple_id))
             (throw (ex-info "Apple ID already exists" {:type :duplicate-apple-id})))
         _ (when (and google_id (by-google-id db google_id))
             (throw (ex-info "Google ID already exists" {:type :duplicate-google-id})))
         _ (when (and email (by-email db email))
             (throw (ex-info "Email already exists" {:type :duplicate-email})))
         
         user (crdt.user/new-user {:id id
                                   :phone phone
                                   :username username
                                   :now now
                                   :apple_id apple_id
                                   :google_id google_id
                                   :email email})
         test? (or (not= :env/prod (:env ctx))
                   (contains? twilio/TEST_PHONES phone))
         
         user-txn (-> user
                       (assoc :user/is_test test?)
                       (assoc :db/doc-type :gatz.crdt/user :db/op :create)
                       (update :user/name as-unique)
                       ;; Make top-level auth fields unique for indexing (now plain values)  
                       (cond->
                         (:user/phone_number user) (update :user/phone_number as-unique)
                         (:user/apple_id user) (update :user/apple_id as-unique)
                         (:user/google_id user) (update :user/google_id as-unique)
                         (:user/email user) (update :user/email as-unique)))
         txns [user-txn
               (new-contacts-txn {:uid id :now now})
               (new-activity-doc {:uid id :now now})]]
     (biff/submit-tx ctx txns)
     user)))

(defn update-username!
  "Only used in manual fixups or migrations, not part of what users can do"
  ([{:keys [biff.xtdb/node] :as ctx} uid new-username]

   {:pre [(crdt.user/valid-username? new-username)]}

   (let [now (Date.)
         db (xtdb.api/db node)
         user (by-id db uid)
         _ (assert user)
         new-user (-> user
                      (assoc :user/name (as-unique new-username)
                             :user/updated_at (crdt/max-wins now)
                             :crdt/clock (crdt/new-hlc uid now)
                             :db/doc-type :gatz.crdt/user))]
     (biff/submit-tx ctx [new-user])
     new-user)))


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

(defn apply-action!
  "Applies a delta to the user and stores it"
  [{:keys [biff/db auth/user-id auth/cid] :as ctx} action] ;; TODO: use cid
  {:pre [(uuid? user-id)]}
  (let [evt (db.evt/new-evt {:evt/type :gatz.crdt.user/delta
                             :evt/uid user-id
                             :evt/cid cid
                             :evt/data action})]
    (assert (true? (malli/validate schema/UserEvent evt))
            (str "Invalid event: " (pp/pprint (malli/explain schema/UserEvent evt))))
    (let [txs [[:xtdb.api/fn :gatz.db.user/apply-delta {:evt evt}]]
          ;; Try the transaction before submitting it
          db-after (xtdb.api/with-tx db txs)]
      (assert (some? db-after) "Transaction would've failed")
      (biff/submit-tx (assoc ctx :biff.xtdb/retry false) txs)
      {:evt (xtdb.api/entity db-after (:xt/id evt))
       :user (by-id db-after user-id)})))

(defn update-avatar!
  ([ctx avatar–url]
   (update-avatar! ctx avatar–url {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} avatar–url {:keys [now]}]
   {:pre [(uuid? user-id) (string? avatar–url) (inst? now)]}
   (let [clock (crdt/new-hlc user-id now)
         action {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                 :gatz.crdt.user/delta {:crdt/clock clock
                                        :user/updated_at (crdt/max-wins now)
                                        :user/avatar (crdt/->LWW clock avatar–url)}}]
     (apply-action! ctx action))))

(defn edit-profile!
  ([ctx profile]
   (edit-profile! ctx profile {:now (Date.)}))

  ([{:keys [auth/user-id] :as ctx} profile {:keys [now]}]
   {:pre [(uuid? user-id)]}
   (let [{:profile/keys [urls full_name]} profile
         clock (crdt/new-hlc user-id now)
         crdt (cond-> {}
                (not (empty? urls)) (assoc :profile/urls (crdt/->lww-map urls clock))
                (not (empty? full_name)) (assoc :profile/full_name (crdt/lww clock full_name)))
         action {:gatz.crdt.user/action :gatz.crdt.user/update-profile
                 :gatz.crdt.user/delta {:crdt/clock clock
                                        :user/updated_at (crdt/max-wins now)
                                        :user/profile crdt}}]
     (apply-action! ctx action))))

(defn add-push-token!
  ([ctx params]
   (add-push-token! ctx params {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} {:keys [push-token]} {:keys [now]}]

   {:pre [(uuid? user-id)
          (malli/validate schema/PushTokens push-token)]}

   (let [clock (crdt/new-hlc user-id now)
         delta {:crdt/clock clock
                :user/updated_at (crdt/max-wins now)
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
                :user/updated_at (crdt/max-wins now)
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
                :user/updated_at (crdt/max-wins now)
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

(defn mark-location!
  [{:keys [auth/user-id] :as ctx} {:keys [location_id now]}]
  {:pre [(uuid? user-id) (string? location_id)]}
  (let [args {:uid user-id :location_id location_id :now now}]
    (biff/submit-tx (assoc ctx :biff.xtdb/retry false)
                    [[:xtdb.api/fn :gatz.db.user/mark-location {:args args}]])))

(defn update-location-settings!

  ([ctx location-settings]
   (update-location-settings! ctx location-settings {:now (Date.)}))

  ([{:keys [auth/user-id] :as ctx} location-settings {:keys [now]}]

   {:pre [(uuid? user-id)
          (malli/validate (mu/optional-keys schema/LocationPreferences)
                          location-settings)]}

   (let [clock (crdt/new-hlc user-id now)
         delta {:crdt/clock clock
                :user/updated_at (crdt/max-wins now)
                :user/settings {:settings/location (crdt/->lww-map location-settings clock)}}
         action {:gatz.crdt.user/action :gatz.crdt.user/update-location-settings
                 :gatz.crdt.user/delta delta}]
     (apply-action! ctx action))))

(defn deleted? [user]
  (boolean (:user/deleted_at (crdt.user/->value user))))

(defn mark-delete-delta [uid now]
  (let [clock (crdt/new-hlc uid now)]
    {:crdt/clock clock
     :user/updated_at (crdt/max-wins now)
     :user/deleted_at now
     :user/profile {:profile/full_name (crdt/lww clock nil)
                    :profile/urls {:profile.urls/twitter (crdt/lww clock nil)
                                   :profile.urls/website (crdt/lww clock nil)}}}))

(defn mark-deleted-txn [db {:keys [uid now]}]
  (let [user (by-id db uid)
        delta (mark-delete-delta uid now)]
    (assert user)
    [[:xtdb.api/put (-> user
                        (gatz.crdt.user/apply-delta delta)
                        (assoc :db/doc-type :gatz.crdt/user))]]))

(defn mark-deleted!
  ([ctx]
   (mark-deleted! ctx {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} {:keys [now]}]
   {:pre [(uuid? user-id)]}
   (let [delta (mark-delete-delta user-id now)
         action {:gatz.crdt.user/action :gatz.crdt.user/mark-deleted
                 :gatz.crdt.user/delta delta}]
     (apply-action! ctx action))))

(defn mutually-blocked? [alice bob]
  (boolean
   (and alice bob
        (or
         (contains? (:user/blocked_uids (crdt.user/->value alice)) (:xt/id bob))
         (contains? (:user/blocked_uids (crdt.user/->value bob)) (:xt/id alice))))))

(defn- block-evt [{:keys [eid from to now]}]
  {:pre [(uuid? eid) (uuid? from) (uuid? to) (not= from to) (inst? now)]}
  (let [clock (crdt/new-hlc from now)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins now)
               :user/blocked_uids (crdt/lww-set-delta clock #{to})}
        action {:gatz.crdt.user/action :gatz.crdt.user/block-another-user
                :gatz.crdt.user/delta delta}]
    (db.evt/new-evt {:xt/id eid
                     :evt/type :gatz.crdt.user/delta
                     :evt/ts now
                     :evt/uid from
                     :evt/cid from
                     :evt/data action})))

(defn block-user-txn
  [_ctx {:keys [aid bid now aeid beid] :as _args}]
  (let [a-evt (block-evt {:eid aeid :from aid :to bid :now now})
        b-evt (block-evt {:eid beid :from bid :to aid :now now})
        args {:from aid :to bid :now now}]
    [[:xtdb.api/fn :gatz.db.user/apply-delta {:evt a-evt}]
     [:xtdb.api/fn :gatz.db.user/apply-delta {:evt b-evt}]
     [:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args args}]]))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  block-user-expr
  '(fn block-user-fn [ctx args]
     (gatz.db.user/block-user-txn ctx args)))

(defn block-user!

  ([ctx blocked-uid]
   (block-user! ctx blocked-uid {:now (Date.)}))

  ([{:keys [auth/user-id] :as ctx} blocked-uid {:keys [now]}]

   {:pre [(uuid? blocked-uid) (uuid? user-id) (not= blocked-uid user-id)]}


   (let [args {:aid user-id :bid blocked-uid
               :now now :aeid (random-uuid) :beid (random-uuid)}]
     (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.user/block-user args]]))))

;; ======================================================================
;; Apple Sign-In Functions

(defn create-apple-user!
  "Create a new user with Apple Sign-In authentication"
  [ctx {:keys [apple-id email full-name username]}]
  {:pre [(string? apple-id) (not (empty? apple-id))]}
  (let [username (or username (str "apple" (subs (str/replace apple-id #"[^a-zA-Z0-9]" "") 0 8)))] ; Use provided username or generate one
    (create-user! ctx {:username username
                       :apple_id apple-id
                       :email email})))

(defn link-apple-id!
  "Link Apple ID to an existing user account"
  ([ctx params]
   (link-apple-id! ctx params {:now (Date.)}))
  ([{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [apple-id email]} {:keys [now]}]
   {:pre [(uuid? user-id) (string? apple-id) (not (empty? apple-id))]}
   (let [db (xtdb/db node)
         current-user (by-id db user-id)
         ;; Update both CRDT fields and immutable auth fields
         clock (crdt/new-hlc user-id now)
         auth-fields (cond-> {:user/apple_id apple-id}
                       email (assoc :user/email email))
         updated-user (merge current-user 
                             {:crdt/clock clock
                              :user/updated_at (crdt/max-wins now)}
                             auth-fields)]
     ;; Submit direct transaction for auth fields
     (biff/submit-tx ctx [[:xtdb.api/put (assoc updated-user :db/doc-type :gatz.crdt/user)]])
     {:user updated-user})))

;; ======================================================================
;; Google Sign-In Functions

(defn create-google-user!
  "Create a new user with Google Sign-In authentication"
  [ctx {:keys [google-id email full-name username]}]
  {:pre [(string? google-id) (not (empty? google-id))]}
  (let [username (or username (str "google" (subs (str/replace google-id #"[^a-zA-Z0-9]" "") 0 6)))] ; Use provided username or generate one
    (create-user! ctx {:username username
                       :google_id google-id
                       :email email})))

(defn link-google-id!
  "Link Google ID to an existing user account"
  ([ctx params]
   (link-google-id! ctx params {:now (Date.)}))
  ([{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [google-id email]} {:keys [now]}]
   {:pre [(uuid? user-id) (string? google-id) (not (empty? google-id))]}
   (let [db (xtdb/db node)
         current-user (by-id db user-id)
         ;; Update both CRDT fields and immutable auth fields
         clock (crdt/new-hlc user-id now)
         auth-fields (cond-> {:user/google_id google-id}
                       email (assoc :user/email email))
         updated-user (merge current-user 
                             {:crdt/clock clock
                              :user/updated_at (crdt/max-wins now)}
                             auth-fields)]
     ;; Submit direct transaction for auth fields
     (biff/submit-tx ctx [[:xtdb.api/put (assoc updated-user :db/doc-type :gatz.crdt/user)]])
     {:user updated-user})))

(def tx-fns
  {:gatz.db.user/apply-delta user-apply-delta-expr
   :gatz.db.user/block-user block-user-expr
   :gatz.db.user/mark-active mark-active-expr
   :gatz.db.user/mark-location mark-location-expr})


(defn all-users [db]
  (mapv mask-deleted
        (q db '{:find (pull user [*])
                :where [[user :db/type :gatz/user]]})))


(defn get-friend-ids [db uid]
  ;; TOOD: change with friendship
  (all-ids db))

;; ======================================================================
;; Email Authentication Functions

(defn create-email-user!
  "Create a new user with email authentication"
  [ctx {:keys [email username]}]
  {:pre [(string? email) (not (empty? email)) 
         (string? username) (not (empty? username))]}
  (create-user! ctx {:username username
                     :email email}))

(defn link-email!
  "Link email to an existing user account"
  ([ctx params]
   (link-email! ctx params {:now (Date.)}))
  ([{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [email]} {:keys [now]}]
   {:pre [(uuid? user-id) (string? email) (not (empty? email))]}
   (let [db (xtdb/db node)
         current-user (by-id db user-id)
         clock (crdt/new-hlc user-id now)
         auth-fields (cond-> {:user/apple_id (:user/apple_id current-user)
                              :user/google_id (:user/google_id current-user)}
                       email (assoc :user/email email))
         updated-user (merge current-user 
                             {:crdt/clock clock
                              :user/updated_at (crdt/max-wins now)}
                             auth-fields)]
     ;; Submit direct transaction for auth fields
     (biff/submit-tx ctx [[:xtdb.api/put (assoc updated-user :db/doc-type :gatz.crdt/user)]])
     {:user updated-user})))
