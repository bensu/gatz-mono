(ns gatz.db.contacts
  (:require [clojure.set :as set]
            [com.biffweb :as biff :refer [q]]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.feed :as db.feed]
            [gatz.schema :as schema]
            [gatz.db.util :as db.util]
            [crdt.ulid :as ulid]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

;; ======================================================================
;; Migrations

(defn v1->v2 [data]
  (-> data
      (assoc :db/version 2)
      (update :contacts/hidden_by_me #(or % #{}))
      (update :contacts/hidden_me #(or % #{}))))

(def all-migrations
  [{:from 0 :to 1 :transform identity}
   {:from 1 :to 2 :transform v1->v2}])

;; ======================================================================
;; Contacts

(defn ->contact [u] (select-keys u schema/contact-ks))

(defn new-contacts [{:keys [id uid contact-ids now]}]
  {:pre [(or (nil? id) (uuid? id))
         (or (nil? now) (inst? now))
         (uuid? uid) (every? uuid? contact-ids) (set? contact-ids)]}
  (let [now (or now (Date.))]
    {:xt/id (or id (random-uuid))
     :db/type :gatz/contacts
     :db/version 2
     :contacts/created_at now
     :contacts/updated_at now
     :contacts/hidden_by_me #{}
     :contacts/hidden_me #{}
     :contacts/user_id uid
     :contacts/ids contact-ids}))

;; These are only created in gatz.db.user/create-user!
;; and they are unique by :contacts/user_id
(defn by-uid [db uid]
  {:pre [(uuid? uid)]}
  (let [entity (first
                (q db '{:find (pull c [*])
                        :in [uid]
                        :where [[c :db/type :gatz/contacts]
                                [c :contacts/user_id uid]]}
                   uid))]
    (some-> entity (db.util/->latest-version all-migrations))))

(defn friends-of-friends [db uid]
  {:pre [(uuid? uid)]
   :post [(set? %) (every? uuid? %)]}
  (->> (q db '{:find [?friend-id ?fof-id]
               :in [uid]
               :where [[c :db/type :gatz/contacts]
                       [c :contacts/user_id uid]
                       [c :contacts/ids ?friend-id]
                       [f :contacts/user_id ?friend-id]
                       [f :contacts/ids ?fof-id]]}
          uid)
       (mapcat identity)
       set))

(defn in-common
  [a-contacts b-contacts]
  {:post [(set? %) (every? uuid? %)]}
  (set/intersection (:contacts/ids a-contacts)
                    (:contacts/ids b-contacts)))

(defn get-ids-in-common [a-contacts b-contacts]
  (assert (and a-contacts b-contacts))
  (in-common a-contacts b-contacts))

(defn get-in-common
  "Finds the common contacts between two users. Returns [:set uuid?]"
  [db a-uid b-uid]
  {:pre [(uuid? a-uid) (uuid? b-uid)]}
  (let [a-contacts (by-uid db a-uid)
        b-contacts (by-uid db b-uid)]
    (-> (get-ids-in-common a-contacts b-contacts)
        (disj a-uid b-uid))))

;; We can only do two things to Contacts, we can add or remove them

(defn add-contacts-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now]} args
        _     (assert (uuid? from))
        _     (assert (uuid? to))
        _     (assert (inst? now))
        from-contacts (by-uid db from)
        to-contacts   (by-uid db to)]
    (assert (and from-contacts to-contacts))
    [[:xtdb.api/put (-> from-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids conj to)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/put (-> to-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids conj from)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/fn :gatz.db.contacts/accept-pending-requests-between {:aid from :bid to :now now}]]))

(def add-contacts-expr
  '(fn add-contacts-fn [ctx args]
     (gatz.db.contacts/add-contacts-txn ctx args)))

