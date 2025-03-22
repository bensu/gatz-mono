(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [clojure.string :as str]
            [clojure.tools.logging :as log]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.feed :as db.feed]
            [gatz.db.group :as db.group]
            [gatz.db.location :as db.location]
            [gatz.db.media :as db.media]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [gatz.util :as util]
            [link-preview.core :as link-preview]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ======================================================================
;; Utils

;; deprecated when single media-id is deprecated
(defn old-valid-post? [s media-id]
  (and (string? s)
       (or (not (empty? s))
           (some? media-id))))

(defn valid-post? [s media-ids]
  (and (string? s)
       (or (not (empty? s))
           (and (coll? media-ids)
                (not (empty? media-ids))))))

;; ======================================================================
;; Discussion

(defn get-mentioned-users [db user-id members text]
  (->> (db.message/extract-mentions text)
       set
       (keep (partial db.user/by-name db))
       (filter (fn [{:keys [xt/id]}]
                 (and (not= user-id id)
                      (contains? members id))))))

(defn sort-feed [user-id discussions]
  (let [seen-discussions (group-by (partial db.discussion/seen-by-user? user-id) discussions)]
    (concat
     (sort-by :discussion/updated_at (get seen-discussions true))
     (sort-by :discussion/updated_at (get seen-discussions false)))))

(def create-discussion-params
  [:map
   [:name {:optional true} string?]
   [:text string?]
   [:media_id {:optional true} uuid?]
   [:media_ids [:vec uuid?]]
   [:link_previews [:vec uuid?]]
   [:group_id {:optional true} schema/ulid?]
   [:selected_users {:optional true} [:vec uuid?]]
   [:to_all_contacts {:optional true} boolean?]
   [:to_all_friends_of_friends {:optional true} boolean?]
   [:location_id {:optional true} string?]
   [:originally_from {:optional true} [:map
                                       [:did uuid?]
                                       [:mid uuid?]]]])

(defn parse-originally-from [{:keys [did mid]}]
  (let [did (util/parse-uuid did)
        mid (util/parse-uuid mid)]
    (if (and did mid)
      {:did did :mid mid}
      (throw (IllegalArgumentException. "Invalid originally_from")))))

(defn parse-create-params
  [{:keys [name group_id text to_all_contacts
           media_id media_ids
           link_previews
           originally_from selected_users
           to_all_friends_of_friends
           location_id]}]
  {:pre [(or (nil? name)
             (and (string? name) (not (empty? name)))
             (or (old-valid-post? text media_id)
                 (valid-post? text media_ids)))
         (or (nil? location_id) (string? location_id))
         (or (boolean? to_all_contacts)
             (some? selected_users))
         (or (nil? to_all_friends_of_friends)
             (boolean? to_all_friends_of_friends))]}

  (when (empty? text)
    (assert (not (empty? media_ids))
            "Text is empty, media_ids must not be empty"))

  (cond-> {}
    (string? name)   (assoc :name (str/trim name))
    (string? text)   (assoc :text (str/trim text))
    (some? group_id) (assoc :group_id (crdt/parse-ulid group_id))
    (some? media_id) (assoc :media_ids (when-let [media-id (util/parse-uuid media_id)]
                                         [media-id]))
    (coll? media_ids)             (assoc :media_ids (vec (keep util/parse-uuid media_ids)))
    (coll? link_previews)         (assoc :link_previews (vec (keep util/parse-uuid link_previews)))
    (some? originally_from)       (assoc :originally_from (parse-originally-from originally_from))
    (some? selected_users)        (assoc :selected_users (set (keep util/parse-uuid selected_users)))
    (boolean? to_all_contacts)    (assoc :to_all_contacts to_all_contacts)
    (string? location_id)         (assoc :location_id location_id)

    (boolean? to_all_friends_of_friends) (assoc :to_all_friends_of_friends to_all_friends_of_friends)
    (nil? to_all_friends_of_friends)     (assoc :to_all_friends_of_friends false)))

