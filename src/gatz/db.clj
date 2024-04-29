(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.message :as crdt.message]
            [gatz.db.message :as db.message]
            [gatz.db.evt :as db.evt]
            [gatz.schema :as schema]
            [malli.core :as m]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]))

;; ====================================================================== 
;; Utils

(defn valid-post? [s media-id]
  (and (string? s)
       (or (not (empty? s))
           (some? media-id))))

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
         (remove nil?)
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
         (remove nil?)
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
        (<= (count s) MAX_LENGTH_USERNAME)
        (<= MIN_LENGTH_USERNAME (count s))
        (re-matches #"^[a-z0-9._-]+$" s))))

(def notifications-off
  {:settings.notification/overall false
   :settings.notification/activity :settings.notification/none
   :settings.notification/subscribe_on_comment false
   :settings.notification/suggestions_from_gatz false

   ;; :settings.notification/comments_to_own_post false
   ;; :settings.notification/reactions_to_own_post false
   ;; :settings.notification/replies_to_comment false
   ;; :settings.notification/reactions_to_comment false
   ;; :settings.notification/at_mentions false
   })

(def notifications-on
  {:settings.notification/overall true
   :settings.notification/activity :settings.notification/daily
   :settings.notification/subscribe_on_comment true
   :settings.notification/suggestions_from_gatz true

   ;; :settings.notification/comments_to_own_post true
   ;; :settings.notification/reactions_to_own_post true
   ;; :settings.notification/replies_to_comment true
   ;; :settings.notification/reactions_to_comment true
   ;; :settings.notification/at_mentions true
   })

(def user-defaults
  {:db/type :gatz/user
   :db/doc-type :gatz/user
   :user/avatar nil
   :user/push_tokens nil
   :user/is_test false
   :user/is_admin false})

(defn update-user
  ([u] (update-user u (java.util.Date.)))
  ([u now]
   (cond-> (merge user-defaults
                  {:user/last_active now}
                  u)

     (nil? (:user/settings u))
     (update-in [:user/settings :settings/notifications]
                #(merge (if (:user/push_tokens u)
                          notifications-on
                          notifications-off)
                        %))

     true (assoc :db/doc-type :gatz/user)
     true (assoc :user/updated_at now))))

(defn create-user! [{:keys [biff/db] :as ctx} {:keys [username phone id]}]

  {:pre [(valid-username? username)]}

  (assert (nil? (user-by-name db username)))

  (let [now (java.util.Date.)
        user-id (or id (random-uuid))
        user {:xt/id user-id
              :user/name username
              :user/phone_number phone
              :user/created_at now}]
    (biff/submit-tx ctx [(update-user user now)])
    user))

(defn user-by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (xtdb/entity db user-id))

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
                           (update :user/settings assoc :settings/notifications notifications-on)
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
                           (update :user/settings assoc :settings/notifications notifications-off)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))