(defn remove-contacts-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now]} args
        from-contacts (by-uid db from)
        to-contacts   (by-uid db to)]
    (assert (inst? now))
    (assert (and from-contacts to-contacts))
    (when (or (contains? (:contacts/ids from-contacts) to)
              (contains? (:contacts/ids to-contacts) from))
      [[:xtdb.api/put (-> from-contacts
                          (assoc :contacts/updated_at now)
                          (update :contacts/ids disj to)
                          (assoc :db/doc-type :gatz/contacts))]
       [:xtdb.api/put (-> to-contacts
                          (assoc :contacts/updated_at now)
                          (update :contacts/ids disj from)
                          (assoc :db/doc-type :gatz/contacts))]])))

(def remove-contacts-expr
  '(fn remove-contacts-fn [ctx args]
     (gatz.db.contacts/remove-contacts-txn ctx args)))

(defn remove-all-user-contacts-txn
  "Helper for migrations"
  [db uid now]
  {:pre [(uuid? uid) (inst? now)]}
  (let [all-cids (:contacts/ids (by-uid db uid))]
    (map (fn [cid]
           (let [args {:from cid :to uid :now now}]
             [:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args args}]))
         all-cids)))

;; ======================================================================
;; Muting

(defn hide-contact-txn [xtdb-ctx {:keys [hidden-by hidden now]}]
  (let [db (xtdb.api/db xtdb-ctx)
        hidden-by-contacts (by-uid db hidden-by)
        contacts-of-hidden (by-uid db hidden)]
    (assert (not= hidden-by hidden))
    (assert (and hidden-by-contacts contacts-of-hidden))
    [[:xtdb.api/put (-> contacts-of-hidden
                        (assoc :contacts/updated_at now)
                        (update :contacts/hidden_me conj hidden-by)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/put (-> hidden-by-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/hidden_by_me conj hidden)
                        (assoc :db/doc-type :gatz/contacts))]]))

(def hide-contact-expr
  '(fn hide-contact-fn [ctx args]
     (gatz.db.contacts/hide-contact-txn ctx args)))

(defn hide! [{:keys [auth/user-id] :as ctx} {:keys [hidden-by hidden]}]
  {:pre [(uuid? user-id) (uuid? hidden-by) (uuid? hidden)]}
  (let [args {:hidden-by hidden-by :hidden hidden :now (Date.)}]
    (assert (= user-id hidden-by))
    (assert (not= user-id hidden))
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/hide-contact args]])))

(defn unhide-contact-txn [xtdb-ctx {:keys [hidden-by hidden now]}]
  (let [db (xtdb/db xtdb-ctx)
        hidden-by-contacts (by-uid db hidden-by)
        contacts-of-hidden (by-uid db hidden)]
    (assert (not= hidden-by hidden))
    (assert (and hidden-by-contacts contacts-of-hidden))
    [[:xtdb.api/put (-> contacts-of-hidden
                        (assoc :contacts/updated_at now)
                        (update :contacts/hidden_me disj hidden-by)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/put (-> hidden-by-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/hidden_by_me disj hidden)
                        (assoc :db/doc-type :gatz/contacts))]]))

(def unhide-contact-expr
  '(fn unhide-contact-fn [ctx args]
     (gatz.db.contacts/unhide-contact-txn ctx args)))

(defn unhide! [{:keys [auth/user-id] :as ctx} {:keys [hidden-by hidden]}]
  {:pre [(uuid? user-id) (uuid? hidden-by) (uuid? hidden)]}
  (let [args {:hidden-by hidden-by :hidden hidden :now (Date.)}]
    (assert (= user-id hidden-by))
    (assert (not= user-id hidden))
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/unhide-contact args]])))

;; ======================================================================
;; Contact Requests

;; Tracks how two users want to be contacts
;; in a state machine with the following transitions:

;; 1. :contact_request/request
;; new -> :contact_request/requested

(defn new-contact-request [{:keys [id from to now]}]
  {:xt/id id
   :db/type :gatz/contact_request
   :db/version 1
   :contact_request/from from
   :contact_request/to to
   :contact_request/created_at now
   :contact_request/updated_at now
   :contact_request/state :contact_request/requested
   :contact_request/log []})

;; 2a. :contact_request/accept
;; :contact_request/requested -> :contact_request/accepted
;; 2b. :contact_request/ignore
;; :contact_request/requested -> :contact_request/ignored