(defn create-discussion-with-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get the real connection id
   {:keys [did now] :as init-params}]

  {:pre [(or (nil? did) (uuid? did))
         (or (nil? now) (inst? now))]}

  (let [{:keys [selected_users group_id to_all_contacts
                text originally_from
                to_all_friends_of_friends
                media_ids link_previews
                location_id]}
        (parse-create-params init-params)

        _ (when to_all_friends_of_friends
            (assert to_all_contacts "Friends of friends requires to_all_contacts to be true")
            (assert (nil? group_id) "Friends of friends can't be used with a group"))

        now (or now (Date.))
        did (or did (random-uuid))
        mid (random-uuid)

        user (db.user/by-id db user-id)
        _ (assert user)

        location (when location_id
                   (db.location/by-id location_id))

        _ (when location_id
            (assert location "The location_id provided doesn't exist"))

        link-previews (mapv #(link-preview/by-id db %) (or link_previews []))
        updated-medias (some->> media_ids
                                (keep (partial db.media/by-id db))
                                (mapv (fn [m]
                                        (-> m
                                            (assoc :media/message_id mid)
                                            (assoc :db/doct-type :gatz/media)
                                            (db.media/update-media)))))

        group (when group_id
                (db.group/by-id db group_id))

        [member-uids archived-uids]
        (if group
          ;; The post is directed to a group
          (let [group-members (:group/members group)
                archiver-uids (:group/archived_uids group)]
            (assert group "Group passed doesn't exist")
            (assert (contains? group-members user-id) "Not authorized to post to this group")

            (if selected_users
              ;; The post is directed to a subset of the group
              (do
                (assert (set/subset? selected_users group-members) "The selected users are not a subset of the group members")
                [selected_users (set/intersection archiver-uids selected_users)])
              ;; The post is directed to the entire group
              (do
                (assert to_all_contacts "The post is not directed to the entire group nor to a subset")
                [group-members archiver-uids])))

          ;; The post is directed to a set of users
          (let [contacts (db.contacts/by-uid db user-id)
                contact-uids (:contacts/ids contacts)
                muted-uids (or (:contacts/hidden_me contacts) #{})]
            (if selected_users
              ;; The post is directed to a subset of the user's contacts
              (let [member-uids (disj selected_users user-id)]
                (assert (set/subset? member-uids contact-uids) "The selected users are not a subset of the user's contacts")
                [member-uids (set/intersection muted-uids member-uids)])

              (if to_all_friends_of_friends
                ;; The post is directed to the user's friends and friends of friends
                (let [fof (db.contacts/friends-of-friends db user-id)]
                  [fof (set/intersection muted-uids fof)])
                (do
                  ;; The post is directed to all of the user's contacts
                  (assert to_all_contacts "The post is not directed to all of the user's contacts")
                  [contact-uids (set/intersection contact-uids muted-uids)])))))

        _ (assert (and (set? member-uids) (every? uuid? member-uids)))
        _ (assert (and (set? archived-uids) (every? uuid? archived-uids)))

        originally-from (when-let [og-mid (:mid originally_from)]
                          (assert (:did originally_from))
                          (let [og-did (:did originally_from)
                                og-d (db.discussion/by-id db og-did)
                                og-m (db.message/by-id db og-mid)
                                og-user-id (some-> og-m :message/user_id)
                                og-user (some->> og-user-id
                                                 (db.user/by-id db)
                                                 (crdt.user/->value))]
                            (assert og-d)
                            (assert og-m)
                            (assert og-user)
                            (assert (= og-did (:message/did og-m))
                                    "Original message is not from the discussion")
                            (assert (or (= user-id og-user-id)
                                        (contains? member-uids og-user-id))
                                    "You need to include the person you are continuing from")
                            {:mid og-mid
                             :did og-did}))

        dm? (and (not group)
                 (= 1 (count (disj member-uids user-id))))

        mentioned-users (get-mentioned-users db user-id member-uids text)

        fi-txns (->> mentioned-users
                     (mapcat (fn [u]
                               (db.feed/new-mention-txn
                                (db.feed/new-feed-item-id)
                                now
                                {:by_uid user-id
                                 :to_uid (:xt/id u)
                                 :did did
                                 :mid mid
                                 :gid group_id}))))

        ;; We continue to store mentions in the database
        ;; until the old clients are retired
        mentions (map (fn [u]
                        {:xt/id (crdt/rand-uuid)
                         :db/type :gatz/mention
                         :db/version 1
                         :mention/by_uid user-id
                         :mention/to_uid (:xt/id u)
                         :mention/did did
                         :mention/mid mid
                         :mention/ts now})
                      mentioned-users)
        mentions-txns (map (fn [mention]
                             [:xtdb.api/fn :gatz.db.mention/add {:mention mention}])
                           mentions)
        uid->mentions (zipmap (map :mention/to_uid mentions)
                              (map (fn [m] (crdt/gos #{m})) mentions))
        ;; TODO: get real connection id
        clock (crdt/new-hlc user-id now)
        ;; TODO: embed msg in discussion
        d (crdt.discussion/new-discussion
           {:did did :mid mid :uid user-id
            :originally-from originally-from
            :mentions uid->mentions
            :member-uids member-uids :group-id group_id
            :archived-uids archived-uids
            :location location}
           {:now now})

        post-fi-txns (db.feed/new-post-txn (db.feed/new-feed-item-id) now
                                           {:members member-uids
                                            :cid user-id
                                            :gid group_id
                                            :did did})
        member-mode
        (if group
          (let [group-mode (get-in group [:group/settings :discussion/member_mode])]
            (if (and to_all_contacts (= :discussion.member_mode/open group-mode))
              :discussion.member_mode/open
              :discussion.member_mode/closed))
          (if (and (not dm?) to_all_contacts)
            (if to_all_friends_of_friends
              :discussion.member_mode/friends_of_friends
              :discussion.member_mode/open)
            :discussion.member_mode/closed))

        open? (contains? schema/open-member-modes member-mode)
        public? (if group
                  (:group/is_public group)
                  false)

        d (cond-> d
            public? (assoc :discussion/public_mode :discussion.public_mode/public)
            open?   (assoc :discussion/member_mode member-mode
                           :discussion/open_until (db.discussion/open-until now)))
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :mentions mentions
              :text (or text "") :reply_to nil
              :media updated-medias
              :link_previews link-previews}
             {:now now :cid user-id :clock clock})
        original-msg-evt (when originally-from
                           (db.evt/new-evt
                            {:evt/type :message.crdt/delta
                             :evt/uid user-id
                             :evt/did (:did originally-from)
                             :evt/mid (:mid originally-from)
                             :evt/cid cid
                             :evt/data {:message.crdt/action :message.crdt/posted-as-discussion
                                        :message.crdt/delta {:message/posted_as_discussion did
                                                             :message/updated_at now
                                                             :crdt/clock clock}}}))
        txns (concat
              [(-> d
                   (db.discussion/crdt->doc)
                   (assoc :db/doc-type :gatz.doc/discussion :db/op :create))
               (-> msg
                   (db.message/crdt->doc)
                   (assoc :db/doc-type :gatz.doc/message :db/op :create))
               ;; TODO: update original discussion, not just message for it
               (when original-msg-evt
                 [:xtdb.api/fn :gatz.db.message/apply-delta {:evt original-msg-evt}])]
              mentions-txns
              fi-txns
              post-fi-txns
              updated-medias)]
    (biff/submit-tx ctx (vec (remove nil? txns)))
    {:discussion d :message msg :txns txns}))

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
  (when-let [discussion (some-> (db.discussion/by-id db did)
                                crdt.discussion/->value)]
    (let [messages (db.message/by-did db did)]
      {:discussion discussion
       :user_ids (:discussion/members discussion)
       :messages (mapv crdt.message/->value messages)})))

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

;; These functions assume you can use the CRDT values in the index
;; XTDB doesn't index nested maps, only top level attributes
;; So, makes sure that only what you want indexed is indexed at the top level
;; This is why we have :gatz.doc/discussion which has top level values
;; for the schema/discussion-indexed-fields and then :db/full-doc for the rest
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
;; Messages

(def create-message-params
  [:map
   [:text string?]
   [:id [:maybe uuid?]]
   [:reply_to [:maybe uuid?]]
   [:discussion_id [:maybe uuid?]]
   ;; deprecated
   [:media_id [:maybe uuid?]]
   [:media_ids [:vec uuid?]]
   [:link_previews [:vec uuid?]]])

(defn parse-create-message-params
  [{:keys [text id discussion_id media_id media_ids link_previews reply_to]}]
  (cond-> {}
    (string? text)          (assoc :text text)
    (string? id)            (assoc :mid (util/parse-uuid id))
    (string? reply_to)      (assoc :reply_to (util/parse-uuid reply_to))
    (string? discussion_id) (assoc :did (util/parse-uuid discussion_id))
    (empty? media_ids)      (assoc :media_ids [])
    (string? media_id)      (assoc :media_ids [(util/parse-uuid media_id)])
    (coll? media_ids)       (assoc :media_ids (vec (keep util/parse-uuid media_ids)))
    (empty? link_previews)  (assoc :link_previews [])
    (coll? link_previews)   (assoc :link_previews (vec (keep util/parse-uuid link_previews)))))

(defn create-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get connection id
   {:keys [text mid did media_ids reply_to link_previews now]}]

  {:pre [(string? text)
         (or (nil? mid) (uuid? mid))
         (or (nil? now) (inst? now))
         (uuid? did) (uuid? user-id)
         (or (nil? media_ids) (every? uuid? media_ids))
         (or (nil? reply_to) (uuid? reply_to))
         (or (nil? link_previews) (every? uuid? link_previews))]}

  (let [now (or now (Date.))
        mid (or mid (random-uuid))
        clock (crdt/new-hlc user-id now)

        user (some-> (db.user/by-id db user-id) crdt.user/->value)
        _ (assert user)

        d (some-> (db.discussion/by-id db did) crdt.discussion/->value)
        _ (assert d "Discussion not found")

        members (:discussion/members d)

        _ (assert (contains? members user-id) "User not in discussion")
        _ (when reply_to
            (let [reply-to (crdt.message/->value (db.message/by-id db reply_to))]
              (assert reply-to)
              (assert (= did (:message/did reply-to)))))

        mentioned-users (get-mentioned-users db user-id members text)
        fi-txns (->> mentioned-users
                     (mapcat (fn [u]
                               (db.feed/new-mention-txn
                                (db.feed/new-feed-item-id)
                                now
                                {:by_uid user-id
                                 :to_uid (:xt/id u)
                                 :did did
                                 :mid mid
                                 :gid (:discussion/group_id d)}))))

        ;; We continue to store mentions in the database
        ;; until the old clients are retired
        mentions (map (fn [u]
                        {:xt/id (crdt/rand-uuid)
                         :db/type :gatz/mention
                         :db/version 1
                         :mention/by_uid user-id
                         :mention/to_uid (:xt/id u)
                         :mention/did did
                         :mention/mid mid
                         :mention/ts now})
                      mentioned-users)
        mentions-txns (map (fn [mention]
                             [:xtdb.api/fn :gatz.db.mention/add {:mention mention}])
                           mentions)
        uid->mentions (zipmap (map :mention/to_uid mentions)
                              (map (fn [m] (crdt/gos #{m})) mentions))
        subscribe? (get-in user [:user/settings
                                 :settings/notifications
                                 :settings.notification/subscribe_on_comment]
                           false)
        updated-medias (when media_ids
                         (mapv (fn [media-id]
                                 (let [media (db.media/by-id db media-id)]
                                   (assert media)
                                   (-> media
                                       (assoc :media/message_id mid)
                                       (db.media/update-media))))
                               media_ids))
        link-previews (mapv (fn [lid]
                              (let [preview (link-preview/by-id db lid)]
                                (assert preview)
                                preview))
                            (or link_previews []))

        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text text
              :reply_to reply_to
              :mentions mentions
              :media updated-medias
              :link_previews link-previews}
             ;; TODO: get real connection id
             {:clock clock :now now})
        delta {:crdt/clock clock
               :discussion/updated_at now
               :discussion/latest_message (crdt/lww clock mid)
               :discussion/mentions uid->mentions
               :discussion/latest_activity_ts (crdt/max-wins now)
               :discussion/active_members user-id
               :discussion/seen_at {user-id (crdt/max-wins now)}}
        delta (cond-> delta
                subscribe? (assoc :discussion/subscribers {user-id (crdt/lww clock true)}))
        action {:discussion.crdt/action :discussion.crdt/append-message
                :discussion.crdt/delta  delta}
        evt (db.evt/new-evt {:evt/type :discussion.crdt/delta
                             :evt/uid user-id
                             :evt/did did
                             :evt/mid mid
                             :evt/cid cid
                             :evt/data action})
        txns (concat
              [(-> msg
                   (db.message/crdt->doc)
                   (assoc :db/doc-type :gatz.doc/message :db/op :create))
               [:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]]
              mentions-txns
              fi-txns
              (or updated-medias []))]
    (biff/submit-tx ctx (vec (remove nil? txns)))
    msg))


;; ======================================================================
;; User

(defn delete-user-txn [xtdb-ctx {:keys [uid now]}]
  {:pre [(uuid? uid) (inst? now)]}
  (let [db (xtdb/db xtdb-ctx)
        user-txn (db.user/mark-deleted-txn db {:uid uid :now now})
        contacts-txn (db.contacts/remove-all-user-contacts-txn db uid now)
        group-txns (db.group/remove-from-all-groups-txn db {:uid uid :now now})
        discussion-txns (db.discussion/remove-from-all-inactive-discussions-txn db {:uid uid :now now})]
    (vec (remove nil? (concat
                       user-txn
                       contacts-txn
                       group-txns
                       discussion-txns)))))

(def delete-user-expr
  '(fn delete-user-fn [xtdb-ctx args]
     (gatz.db/delete-user-txn xtdb-ctx args)))

(def tx-fns
  {:gatz.db/delete-user delete-user-expr})

(defn delete-user!

  ([ctx uid]
   (delete-user! ctx uid {:now (Date.)}))
  ([{:keys [auth/user-id] :as ctx} uid {:keys [now]}]
   {:pre [(uuid? uid) (= user-id uid)
          (or (nil? now) (inst? now))]}
  ;; TODO: check if user is admin of any groups
   (let [now (or now (Date.))]
     (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db/delete-user {:uid uid :now now}]]))))