(defn turn-off-notifications! [{:keys [biff/db] :as ctx} uid]
  {:pre [(uuid? uid)]}
  (let [user (user-by-id db uid)
        updated-user (-> user
                         (update :user/settings assoc :settings/notifications notifications-off)
                         (update-user))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn edit-notifications!
  [{:keys [biff/db] :as ctx} uid notification-settings]
  {:pre [(uuid? uid)
         ;; TODO: This should allow a subset of the notification-preferences schema
         #_(m/validate schema/notification-preferences notification-settings)]}
  (let [user (user-by-id db uid)
        updated-user (-> user
                         (update-user)
                         (update-in [:user/settings :settings/notifications] #(merge % notification-settings)))]
    (biff/submit-tx ctx [updated-user])
    updated-user))

(defn update-user-avatar!

  [{:keys [biff/db] :as ctx} user-id avatar–url]
  {:pre [(uuid? user-id) (string? avatar–url)]}

  (if-let [user (user-by-id db user-id)]
    (let [updated-user (-> user
                           (assoc :user/avatar avatar–url)
                           (update-user))]
      (biff/submit-tx ctx [updated-user])
      updated-user)
    (assert false "User not found")))


(defn all-users [db]
  (vec (q db '{:find (pull user [*])
               :where [[user :db/type :gatz/user]]})))

;; ====================================================================== 
;; Media

(def media-kinds
  #{;;  :media/aud 
    :media/img
                  ;;  :media/vid
    })

(defn media-by-id [db id]
  (q db '{:find [(pull m [*])]
          :in [id]
          :where [[m :db/type :gatz/media]
                  [m :xt/id id]]}
     id))

(def default-media
  {:media/size nil :media/height nil :media/width nil})

(defn update-media [media]
  (assoc (merge default-media media)
         :db/type :gatz/media
         :db/doc-type :gatz/media))

(defn create-media!
  [{:keys [auth/user-id] :as ctx}
   {:keys [id kind url size width height] :as params}]

  {:pre [(uuid? user-id)
         (uuid? id)
         (contains? media-kinds kind)
         (string? url)
          ;; (string? mime) (number? size)
         ]}

  (let [now (java.util.Date.)
        media-id (or id (random-uuid))
        media {:xt/id media-id
               :media/user_id user-id
               :media/message_id nil
               :media/kind kind
               :media/url url
               :media/width width
               :media/height height
               :media/size size
               ;; :media/mime mime
               :media/created_at now}]
    (biff/submit-tx ctx [(update-media media)])
    media))

;; ====================================================================== 
;; Discussion 

(defn d-by-id [db did]
  (xtdb/entity db did))

(def discussion-defaults
  {:discussion/seen_at {}
   :discussion/archived_at {}
   :discussion/last_message_read {}
   :discussion/subscribers #{}
   :discussion/originally_from nil
   :discussion/first_message nil
   :discussion/latest_message nil})

(defn update-discussion
  ([d] (update-discussion d (java.util.Date.)))
  ([d now]
   (-> (merge discussion-defaults
              ;; TODO: remove when migration is complete
              {:discussion/latest_activity_ts now}
              d)
       (assoc :db/doc-type :gatz/discussion)
       (assoc :discussion/updated_at now))))

(defn seen-by-user?
  "Has the user seen this discussion?
 
  Should be kept in-sync with the client version of this function"
  [user-id d]
  {:pre [(uuid? user-id)]
   :post [(boolean? %)]}
  (let [seen-at (get-in d [:discussion/seen_at user-id])
        updated-at (get-in d [:discussion/updated_at])]
    (boolean (or (nil? seen-at)
                 (< seen-at updated-at)))))

(defn sort-feed [user-id discussions]
  (let [seen-discussions (group-by (partial seen-by-user? user-id) discussions)]
    (concat
     (sort-by :discussion/updated_at (get seen-discussions true))
     (sort-by :discussion/updated_at (get seen-discussions false)))))

(defn create-discussion-with-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get the real connection id
   {:keys [name selected_users text media_id originally_from]}]

  {:pre [(or (nil? name)
             (and (string? name) (not (empty? name)))
             (valid-post? text media_id))]}

  (let [originally-from (when originally_from
                          {:did (mt/-string->uuid (:did originally_from))
                           :mid (mt/-string->uuid (:mid originally_from))})
        original-msg (when originally-from
                       (db.message/by-id db (:mid originally-from)))
        now (java.util.Date.)
        did (random-uuid)
        mid (random-uuid)
        member-uids (set (keep mt/-string->uuid selected_users))
        ;; TODO: get real connection id
        clock (crdt/new-hlc user-id now)
        ;; TODO: embed msg in discussion
        d {:db/type :gatz/discussion
           :xt/id did
           :discussion/did did
           :discussion/name name
           :discussion/created_by user-id
           :discussion/subscribers #{user-id}
           :discussion/originally_from originally-from
           :discussion/first_message mid
           :discussion/latest_message mid
           ;; We'll let the user see their own discussion in the feed as new
           ;; :discussion/seen_at {user-id now}
           :discussion/members (conj member-uids user-id)
           :discussion/latest_activity_ts now
           :discussion/created_at now}
        d (update-discussion d now)
        media (some->> media_id
                       mt/-string->uuid
                       (media-by-id db))
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text (or text "") :reply_to nil
              :media (when media [media])}
             {:now now :cid user-id :clock clock})
        evt-data {:discussion.crdt/action :discussion.crdt/new
                  :discussion.crdt/delta (assoc d :discussion/messages {mid msg})}
        evt (db.evt/new-evt {:evt/type :discussion.crdt/delta
                             :evt/uid user-id
                             :evt/did did
                             :evt/mid mid
                             :evt/cid cid
                             :evt/data evt-data})
        txns [(assoc d :db/doc-type :gatz/discussion)
              (assoc msg :db/doc-type :gatz.crdt/message)
              (assoc evt :db/doct-type :gatz/evt)
              ;; TODO: update other discussion, not just message for it
              (some-> original-msg
                      (crdt.message/apply-delta {:message/posted_as_discussion did
                                                 :message/updated_at now
                                                 :crdt/clock clock})
                      (assoc :db/doc-type :gatz.crdt/message))
              (some-> media
                      (assoc :media/message_id mid)
                      (update-media)
                      (assoc :db/doct-type :gatz/media))]]
    (biff/submit-tx ctx (vec (remove nil? txns)))
    {:discussion d :message msg}))

(defn mark-as-seen! [{:keys [biff/db] :as ctx} uid dids now]
  {:pre [(every? uuid? dids) (uuid? uid) (inst? now)]}
  (let [txns (mapv (fn [did]
                     (let [d (d-by-id db did)
                           seen-at (-> (:discussion/seen_at d {})
                                       (assoc uid now))]
                       (-> d
                           (assoc :discussion/seen_at seen-at)
                           (update-discussion))))
                   dids)]
    (biff/submit-tx ctx txns)))

(defn mark-message-seen!
  [{:keys [biff/db] :as ctx} uid did mid now]
  {:pre [(uuid? mid) (uuid? uid) (uuid? did) (inst? now)]}
  (let [d (d-by-id db did)
        new-d (-> d
                  (update :discussion/last_message_read assoc uid mid)
                  (update-discussion now))]
    (biff/submit-tx ctx [new-d])
    new-d))

(defn archive! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        archive-at (:discussion/archived_at d {})
        d (assoc d :discussion/archived_at (assoc archive-at uid now))]
    (biff/submit-tx ctx [(update-discussion d now)])
    d))