;; 3. :contact_request/remove
;; :contact_request/requested -> :contact_request/removed

(def contact-request-states
  #{:contact_request/requested
    :contact_request/accepted
    :contact_request/ignored
    :contact_request/removed})

(def final-states
  #{:contact_request/accepted :contact_request/removed :contact_request/ignored})

(defn can-transition? [contact-request {:keys [by state]}]
  {:pre [(some? contact-request)
         (uuid? by)
         (contains? contact-request-states state)]
   :post [(boolean? %)]}
  (let [from-actor? (= by (:contact_request/from contact-request))
        current-state (:contact_request/state contact-request)]
    (if (contains? final-states current-state)
      false
      (case current-state
        :contact_request/requested (if from-actor?
                                     false
                                     (contains? final-states state))
        false))))

(defn transition-to [contact-request {:keys [by now state] :as action}]
  {:pre [(uuid? by) (inst? now)]}
  (let [from-state (:contact_request/state contact-request)]
    (assert (can-transition? contact-request action))
    (-> contact-request
        (assoc :contact_request/updated_at now)
        (assoc :contact_request/state state)
        (update :contact_request/log conj {:contact_request/decided_at now
                                           :contact_request/by_user by
                                           :contact_request/from_state from-state
                                           :contact_request/to_state state}))))

;; When that request is done, we can start from scratch with a different contact request

;; And corresponding states for the requester and the receiver

;; :contact_request/requested
;; requester: :contact_request/viewer_awaits_response
;; receiver:  :contact_request/response_pending_from_viewer

;; contact_request/accepted
;; requester: :contact_request/accepted
;; receiver:  :contact_request/accepted

;; contact_request/ignored
;; requester: :contact_request/viewer_awaits_response
;; receiver:  :contact_request/viewer_ignored_response

;; contact_request/removed
;; requester: :contact_request/none
;; receiver:  :contact_request/none

;; How to keep only one in the database for the latest state?
;; It can't really be done without a special index

(defn state-for [contact-request viewer-id]
  {:pre [(uuid? viewer-id)]}
  (if (nil? contact-request)
    :contact_request/none
    (let [{:contact_request/keys [from state]} contact-request
          from-viewer? (= viewer-id from)]
      (case state
        :contact_request/requested (if from-viewer?
                                     :contact_request/viewer_awaits_response
                                     :contact_request/response_pending_from_viewer)
        :contact_request/accepted :contact_request/accepted
        :contact_request/ignored :contact_request/none
        :contact_request/removed  :contact_request/none))))

(defn- entity->cr
  "Dummy in case we need migrations later"
  [entity]
  entity)

(defn pending-requests-to [db to]
  {:pre [(uuid? to)]}
  (let [entities (q db '{:find (pull cr [*])
                         :in [to]
                         :where [[cr :db/type :gatz/contact_request]
                                 [cr :contact_request/to to]
                                 [cr :contact_request/state :contact_request/requested]]}
                    to)]
    (->> entities
         (keep entity->cr)
         vec)))

