(ns gatz.api.feed
  (:require [crdt.core :as crdt]
            [clojure.set :as set]
            [gatz.http :as http]
            [gatz.crdt.user :as crdt.user]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.crdt.message :as crdt.message]
            [gatz.util :as util]
            [gatz.db.message :as db.message]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.feed :as db.feed]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.schema :as schema]
            [sdk.posthog :as posthog])
  (:import [java.util Date]))

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


(defmethod hydrate-item :feed.type/new_user_invited_by_friend
  [{:keys [biff/db auth/user-id] :as _ctx} item]
  (let [contact (-> (:feed/ref item)
                    (crdt.user/->value)
                    (db.contacts/->contact))
        cid (:xt/id contact)
        cid-contacts (db.contacts/by-uid db cid)
        uid-contacts (db.contacts/by-uid db user-id)
        contact-request (db.contacts/current-request-between db cid user-id)
        already-friends? (or (contains? (:contacts/ids cid-contacts) user-id)
                             (= :contact_request/accepted
                                (db.contacts/state-for contact-request user-id)))
        in-common {:user.in_common/contacts (-> (db.contacts/get-ids-in-common cid-contacts uid-contacts)
                                                (disj cid user-id))
                   :user.in_common/groups (db.group/ids-with-members-in-common db user-id cid)}]
    (when-not already-friends?
      (assoc item :feed/ref (assoc contact
                                   :user/contact_request (:xt/id contact-request)
                                   :user/invited_by (:feed/contact item)
                                   :user/in_common in-common)))))

(defmethod collect-group-ids :feed.type/new_user_invited_by_friend
  [hydrated-item]
  (let [user (:feed/ref hydrated-item)]
    (get-in user [:user/in_common :user.in_common/groups])))

(defmethod collect-contact-ids :feed.type/new_user_invited_by_friend
  [hydrated-item]
  (let [user (:feed/ref hydrated-item)]
    (cond-> (-> user
                (get-in [:user/in_common :user.in_common/contacts])
                (conj (:xt/id user)))
      (:user/invited_by user)
      (conj (:user/invited_by user)))))


(defn hydrate-discussion
  [{:keys [biff/db auth/user-id auth/user] :as _ctx} item]
  (let [blocked-uids (:user/blocked_uids (crdt.user/->value user))
        did (:xt/id (:feed/ref item))
        d (-> (db.discussion/by-id db did)
              (crdt.discussion/->value))]
    (when-not (contains? blocked-uids (:discussion/created_by d))
      ;; TODO: this shouldn't be two loads
      (let [messages (map crdt.message/->value (db.message/by-did db did))]
        (assoc item :feed/ref (-> d
                                  (db.discussion/->external user-id)
                                  (assoc :discussion/messages messages)))))))

(defmethod hydrate-item :feed.type/mentioned_in_discussion
  [ctx item]
  (hydrate-discussion ctx item))

(defmethod hydrate-item :feed.type/new_post
  [ctx item]
  (hydrate-discussion ctx item))

(defn collect-discussion-group-ids [hydrated-item]
  (if-let [gid (:discussion/group_id (:feed/ref hydrated-item))]
    #{gid}
    #{}))

(defn collect-discussion-contact-ids [hydrated-item]
  (let [d (:feed/ref hydrated-item)]
    (conj (:discussion/members d)
          (:discussion/created_by d))))

(defmethod collect-group-ids :feed.type/mentioned_in_discussion
  [hydrated-item]
  (collect-discussion-group-ids hydrated-item))

(defmethod collect-contact-ids :feed.type/mentioned_in_discussion
  [hydrated-item]
  (collect-discussion-contact-ids hydrated-item))

(defmethod collect-group-ids :feed.type/new_post
  [hydrated-item]
  (collect-discussion-group-ids hydrated-item))

(defmethod collect-contact-ids :feed.type/new_post
  [hydrated-item]
  (collect-discussion-contact-ids hydrated-item))

;; ================================
;; API

(def feed-query-params
  [:map
   [:group_id {:optional true} crdt/ulid?]
   [:contact_id {:optional true} uuid?]
   [:last_id {:optional true} uuid?]])

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
    (some? (:last_id params))    (update :last_id util/parse-uuid)))

(defn feed
  [{:keys [params biff/db auth/user auth/user-id] :as ctx}]

  (posthog/capture! ctx "discussion.feed")

  (let [params (parse-feed-params params)

        older-than (some->> (:last_id params)
                            (db.feed/by-id db)
                            :feed/created_at)

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

        items (db.feed/for-user-with-ts db user-id feed-query)

        shown-entities (atom {:gatz/discussions #{}
                              :gatz/contacts #{}
                              :gatz/contact_requests #{}})
        items (reduce (fn [acc {:keys [feed/ref_type feed/ref] :as item}]
                        (if (= :gatz/discussion ref_type)
                          (let [dids (:gatz/discussions @shown-entities)
                                did (:xt/id ref)]
                            (if (contains? dids did)
                              acc
                              (do
                                (swap! shown-entities update :gatz/discussions conj did)
                                (conj acc item))))
                          (conj acc item)))
                      []
                      items)
        items (keep (partial hydrate-item ctx) items)

        fi-group-ids (reduce set/union (map collect-group-ids items))
        group-ids (cond-> fi-group-ids
                    (some? group_id) (conj group_id))
        groups (map (partial db.group/by-id db) group-ids)

        fi-user-ids (reduce set/union (map collect-contact-ids items))
        user-ids (cond-> fi-user-ids
                   (some? contact_id) (conj contact_id))
        users (->> user-ids
                   (map (partial db.user/by-id db))
                   (map (comp db.contacts/->contact crdt.user/->value)))]
    (http/json-response {:users users :groups groups :items items})))


(def dismiss-params
  [:map
   [:id uuid?]])

(defn parse-dismiss-params [params]
  (cond-> params
    (some? (:id params)) (update :id util/parse-uuid)))

(defn dismiss! [{:keys [auth/user-id params] :as ctx}]
  (let [{:keys [id]} (parse-dismiss-params params)]
    (if id
      (let [{:keys [item]} (db.feed/dismiss! ctx user-id id)]
        (http/json-response {:item item}))
      (http/err-resp "invalid_params" "Invalid parameters"))))

(defn mark-many-seen! [{:keys [auth/user-id params] :as ctx}]
  {:pre [(uuid? user-id)]}
  (let [ids (set (keep util/parse-uuid (:ids params)))]
    (posthog/capture! ctx "feed_items.mark_seen")
    (db.feed/mark-many-seen! ctx user-id ids (Date.))
    (http/json-response {:status "ok"})))