(defn subscribe!
  ([ctx uid did]
   (subscribe! ctx uid did (java.util.Date.)))
  ([{:keys [biff/db] :as ctx} uid did now]
   {:pre [(uuid? did) (uuid? uid) (inst? now)]}
   (let [d (d-by-id db did)
         _ (assert d)
         updated-d (-> d
                       (update :discussion/subscribers conj uid)
                       (update-discussion now))]
     (biff/submit-tx ctx [updated-d])
     updated-d)))

(defn unsubscribe! [{:keys [biff/db] :as ctx} uid did now]
  {:pre [(uuid? did) (uuid? uid) (inst? now)]}
  (let [d (d-by-id db did)
        _ (assert d)
        updated-d (-> d
                      (update :discussion/subscribers disj uid)
                      (update-discussion now))]
    (biff/submit-tx ctx [updated-d])
    updated-d))

(defn get-all-discussions [db]
  (q db
     '{:find (pull d [*])
       :where [[d :db/type :gatz/discussion]]}))

(defn get-all-discussions-with-latest-message [db]
  (q db
     '{:find [(pull d [*]) (pull m [*])]
       :where [[d :db/type :gatz/discussion]
               [d :discussion/latest_message m]
               [m :db/type :gatz/message]]}))

(defn discussion-by-id [db did]
  {:pre [(uuid? did)]}
  ;; TODO: change shape
  (let [discussion (d-by-id db did)
        messages (db.message/by-did db did)]
    (assert discussion)
    {:discussion discussion
     :user_ids (:discussion/members discussion)
     :messages (mapv crdt.message/->value messages)}))