(defn visible-requests-to [db to]
  {:pre [(uuid? to)]}
  (let [entities (q db '{:find (pull cr [*])
                         :in [to]
                         :where [[cr :db/type :gatz/contact_request]
                                 [cr :contact_request/to to]
                                 [cr :contact_request/state state]
                                 [(contains? #{:contact_request/requested :contact_request/accepted} state)]]}
                    to)]
    (->> entities
         (keep entity->cr)
         vec)))

(defn requests-from-to [db from to]
  {:pre [(uuid? from) (uuid? to)]}
  (let [entities (q db '{:find (pull cr [*])
                         :in [to from]
                         :where [[cr :db/type :gatz/contact_request]
                                 [cr :contact_request/to to]
                                 [cr :contact_request/from from]]}
                    to from)]
    (->> entities
         (keep entity->cr)
         vec)))

(defn current? [cr]
  (not (contains? final-states (:contact_request/state cr))))

(defn current-request-from-to [db from to]
  (let [rqs (->> (requests-from-to db from to)
                 (filter current?))]
    (assert (or (empty? rqs) (= 1 (count rqs))))
    (first rqs)))

(defn current-request-between [db aid bid]
  {:pre [(uuid? aid) (uuid? bid)]}
  (let [rqs (->> (concat
                  (requests-from-to db aid bid)
                  (requests-from-to db bid aid))
                 (filter current?))]
    (assert (or (empty? rqs) (= 1 (count rqs))))
    (first rqs)))

(defn new-contact-request-txn [ctx {:keys [args]}]
  (let [db (xtdb.api/db ctx)
        {:keys [from to id now feed_item_id]} args
        contact-request (new-contact-request args)
        current-requests (->> (concat
                               (requests-from-to db from to)
                               (requests-from-to db to from))
                              (filter current?))]

    (assert (empty? current-requests))
    ;; Here we could be smarter and:
    ;; - If the requester has a pending request for them,
    ;;   then it means both sides want to be contacts
    (concat
     [[:xtdb.api/put (-> contact-request
                         (assoc :db/doc-type :gatz/contact_request))]]
     (when feed_item_id
       (db.feed/new-cr-item-txn feed_item_id contact-request)))))

(def new-contact-request-expr
  '(fn new-contact-request-fn [ctx args]
     (gatz.db.contacts/new-contact-request-txn ctx args)))

(defn new-user-item-txn [xtdb-ctx {:keys [feed_item_id now uid invited_by_uid]}]
  {:pre [(uuid? feed_item_id) (uuid? uid) (uuid? invited_by_uid)]}
  (let [db (xtdb/db xtdb-ctx)
        contact-ids (:contacts/ids (by-uid db invited_by_uid))
        members (-> contact-ids
                    (disj invited_by_uid)
                    (disj uid))]
    (db.feed/new-user-item-txn feed_item_id now
                               {:members members
                                :uid uid
                                :invited_by_uid invited_by_uid})))

(def new-user-item-expr
  '(fn new-user-item-fn [xtdb-ctx args]
     (gatz.db.contacts/new-user-item-txn xtdb-ctx args)))

(defn transition-to-txn [ctx {:keys [args]}]
  (let [db (xtdb.api/db ctx)
        {:keys [by to from state now feed_item_id]} args]
    (assert (uuid? by))
    (assert (uuid? to))
    (assert (uuid? from))
    (assert (inst? now))
    (assert (some? state))
    (assert (or (nil? feed_item_id) (uuid? feed_item_id)))
    (if-let [current-request (if (= :contact_request/removed state)
                               ;; removed doesn't care who is who
                               (current-request-between db from to)
                               (let [reqs (->> (requests-from-to db from to)
                                               (filter current?))]
                                 (assert (= 1 (count reqs)))
                                 (first reqs)))]
      (when-not (= state (:contact_request/state current-request))
        (assert (can-transition? current-request {:by by :state state}))
        (let [new-contact-request (-> current-request
                                      (transition-to {:by by :state state :now now})
                                      (assoc :db/doc-type :gatz/contact_request))]
          (cond
            (= state :contact_request/accepted)
            (concat
             [[:xtdb.api/put new-contact-request]
              [:xtdb.api/fn :gatz.db.contacts/add-contacts {:args {:from from :to to :now now}}]]
             (when feed_item_id
               (db.feed/accepted-cr-item-txn feed_item_id now new-contact-request)))

            (= state :contact_request/removed)
            [[:xtdb.api/put new-contact-request]
             [:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args {:from from :to to :now now}}]]

            :else [[:xtdb.api/put new-contact-request]])))
      (if (= :contact_request/removed state)
        [[:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args {:from from :to to :now now}}]]
        (assert false "Can't move to other states without a live contact_request")))))

(def transition-to-expr
  '(fn transition-to-fn [ctx args]
     (gatz.db.contacts/transition-to-txn ctx args)))

