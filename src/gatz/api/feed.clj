(ns gatz.api.feed
  (:require [crdt.core :as crdt]
            [clojure.set :as set]
            [gatz.http :as http]
            [gatz.crdt.user :as crdt.user]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.util :as util]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.feed :as db.feed]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [sdk.posthog :as posthog]
            [xtdb.api :as xt]))

;; ================================
;; Enrich feed items

;; Each feed item might need more data from the database
;; that what we get from the db.feed/for-user-with-ts query

(defmulti hydrate-item (fn [_ctx item]
                         (:feed/feed_type item)))

(defmethod hydrate-item :default [_ctx item] item)

(defmulti collect-group-ids :feed/feed_type)

(defmethod collect-group-ids :default [_item] #{})

(defmulti collect-contact-ids :feed/feed_type)

(defmethod collect-contact-ids :default [_item] #{})


(def show-contact-request-item?
  #{:contact_request/response_pending_from_viewer
    :contact_request/accepted})

(defmethod hydrate-item :feed.type/new_request
  [{:keys [biff/db auth/user-id] :as _ctx} item]
  (let [cr (:feed/ref item)
        state-for (db.contacts/state-for cr user-id)]
    (when (show-contact-request-item? state-for)
      (let [from (:contact_request/from cr)
            in-common {:contact_request.in_common/contacts (db.contacts/get-in-common db user-id from)
                       :contact_request.in_common/groups (db.group/ids-with-members-in-common db user-id from)}
            new-ref (-> cr
                        (assoc :contact_request/state state-for)
                        (assoc :contact_request/in_common in-common))]
        (assoc item :feed/ref new-ref)))))

(defmethod collect-group-ids :feed.type/new_request
  [hydrated-item]
  (let [cr (:feed/ref hydrated-item)]
    (get-in cr [:contact_request/in_common :contact_request.in_common/groups])))

(defmethod collect-contact-ids :feed.type/new_request
  [hydrated-item]
  (let [cr (:feed/ref hydrated-item)]
    (-> cr
        (get-in [:contact_request/in_common :contact_request.in_common/contacts])
        (conj (:contact_request/from cr)))))

(defmethod hydrate-item :feed.type/new_friend
  [{:keys [biff/db auth/user-id] :as _ctx} item]
  (let [contact (:feed/ref item)
        cid (:xt/id contact)
        in-common {:contact.in_common/contacts (db.contacts/get-in-common db user-id cid)
                   :contact.in_common/groups (db.group/ids-with-members-in-common db user-id cid)}]
    (assoc item :feed/ref (-> contact
                              (crdt.user/->value)
                              (db.contacts/->contact)
                              (assoc :contact/in_common in-common)))))

(defmethod collect-group-ids :feed.type/new_friend
  [hydrated-item]
  (let [contact (:feed/ref hydrated-item)]
    (get-in contact [:contact/in_common :contact.in_common/groups])))

(defmethod collect-contact-ids :feed.type/new_friend
  [hydrated-item]
  (let [contact (:feed/ref hydrated-item)]
    (-> contact
        (get-in [:contact/in_common :contact.in_common/contacts])
        (conj (:xt/id contact)))))

(defmethod hydrate-item :feed.type/added_to_group
  [{:keys [biff/db auth/user-id] :as _ctx} item]
  (let [group (:feed/ref item)
        friends (:contacts/ids (db.contacts/by-uid db user-id))
        members (:group/members group)
        in-common (set/intersection friends members)]
    (assoc item :feed/ref (-> group
                              (assoc :group/added_by (:feed/contact item))
                              (assoc :group/in_common {:group.in_common/contacts in-common})))))

(defmethod collect-group-ids :feed.type/added_to_group
  [hydrated-item]
  #{(:xt/id (:feed/ref hydrated-item))})

(defmethod collect-contact-ids :feed.type/added_to_group
  [hydrated-item]
  (let [group (:feed/ref hydrated-item)]
    (-> group
        (get-in [:group/in_common :group.in_common/contacts])
        (conj (:group/added_by group)))))

;; ================================
;; API

(def feed-query-params
  [:map
   [:group_id {:optional true} crdt/ulid?]
   [:contact_id {:optional true} uuid?]
   [:last_did {:optional true} uuid?]])

(def feed-response
  [:map
   [:discussion [:vec schema/Discussion]]
   [:users [:vec schema/Contact]]
   [:groups [:vec schema/Group]]
   [:contact_requests [:vec [:contact_request schema/ContactRequest
                             :contact schema/Contact
                             :in_common [:contacts [:vec schema/Contact]
                                         :groups [:vec schema/Group]]]]]])

(defn parse-feed-params [params]
  (cond-> params
    (some? (:contact_id params)) (update :contact_id util/parse-uuid)
    (some? (:group_id params))   (update :group_id crdt/parse-ulid)
    (some? (:last_did params))   (update :last_did util/parse-uuid)))

(defn feed
  [{:keys [params biff.xtdb/node biff/db auth/user auth/user-id] :as ctx}]

  (posthog/capture! ctx "discussion.feed")

  ;; TODO: return early depending on latest-tx
  ;; TODO: should be using the latest-tx from the _db_ not the node
  (let [params (parse-feed-params params)
        latest-tx (xt/latest-completed-tx node)

        older-than (some->> (:last_did params)
                            (db.discussion/by-id db)
                            :discussion/created_at)

        ;; Is this a contact's feed?
        contact (some->> (:contact_id params) (db.user/by-id db))
        contact_id (some->> contact :xt/id)
        _ (when contact
            (assert (not (db.user/mutually-blocked? user contact))))

        ;; Is this a group feed?
        group (some->> (:group_id params) (db.group/by-id db))
        group_id (:xt/id group)
        feed-query {:older-than-ts older-than
                    :contact_id contact_id
                    :group_id group_id}
        dids-ts (db.discussion/posts-for-user-with-ts db user-id feed-query)
        mentioned-dids-ts (db.discussion/mentions-for-user-with-ts db user-id feed-query)

        dids (->> (concat dids-ts mentioned-dids-ts)
                  (sort-by (fn [[_ tsa]] tsa))
                  (reverse)
                  (map first)
                  (distinct)
                  (take 20))

        blocked-uids (:user/blocked_uids (crdt.user/->value user))
        poster-blocked? (fn [{:keys [discussion]}]
                          (contains? blocked-uids (:discussion/created_by discussion)))

        ds (->> (set/union (set dids) (set dids))
                (map (partial db/discussion-by-id db))
                (remove poster-blocked?))

        ;; What are the groups and users in those discussions?
        d-group-ids (set (keep (comp :discussion/group_id :discussion) ds))
        d-user-ids  (reduce set/union (map :user_ids ds))

        earliest-ts (->> ds
                         (map (comp :discussion/created_at :discussion))
                         (sort-by #(.getTime %))
                         (first))

        ;; TODO: only fetch the ones that are in a similar time range as the discussions
        items (db.feed/for-user-with-ts db user-id {:older-than-ts older-than
                                                    :younger-than-ts earliest-ts
                                                    :contact_id contact_id
                                                    :group_id group_id})
        items (keep (partial hydrate-item ctx) items)

        fi-group-ids (reduce set/union (map collect-group-ids items))
        groups (cond-> (map (partial db.group/by-id db)
                            (set/union d-group-ids fi-group-ids))
                 group (conj group))

        fi-user-ids (reduce set/union (map collect-contact-ids items))
        users (->> (set/union d-user-ids fi-user-ids)
                   (map (partial db.user/by-id db))
                   (map (comp db.contacts/->contact crdt.user/->value)))
        drs (->> ds
                 (sort-by (comp :discussion/created_at :discussion))
                 (map (fn [dr]
                        (update dr :discussion #(-> %
                                                    (crdt.discussion/->value)
                                                    (db.discussion/->external user-id))))))]
    (http/json-response
     {:discussions drs
      :users users
      :groups groups
      :items items
      :current false
      :latest_tx {:id (::xt/tx-id latest-tx)
                  :ts (::xt/tx-time latest-tx)}})))
