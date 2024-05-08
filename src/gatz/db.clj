(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.user :as crdt.user]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.evt :as db.evt]
            [gatz.db.media :as db.media]
            [gatz.db.message :as db.message]
            [gatz.db.user :as db.user]
            [malli.transform :as mt]
            [xtdb.api :as xtdb]))

;; ====================================================================== 
;; Utils

(defn valid-post? [s media-id]
  (and (string? s)
       (or (not (empty? s))
           (some? media-id))))

;; ====================================================================== 
;; Discussion 

(defn sort-feed [user-id discussions]
  (let [seen-discussions (group-by (partial db.discussion/seen-by-user? user-id) discussions)]
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
        now (java.util.Date.)
        did (random-uuid)
        mid (random-uuid)
        member-uids (set (keep mt/-string->uuid selected_users))
        ;; TODO: get real connection id
        clock (crdt/new-hlc user-id now)
        ;; TODO: embed msg in discussion
        d (crdt.discussion/new-discussion
           {:did did :mid mid :uid user-id
            :originally-from originally-from
            :member-uids member-uids}
           {:now now})
        media (some->> media_id
                       mt/-string->uuid
                       (db.media/by-id db))
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
        original-msg-evt (db.evt/new-evt
                          {:evt/type :message.crdt/delta
                           :evt/uid user-id
                           :evt/did (:did originally-from)
                           :evt/mid (:mid originally-from)
                           :evt/cid cid
                           :evt/data {:message.crdt/action :message.crdt/posted-as-discussion
                                      :message.crdt/delta {:message/posted_as_discussion did
                                                           :message/updated_at now
                                                           :crdt/clock clock}}})
        txns [(-> d
                  (db.discussion/crdt->doc)
                  (assoc :db/doc-type :gatz.doc/discussion))
              (assoc msg :db/doc-type :gatz.crdt/message)
              (assoc evt :db/doct-type :gatz/evt)
              ;; TODO: update original discussion, not just message for it
              [:xtdb.api/fn :gatz.db.message/apply-delta {:evt original-msg-evt}]
              (some-> media
                      (assoc :media/message_id mid)
                      (db.media/update-media)
                      (assoc :db/doct-type :gatz/media))]]
    (biff/submit-tx ctx (vec (remove nil? txns)))
    {:discussion d :message msg}))

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
;; Activity for notifications

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
        user (crdt.user/->value (db.user/by-id db user-id))
        _ (assert user)
        subscribe? (get-in user [:user/settings
                                 :settings/notifications
                                 :settings.notification/subscribe_on_comment]
                           false)
        media (when media_id
                (db.media/by-id db media_id))
        updated-media (some-> media
                              (assoc :media/message_id mid)
                              (db.media/update-media))
        ;; TODO: put directly in discussion
        clock (crdt/new-hlc user-id now)
        msg (crdt.message/new-message
             {:uid user-id :mid mid :did did
              :text text  :reply_to reply_to
              :media (when updated-media [updated-media])}
             ;; TODO: get real connection id
             {:clock clock :now now})
        delta {:crdt/clock clock
               :discussion/updated_at now
               :discussion/latest_message (crdt/lww clock mid)
               :discussion/latest_activity_ts (crdt/max-wins now)
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
        txns [(assoc msg :db/doc-type :gatz.crdt/message)
              updated-media
              [:xtdb.api/fn :gatz.db.discussion/apply-delta {:evt evt}]]]
    (biff/submit-tx ctx (vec (remove nil? txns)))
    msg))