(defn accept-pending-requests-between-txn [xtdb-ctx {:keys [aid bid now]}]
  {:pre [(inst? now) (uuid? aid) (uuid? bid)]}
  (let [db (xtdb.api/db xtdb-ctx)
        current-reqs (->> (concat
                           (requests-from-to db aid bid)
                           (requests-from-to db bid aid))
                          (filter current?))]
    (mapv (fn [{:contact_request/keys [from to]}]
            (let [args {:by to :to to :from from :state :contact_request/accepted :now now}]
              [:xtdb.api/fn :gatz.db.contacts/transition-to {:args args}]))
          current-reqs)))

(def accept-pending-requests-between-expr
  '(fn accept-pending-request-between-fn [xtdb-ctx args]
     (gatz.db.contacts/accept-pending-requests-between-txn xtdb-ctx args)))

;; ======================================================================
;; Functions for the API

(defn request-contact! [ctx {:keys [from to feed_item_id]}]
  (let [args {:id (random-uuid)
              :from from
              :to to
              :now (Date.)
              :feed_item_id (or feed_item_id (ulid/random-time-uuid))}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/new-request {:args args}]])))

(defn accept-request! [ctx {:keys [by from to now] :as params}]
  {:pre [(uuid? from) (uuid? to) (uuid? by)]}
  (let [now (or now (Date.))
        args {:from from :to to :by by :now now
              :state :contact_request/accepted
              :feed_item_id (ulid/random-time-uuid)}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/transition-to {:args args}]
                         [:xtdb.api/fn :gatz.db.contacts/invite-contact {:args {:by-uid from :to-uid to :now now}}]])))

(defn ignore-request! [ctx {:keys [by from to]}]
  {:pre [(uuid? from) (uuid? to) (uuid? by)]}
  (let [args {:from from
              :to to
              :by by
              :now (Date.)
              :state :contact_request/ignored}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/transition-to {:args args}]])))

(defn remove-contact! [ctx {:keys [by from to]}]
  {:pre [(uuid? from) (uuid? to) (uuid? by)]}
  (let [args {:from from
              :to to
              :by by
              :now (Date.)
              :state :contact_request/removed}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/transition-to {:args args}]])))

;; Translates the action to who is doing what

(defmulti ^:private -apply-request! (fn [_ctx {:keys [action]}] action))

(defmethod -apply-request! :contact_request/requested
  [{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [them feed_item_id]}]
  (let [from user-id
        to them
        txn (request-contact! ctx {:from from :to to :feed_item_id feed_item_id})
        request (current-request-from-to (xtdb/db node) from to)]
    {:txn txn :request request}))

(defmethod -apply-request! :contact_request/accepted
  [{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [them]}]
  (let [from them
        to user-id
        txn (accept-request! ctx {:from from :to to :by user-id})
        request (current-request-from-to (xtdb/db node) from to)]
    {:txt txn :request request}))

(defmethod -apply-request! :contact_request/ignored
  [{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [them]}]
  (let [from them
        to user-id
        txn (ignore-request! ctx {:from them :to to :by user-id})
        request (last (requests-from-to (xtdb/db node) from to))]
    {:txn txn :request request}))

(defmethod -apply-request! :contact_request/removed
  [{:keys [auth/user-id biff.xtdb/node] :as ctx} {:keys [them]}]
  (let [from them
        to user-id
        txn (remove-contact! ctx {:from from :to to :by user-id})
        ;; We want to return the request we operated on
        request (last (requests-from-to (xtdb/db node) from to))]
    {:txn txn :request request}))

(defn apply-request!
  "decides what is :from and :to depending on the action"
  [{:keys [auth/user-id] :as ctx}
   {:keys [them] :as args}]

  (assert (uuid? user-id))
  (assert (uuid? them))
  (assert (not= user-id them))

  (-apply-request! ctx args))

;; ======================================================================
;; Invites

