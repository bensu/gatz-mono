(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.set :as set]
            [clojure.string :as str]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.group :as db.group]
            [gatz.db.media :as db.media]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]
            [clojure.tools.logging :as log])
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
   [:group_id {:optional true} schema/ulid?]
   [:selected_users {:optional true} [:vec uuid?]]
   [:to_all_contacts {:optional true} boolean?]
   [:originally_from {:optional true} [:map
                                       [:did uuid?]
                                       [:mid uuid?]]]])

(defn parse-originally-from [{:keys [did mid]}]
  (cond-> {}
    (some? did) (assoc :did (mt/-string->uuid did))
    (some? mid) (assoc :mid (mt/-string->uuid mid))))

(defn parse-create-params
  [{:keys [name group_id text to_all_contacts
           media_id media_ids
           originally_from selected_users]}]
  {:pre [(or (nil? name)
             (and (string? name) (not (empty? name)))
             (or (old-valid-post? text media_id)
                 (valid-post? text media_ids)))
         (or (boolean? to_all_contacts)
             (some? selected_users))]}
  (cond-> {}
    (string? name)   (assoc :name (str/trim name))
    (string? text)   (assoc :text (str/trim text))
    (some? group_id) (assoc :group_id (crdt/parse-ulid group_id))
    (some? media_id) (assoc :media_ids (when-let [media-id (mt/-string->uuid media_id)]
                                         [media-id]))
    (coll? media_ids)          (assoc :media_ids (vec (keep mt/-string->uuid media_ids)))
    (some? originally_from)    (assoc :originally_from (parse-originally-from originally_from))
    (some? selected_users)     (assoc :selected_users (set (keep mt/-string->uuid selected_users)))
    (boolean? to_all_contacts) (assoc :to_all_contacts to_all_contacts)))

(defn create-discussion-with-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get the real connection id
   {:keys [did now] :as init-params}]

  {:pre [(or (nil? did) (uuid? did))
         (or (nil? now) (inst? now))]}

  (let [{:keys [selected_users group_id to_all_contacts
                text media_ids originally_from]}
        (parse-create-params init-params)

        now (or now (Date.))
        did (or did (random-uuid))
        mid (random-uuid)

        originally-from (when originally_from originally_from)

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
            (assert (contains? group-members user-id)
                    "Not authorized to post to this group")

            (if selected_users
              ;; The post is directed to a subset of the group
              (do
                (assert (set/subset? selected_users group-members))
                [selected_users (set/intersection archiver-uids selected_users)])
              ;; The post is directed to the entire group
              (do
                (assert to_all_contacts)
                [group-members archiver-uids])))

          ;; The post is directed to a set of users
          (let [contacts (db.contacts/by-uid db user-id)]
            (if selected_users
              (let [member-uids (disj selected_users user-id)]
                (assert (set/subset? member-uids (:contacts/ids contacts)))
                [member-uids #{}])
              (do
                (assert to_all_contacts)
                [(:contacts/ids contacts) #{}]))))

        _ (assert (and (set? member-uids) (every? uuid? member-uids)))

        ;; TODO: get real connection id
        clock (crdt/new-hlc user-id now)
        ;; TODO: embed msg in discussion
        d (crdt.discussion/new-discussion
           {:did did :mid mid :uid user-id
            :originally-from originally-from
            :member-uids member-uids :group-id group_id
            :archived-uids archived-uids}
           {:now now})
        open? (if group
                (and to_all_contacts
                     (= :discussion.member_mode/open
                        (get-in group [:group/settings :discussion/member_mode])))
                to_all_contacts)
        public? (if group
                  (:group/is_public group)
                  false)
        d (cond-> d
            public? (assoc :discussion/public_mode :discussion.public_mode/public)
            open?   (assoc :discussion/member_mode :discussion.member_mode/open
                           :discussion/open_until (db.discussion/open-until now)))
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text (or text "") :reply_to nil
              :media updated-medias}
             {:now now :cid user-id :clock clock})
        evt-data {:discussion.crdt/action :discussion.crdt/new
                  :discussion.crdt/delta (assoc d :discussion/messages {mid msg})}
        evt (db.evt/new-evt {:evt/type :discussion.crdt/delta
                             :evt/uid user-id
                             :evt/did did
                             :evt/mid mid
                             :evt/cid cid
                             :evt/data evt-data})
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
               (assoc msg :db/doc-type :gatz.crdt/message :db/op :create)
               (assoc evt :db/doct-type :gatz/evt :db/op :create)
               ;; TODO: update original discussion, not just message for it
               (when original-msg-evt
                 [:xtdb.api/fn :gatz.db.message/apply-delta {:evt original-msg-evt}])]
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
  ;; TODO: change shape
  (let [discussion (db.discussion/by-id db did)
        messages (db.message/by-did db did)]
    (assert discussion)
    {:discussion (crdt.discussion/->value discussion)
     :user_ids (crdt/-value (:discussion/members discussion))
     :messages (mapv crdt.message/->value messages)}))

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

#_(defn ->uuid [s]
    (if (string? s)
      (try
        (java.util.UUID/fromString s)
        (catch Exception _ nil))))

(defn create-message!

  [{:keys [auth/user-id auth/cid biff/db] :as ctx} ;; TODO: get connection id
   {:keys [text mid did media_ids reply_to now]}]

  {:pre [(string? text)
         (or (nil? mid) (uuid? mid))
         (or (nil? now) (inst? now))
         (uuid? did) (uuid? user-id)
         (or (nil? media_ids) (every? uuid? media_ids))
         (or (nil? reply_to) (uuid? reply_to))]}

  (let [now (or now (Date.))
        mid (or mid (random-uuid))

        user (crdt.user/->value (db.user/by-id db user-id))
        _ (assert user)

        d (crdt.discussion/->value (db.discussion/by-id db did))
        members (:discussion/members d)

        possible-mentions (db.message/extract-mentions text)
        mentions (if-not (empty? possible-mentions)
                   (->> possible-mentions
                        set
                        (keep (partial db.user/by-name db))
                        (filter (fn [{:keys [xt/id]}]
                                  (and (not= user-id id)
                                       (contains? members id))))
                        (mapv (fn [u]
                                {:xt/id (crdt/random-ulid)
                                 :db/type :gatz/mention
                                 :db/version 1
                                 :mention/by_uid user-id
                                 :mention/to_uid (:xt/id u)
                                 :mention/did did
                                 :mention/mid mid
                                 :mention/ts now})))
                   [])
        uid->mentions (zipmap (map :mention/to_uid mentions)
                              (map (fn [m] (crdt/gos #{m})) mentions))
        mentions-txns (map (fn [m]
                             [:xtdb.api/fn :gatz.db.mention/add {:mention m}])
                           mentions)

        _ (log/info "new mentions" mentions)

        subscribe? (get-in user [:user/settings
                                 :settings/notifications
                                 :settings.notification/subscribe_on_comment]
                           false)
        updated-medias (when media_ids
                         (mapv (fn [media-id]
                                 (some-> (db.media/by-id db media-id)
                                         (assoc :media/message_id mid)
                                         (db.media/update-media)))
                               media_ids))
        ;; TODO: put directly in discussion
        clock (crdt/new-hlc user-id now)
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text text
              :reply_to reply_to
              :media updated-medias}
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
              [(assoc msg :db/doc-type :gatz.crdt/message :db/op :create)
               [:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]]
              mentions-txns
              (or updated-medias []))]
    (biff/submit-tx (assoc ctx :biff.xtdb/retry false)
                    (vec (remove nil? txns)))
    msg))