(defn add-member! [ctx p]
  (let [d (discussion-by-id (:biff/db ctx) (:discussion/id p))
        new-d (-> (:discussion d)
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members conj (:user/id p)))]
    (biff/submit-tx ctx [(update-discussion new-d)])))

(defn remove-members! [ctx did uids]
  {:pre [(uuid? did) (every? uuid? uids)]}
  (let [d (discussion-by-id (:biff/db ctx) did)
        new-d (-> (:discussion d)
                  (assoc :db/doc-type :gatz/discussion)
                  (update :discussion/members set/difference (set uids)))]
    (biff/submit-tx ctx [(update-discussion new-d)])))

;; TODO: add a max limit
(defn discussions-by-user-id [db user-id]
  (let [dids (q db '{:find [did]
                     :in [user-id]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]]}
                user-id)]
    (set (map first dids))))


;; ----------------------------------------------------------------------------
;; Feed

;; TODO: figure out how to embed this as a parameter to the query
(def discussion-fetch-batch 20)

(defn discussions-by-user-id-up-to [db user-id]
  (let [dids (q db '{:find [did latest-activity-ts]
                     :in [user-id]
                     :order-by [[latest-activity-ts :desc]]
                     :limit 20
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/latest_activity_ts latest-activity-ts]
                             [did :discussion/members user-id]]}
                user-id)]
    (mapv first dids)))


(defn discussions-by-user-id-older-than

  [db user-id older-than-ts]

  {:pre [(uuid? user-id) (inst? older-than-ts)]}

  (let [dids (q db '{:find [did latest-activity-ts]
                     :in [user-id older-than-ts]
                     :limit 20
                     :order-by [[latest-activity-ts :desc]]
                     :where [[did :db/type :gatz/discussion]
                             [did :discussion/members user-id]
                             [did :discussion/latest_activity_ts latest-activity-ts]
                             [(< latest-activity-ts older-than-ts)]]}
                user-id older-than-ts)]
    (mapv first dids)))

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


;; TODO: can't query messages like this directly anymore
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

(defn media-by-id [db id]
  {:pre [(uuid? id)]}
  (xtdb/entity db id))

#_(defn ->uuid [s]
    (if (string? s)
      (try
        (java.util.UUID/fromString s)
        (catch Exception _ nil))))

(defn create-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get connection id
   {:keys [text mid did media_id reply_to]}]

  {:pre [(string? text)
         (or (nil? mid) (uuid? mid))
         (uuid? did) (uuid? user-id)
         (or (nil? media_id) (uuid? media_id))
         (or (nil? reply_to) (uuid? reply_to))]}

  (let [now (java.util.Date.)
        mid (or mid (random-uuid))
        user (user-by-id db user-id)
        _ (assert user)
        auto-subscribe? (get-in user [:user/settings :settings/notifications
                                      :settings.notification/subscribe_on_comment]
                                false)
        media (when media_id
                (media-by-id db media_id))
        updated-media (some-> media
                              (assoc :media/message_id mid)
                              (update-media))
        ;; TODO: put directly in discussion
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text text  :reply_to reply_to
              :media (when updated-media [updated-media])}
             ;; TODO: get real connection id
             {:now now :cid user-id})
        d (d-by-id db did)
        updated-discussion (cond-> d
                             auto-subscribe? (update :discussion/subscribers conj user-id)
                             true (assoc :discussion/latest_message mid)
                             true (assoc :discussion/latest_activity_ts now)
                             true (update :discussion/seen_at assoc user-id now)
                             true (update-discussion now))
        evt-data {:discussion.crdt/action :discussion.crdt/new-message
                  :discussion.crdt/delta  {:discussion/messages {mid msg}}}
        evt (db.evt/new-evt {:evt/type :discussion.crdt/delta
                             :evt/uid user-id
                             :evt/did did
                             :evt/mid mid
                             :evt/cid cid
                             :evt/data evt-data})]
    (biff/submit-tx ctx (vec (remove nil? [(assoc msg :db/doc-type :gatz.crdt/message)
                                           (assoc evt :db/doc-type :gatz/evt)
                                           updated-discussion
                                           updated-media])))
    msg))