(defn forced-contact-txn
  "Used for migrations and invites"

  ([db aid bid]
   (forced-contact-txn db aid bid {:now (Date.)}))

  ([db aid bid {:keys [now]}]

   {:pre [(uuid? aid) (uuid? bid) (inst? now)]}

   (let [a-contacts (by-uid db aid)
         b-contacts (by-uid db bid)]
     (assert (= (contains? (:contacts/ids a-contacts) bid)
                (contains? (:contacts/ids b-contacts) aid))
             "There states are consistent. They either have each other or not")
     ;; TODO: check if I want to return nil or []
     ;; nil might mean "this failed" and [] might mean "no change"
     (when-not (contains? (:contacts/ids a-contacts) bid)
       (let [args {:from aid :to bid :now now}]
         [[:xtdb.api/fn :gatz.db.contacts/add-contacts {:args args}]])))))

(defn force-contacts!
  [{:keys [biff.xtdb/node] :as ctx} aid bid]
  (biff/submit-tx ctx (forced-contact-txn (xtdb/db node) aid bid)))

(defn force-remove-contacts!
  [ctx aid bid]
  {:pre [(uuid? aid) (uuid? bid) (not= aid bid)]}
  (let [args {:from aid :to bid :now (Date.)}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args args}]])))

(defn add-to-open-discussions-txn [xtdb-ctx {:keys [now] :as args}]
  {:pre [(uuid? (:by-uid args)) (uuid? (:to-uid args)) (inst? now)]}
  (let [db (xtdb/db xtdb-ctx)
        inviter-uid (:by-uid args)
        invitee-uid (:to-uid args)
        my-open-dids (db.discussion/open-for-friend db inviter-uid {:now now})
        my-friends-dids-for-fofs (db.discussion/open-from-my-friends-to-fofs db inviter-uid {:now now})
        dids (set/union my-open-dids my-friends-dids-for-fofs)
        d-txns (db.discussion/add-members-to-dids-txn
                db {:now now
                    :by-uid inviter-uid
                    :members #{invitee-uid}
                    :dids dids})]
    (if-not (empty? d-txns)
      (conj d-txns [:xtdb.api/fn :gatz.db.feed/add-uids-to-dids
                    {:dids dids
                     :uids #{invitee-uid}}])
      [])))

(def add-to-open-discussions-expr
  '(fn add-to-open-discussions-fn [xtdb-ctx args]
     (gatz.db.contacts/add-to-open-discussions-txn xtdb-ctx args)))

(defn add-to-fof-open-discussions-txn [xtdb-ctx {:keys [to-uid now] :as args}]
  {:pre [(uuid? to-uid) (inst? now)]}
  (let [db (xtdb/db xtdb-ctx)
        by_uid (:by-uid args)
        _ (assert (uuid? by_uid))
        fof-uids (disj (:contacts/ids (by-uid db by_uid)) to-uid)]
    (mapcat
     (fn [fof-uid]
       (let [dids (db.discussion/open-for-friend-of-friend db fof-uid {:now now})
             d-txns (db.discussion/add-members-to-dids-txn
                     db {:now now :by-uid fof-uid :members #{to-uid} :dids dids})]
         (if-not (empty? d-txns)
           (conj d-txns [:xtdb.api/fn :gatz.db.feed/add-uids-to-dids {:dids dids :uids #{to-uid}}])
           [])))
     fof-uids)))

(defn invite-contact-txn
  "Invites a friend to Gatz, which adds them both to a lot of discussions.
   
   It is important that this transaction doesn't have a lot of recursion because
   it can get out of hand when you have a lot of friends of friends."
  [xtdb-ctx {:keys [args]}]
  (let [{:keys [now invite_link_id accepted_invite_feed_item_id]} args
        inviter-uid (:by-uid args)
        invitee-uid (:to-uid args)

        db (xtdb/db xtdb-ctx)

        ;; Make the two contacts friends with each other
        contact-txns (forced-contact-txn db inviter-uid invitee-uid {:now now})

        ;; Add "accepted invite" feed item
        feed-item-txn (when (and invite_link_id accepted_invite_feed_item_id)
                        (db.feed/accepted-invite-item-txn
                         accepted_invite_feed_item_id now
                         {:uid inviter-uid :invite_link_id invite_link_id  :contact_id invitee-uid}))

        ;; Find all the discussions the invitee should be added to
        ;; 1. to_all_contacts from the inviter
        ;; 2. to_all_friends_of_friends for the inviter's friends of friends
        ;; They should have feed items and events for those feed items
        inviter-open-dids (db.discussion/open-for-friend db inviter-uid {:now now})
        inviter-fof-open-dids (db.discussion/open-from-my-friends-to-fofs db inviter-uid {:now now})
        add-invitee-to-open-dids-txn
        (db.discussion/add-members-to-dids-txn
         xtdb-ctx {:now now
                   :by-uid inviter-uid ;; TODO: this will run into auth problems
                   :members #{invitee-uid}
                   :feed-item-event? true
                   :dids (set/union inviter-open-dids inviter-fof-open-dids)})

        ;; Find all the discussions the inviter should be added to
        ;; 1. to_all_contacts from the invitee
        ;; 2. to_all_friends_of_friends for the invitee's friends of friends
        ;; They should have feed items but not events for those feed items
        invitee-open-dids (db.discussion/open-for-friend db invitee-uid {:now now})
        invitee-fof-open-dids (db.discussion/open-from-my-friends-to-fofs db invitee-uid {:now now})
        add-inviter-to-invitee-open-dids-txn
        (db.discussion/add-members-to-dids-txn
         xtdb-ctx {:now now
                   :by-uid invitee-uid ;; TODO: this will run into auth problems
                   :members #{inviter-uid}
                   :feed-item-event? false
                   :dids (set/union invitee-open-dids invitee-fof-open-dids)})

        ;; Find all the discussions the inviter's friends of friends should be added to
        ;; 1. to_all_friends_of_friends for the invitee 
        ;; They should have feed items but not events for those feed items
        inviter-fof-uids (disj (:contacts/ids (by-uid db inviter-uid)) invitee-uid)
        invitee-dids-for-fof-only (db.discussion/open-for-friend-of-friend db invitee-uid {:now now})
        add-inviter-fof-to-invitee-open-dids-txn
        (db.discussion/add-members-to-dids-txn
         xtdb-ctx {:now now
                   :by-uid invitee-uid
                   :members inviter-fof-uids
                   :feed-item-event? false
                   :dids invitee-dids-for-fof-only})


        ;; Find all the discussions the invitee's friends of friends should be added to
        ;; 1. to_all_friends_of_friends for the inviter
        ;; They should have feed items but no events for those feed items
        invitee-fof-uids (disj (:contacts/ids (by-uid db invitee-uid)) inviter-uid)
        inviter-dids-for-fof-only (db.discussion/open-for-friend-of-friend db inviter-uid {:now now})
        add-invitee-fof-to-inviter-open-dids-txn
        (db.discussion/add-members-to-dids-txn
         xtdb-ctx {:now now
                   :by-uid inviter-uid
                   :members invitee-fof-uids
                   :feed-item-event? false
                   :dids inviter-dids-for-fof-only})]
    (vec
     (concat contact-txns
             feed-item-txn
             add-invitee-to-open-dids-txn
             add-inviter-to-invitee-open-dids-txn
             add-inviter-fof-to-invitee-open-dids-txn
             add-invitee-fof-to-inviter-open-dids-txn))))

(def invite-contact-expr
  '(fn invite-contact-fn [xtdb-ctx args]
     (gatz.db.contacts/invite-contact-txn xtdb-ctx args)))

(def tx-fns
  {:gatz.db.contacts/add-contacts add-contacts-expr
   :gatz.db.contacts/remove-contacts remove-contacts-expr
   :gatz.db.contacts/new-request new-contact-request-expr
   :gatz.db.contacts/transition-to transition-to-expr
   :gatz.db.contacts/accept-pending-requests-between accept-pending-requests-between-expr
   :gatz.db.contacts/invite-contact invite-contact-expr
   :gatz.db.contacts/add-to-open-discussions add-to-open-discussions-expr
   :gatz.db.contacts/hide-contact hide-contact-expr
   :gatz.db.contacts/unhide-contact unhide-contact-expr
   :gatz.db.feed/new-user-item new-user-item-expr})
