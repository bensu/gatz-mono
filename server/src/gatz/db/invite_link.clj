(ns gatz.db.invite-link
  (:require [crdt.core :as crdt]
            [com.biffweb :as biff :refer [q]]
            [gatz.db.contacts :as db.contacts]
            [gatz.schema :as schema]
            [gatz.util :as util]
            [xtdb.api :as xtdb])
  (:import [java.util Date]
           [java.time Duration]))

(comment

  "https://gatz.chat/invite-link/1234567890abcdef"
  "chat.gatz://invite-link/1234567890abcdef")

(defn make-url [ctx code]
  {:pre [(string? code)] :post [(string? %)]}
  (let [host (or (:gatz.api/host ctx) "https://api.gatz.chat")]
    (format "%s/invite/%s" host code)))

(defn valid? [{:keys [] :as invite-link}]
  (and (nil? (:invite_link/used_at invite-link))
       (nil? (:invite_link/used_by invite-link))))

(def default-open-duration (Duration/ofDays 90))

(defn expires-on ^Date [^Date created-at]
  (Date. (+ (.getTime created-at) (.toMillis default-open-duration))))

(def ^:dynamic *test-current-ts* nil)

;; This dynamic var is a sign that I need effect handlers
(defn expired?
  ([invite-link]
   (expired? invite-link {:flags {}}))
  ([{:invite_link/keys [expires_at] :as il} {:keys [now flags]}]
   (let [enforce-expiry? (if (contains? flags :flags/invite_links_expire)
                           (:flags/invite_links_expire flags)
                           true)
         current-ts (or *test-current-ts* now (Date.))]
     (if enforce-expiry?
       (boolean (and expires_at (util/before? expires_at current-ts)))
       false))))

#_(def default-settings
    {:invite_link/multi-user-mode :invite_link/crew})

(defn random-code
  "Generates a random code of 6 uppercase letters"
  []
  {:post [(string? %) (= 6 (count %))]}
  (apply str (repeatedly 6 #(char (+ (rand-int 26) 65)))))

(defn make [{:keys [type uid gid now id]}]

  {:pre [(uuid? uid)
         (contains? schema/invite-link-types type)
         (or (nil? id) (crdt/ulid? id))
         (or (nil? now) (instance? Date now))]}

  (when (= :invite_link/group type)
    (assert (crdt/ulid? gid)))

  (let [id (or id (crdt/random-ulid))
        now (or now (Date.))]
    {:xt/id id
     :db/type :gatz/invite_link
     :db/version 1
     :invite_link/type type
     :invite_link/group_id gid
     :invite_link/contact_id (when (= :invite_link/contact type) uid)
     :invite_link/created_by uid
     :invite_link/created_at now
     :invite_link/expires_at (expires-on now) 
     :invite_link/code (random-code)
     ;; :invite_link/settings default-settings
     :invite_link/used_at {}
     :invite_link/used_by #{}}))

(defn- as-unique [x] [:db/unique x])

(defn create! [ctx opts]
  (let [invite-link (make opts)]
    ;; You gotta wait to this operation because the transaction might fail
    ;; if you don't have a unique code
    (biff/submit-tx ctx [(-> invite-link
                             (update :invite_link/code as-unique)
                             (assoc :db/doc-type :gatz/invite_link
                                    :db/op :create))])
    invite-link))

(defn mark-used [invite-link {:keys [by-uid now]}]
  {:pre [(uuid? by-uid) (instance? Date now)]}
  (-> invite-link
      (update :invite_link/used_at assoc by-uid now)
      (update :invite_link/used_by conj by-uid)))

(def default-fields
  {:invite_link/contact_id nil})

(defn- from-entity [e]
  (when e
    (merge default-fields e)))

(defn by-id [db id]
  {:pre [(crdt/ulid? id)]}
  (when-let [e (xtdb/entity db id)]
    (from-entity e)))

(defn by-code [db code]
  {:pre [(string? code)]}
  (when-let [e (first
                (q db '{:find (pull ?id [*])
                        :in [code]
                        :where [[?id :invite_link/code code]
                                [?id :db/type :gatz/invite_link]]}
                   code))]
    (from-entity e)))

(defn active-crew-invite-by-user
  "Returns the most recently created active (not expired) crew invite link for a specific user"
  [db user-id & {:keys [flags]}]
  {:pre [(uuid? user-id)]}
  (let [results (q db '{:find (pull ?id [*])
                        :in [user-id]
                        :where [[?id :invite_link/created_by user-id]
                                [?id :invite_link/type :invite_link/crew]
                                [?id :invite_link/group_id nil]
                                [?id :db/type :gatz/invite_link]]}
                   user-id)]
    (when-let [invite-links (seq (map from-entity results))]
      ;; Find the most recent non-expired link
      (->> invite-links
           (remove #(expired? % {:flags flags}))
           (filter #(some? (:invite_link/code %)))
           (sort-by :invite_link/created_at #(compare %2 %1)) ; Sort descending by creation date
           first))))

(defn mark-used!
  [{:keys [biff/db] :as ctx} id {:keys [by-uid now]}]
  (when-let [invite-link (by-id db id)]
    (let [now (or now (Date.))
          new-invite-link (mark-used invite-link {:by-uid by-uid :now now})]
      (biff/submit-tx ctx [(assoc new-invite-link :db/doc-type :gatz/invite_link)])
      new-invite-link)))

(defn mark-used-txn [xtdb-ctx {:keys [args]}]
  (let [{:keys [id user-id now]} args
        db (xtdb/db xtdb-ctx)
        invite-link (by-id db id)]
    (assert (uuid? user-id))
    (assert (inst? now))
    (assert (some? invite-link))
    [[:xtdb.api/put (-> invite-link
                        (mark-used {:by-uid user-id :now now}))]]))

(def mark-used-expr
  '(fn mark-used-fn [ctx args]
     (gatz.db.invite-link/mark-used-txn ctx args)))

(def tx-fns
  {:gatz.db.invite-links/mark-used mark-used-expr})


;; ======================================================================
;; Who can invite?

(def total-friends-needed 10)

(def invite-screen-schema
  [:map
   [:invite_screen/is_global_invites_enabled boolean?]
   [:invite_screen/can_user_invite boolean?]
   [:invite_screen/current_number_of_friends integer?]
   [:invite_screen/total_friends_needed integer?]
   [:invite_screen/required_friends_remaining integer?]])

(defn get-screen [{:keys [flags/flags biff/db auth/user-id] :as _ctx}]
  (let [my-contacts (:contacts/ids (db.contacts/by-uid db user-id))
        current-number-of-friends (count my-contacts)
        required-friends-remaining (max 0 (- total-friends-needed current-number-of-friends))
        globally-enabled? (:flags/global_invites_enabled flags)
        only-users-with-friends-can-invite? (:flags/only_users_with_friends_can_invite flags)]
    {:invite_screen/is_global_invites_enabled globally-enabled?
     :invite_screen/can_user_invite (boolean (if only-users-with-friends-can-invite?
                                               (and globally-enabled?
                                                    (<= required-friends-remaining 0))
                                               globally-enabled?))
     :invite_screen/current_number_of_friends current-number-of-friends
     :invite_screen/total_friends_needed total-friends-needed
     :invite_screen/required_friends_remaining (if only-users-with-friends-can-invite?
                                                 required-friends-remaining
                                                 0)}))

