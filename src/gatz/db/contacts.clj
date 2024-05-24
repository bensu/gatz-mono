(ns gatz.db.contacts
  (:require [clojure.set :as set]
            [com.biffweb :as biff :refer [q]]
            [gatz.schema :as schema]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

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
     :db/version 1
     :contacts/created_at now
     :contacts/updated_at now
     :contacts/user_id uid
     :contacts/ids contact-ids}))

;; These are only created in gatz.db.user/create-user!
;; and they are unique by :contacts/user_id
(defn by-uid [db uid]
  {:pre [(uuid? uid)]}
  (first
   (q db '{:find (pull c [*])
           :in [uid]
           :where [[c :db/type :gatz/contacts]
                   [c :contacts/user_id uid]]}
      uid)))

(defn in-common
  [a-contacts b-contacts]
  {:post [(set? %) (every? uuid? %)]}
  (set/intersection (:contacts/ids a-contacts)
                    (:contacts/ids b-contacts)))

(defn get-in-common
  "Finds the common contacts between two users. Returns [:set uuid?]"
  [db a-uid b-uid]
  {:pre [(uuid? a-uid) (uuid? b-uid)]}
  (let [a-contacts (by-uid db a-uid)
        b-contacts (by-uid db b-uid)]
    (in-common a-contacts b-contacts)))

;; We can only do two things to Contacts, we can add or remove them

(defn add-contacts-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now]} args
        from-contacts (by-uid db from)
        to-contacts   (by-uid db to)]
    [[:xtdb.api/put (-> from-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids conj to)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/put (-> to-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids conj from)
                        (assoc :db/doc-type :gatz/contacts))]]))

(def add-contacts-expr
  '(fn add-contacts-fn [ctx args]
     (gatz.db.contacts/add-contacts-txn ctx args)))

(defn remove-contacts-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now]} args
        from-contacts (by-uid db from)
        to-contacts   (by-uid db to)]
    [[:xtdb.api/put (-> from-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids disj to)
                        (assoc :db/doc-type :gatz/contacts))]
     [:xtdb.api/put (-> to-contacts
                        (assoc :contacts/updated_at now)
                        (update :contacts/ids disj from)
                        (assoc :db/doc-type :gatz/contacts))]]))

(def remove-contacts-expr
  '(fn remove-contacts-fn [ctx args]
     (gatz.db.contacts/remove-contacts-txn ctx args)))

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
;; :contact_request/accepted -> :contact_request/removed
;; :contact_request/ignored  -> :contact_request/removed

(def contact-request-states
  #{:contact_request/requested
    :contact_request/accepted
    :contact_request/ignored
    :contact_request/removed})

(defn can-transition? [contact-request {:keys [by state]}]
  {:pre [(uuid? by) (contains? contact-request-states state)]
   :post [(boolean? %)]}
  (let [from-actor? (= by (:contact_request/from contact-request))]
    (case (:contact_request/state contact-request)
      :contact_request/requested (if from-actor?
                                   false
                                   (contains? #{:contact_request/accepted :contact_request/ignored} state))
      :contact_request/accepted (contains? #{:contact_request/removed} state)
      :contact_request/ignored  (contains? #{:contact_request/removed} state)
      :contact_request/removed  false)))

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
        :contact_request/ignored (if from-viewer?
                                   :contact_request/viewer_awaits_response
                                   :contact_request/viewer_ignored_response)
        :contact_request/accepted :contact_request/accepted
        :contact_request/removed  :contact_request/none))))

(defn pending-requests-to [db to]
  {:pre [(uuid? to)]}
  (q db '{:find (pull cr [*])
          :in [to]
          :where [[cr :db/type :gatz/contact_request]
                  [cr :contact_request/to to]
                  [cr :contact_request/state :contact_request/requested]]}
     to))

(defn requests-from-to [db from to]
  {:pre [(uuid? from) (uuid? to)]}
  (q db '{:find (pull cr [*])
          :in [to]
          :where [[cr :db/type :gatz/contact_request]
                  [cr :contact_request/to to]
                  [cr :contact_request/from from]]}
     to))

(defn new-contact-request-txn [ctx {:keys [args]}]
  (let [db (xtdb.api/db ctx)
        {:keys [from to id now]} args
        contact-request (new-contact-request args)
        pending-requests (->> (concat
                               (requests-from-to db from to)
                               (requests-from-to db to from))
                              (remove #(= :contact_request/removed (:contact_request/state %))))]
    ;; Here we could be smarter and:
    ;; - If the requester has a pending request for them, 
    ;;   then it means both sides want to be contacts
    (when (empty? pending-requests)
      [[:xtdb.api/put (-> contact-request
                          (assoc :db/doc-type :gatz/contact_request))]])))

(def new-contact-request-expr
  '(fn new-contact-request-fn [ctx args]
     (gatz.db.contacts/new-contact-request-txn ctx args)))

(defn current? [cr]
  (not (= :contact_request/removed (:contact_request/state cr))))

(defn transition-to-txn [ctx {:keys [args]}]
  (let [db (xtdb.api/db ctx)
        {:keys [by to from state now]} args
        _ (assert (uuid? by))
        _ (assert (uuid? to))
        _ (assert (uuid? from))
        _ (assert (inst? now))
        current-requests (->> (requests-from-to db from to) (filter current?))
        _ (assert (= 1 (count current-requests)))
        current-request (first current-requests)]
    (when-not (= (:contact_request/state current-request) state)
      (assert (can-transition? current-request {:by by :state state}))
      (let [new-contact-request (-> current-request
                                    (transition-to {:by by :state state :now now})
                                    (assoc :db/doc-type :gatz/contact_request))]
        (cond
          (= state :contact_request/accepted)
          [[:xtdb.api/put new-contact-request]
           [:xtdb.api/fn :gatz.db.contacts/add-contacts {:args {:from from :to to :now now}}]]

          (= state :contact_request/removed)
          [[:xtdb.api/put new-contact-request]
           [:xtdb.api/fn :gatz.db.contacts/remove-contacts {:args {:from from :to to :now now}}]]

          :else [[:xtdb.api/put new-contact-request]])))))

(def transition-to-expr
  '(fn transition-to-fn [ctx args]
     (gatz.db.contacts/transition-to-txn ctx args)))

(def tx-fns
  {:gatz.db.contacts/add-contacts add-contacts-expr
   :gatz.db.contacts/remove-contacts remove-contacts-expr
   :gatz.db.contacts/new-request new-contact-request-expr
   :gatz.db.contacts/transition-to transition-to-expr})

;; ====================================================================== 
;; Functions for the API

(defn request-contact! [ctx {:keys [from to]}]
  (let [args {:id (random-uuid) :from from :to to :now (Date.)}]
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/new-request {:args args}]])))

(defn decide-on-request! [ctx {:keys [by from to decision]}]
  {:pre [(uuid? from) (uuid? to) (uuid? by)
         (contains? #{:contact_request/accepted :contact_request/ignored} decision)]}
  (let [args {:from from
              :to to
              :by by
              :now (Date.)
              :state decision}]
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
  [{:keys [auth/user-id] :as ctx} {:keys [them]}]
  (request-contact! ctx {:from user-id :to them}))

(defmethod -apply-request! :contact_request/accepted
  [{:keys [auth/user-id] :as ctx} {:keys [them]}]
  (decide-on-request! ctx {:from them
                           :to user-id
                           :by user-id
                           :decision :contact_request/accepted}))

(defmethod -apply-request! :contact_request/ignored
  [{:keys [auth/user-id] :as ctx} {:keys [them]}]
  (decide-on-request! ctx {:from them
                           :to user-id
                           :by user-id
                           :decision :contact_request/ignored}))

(defmethod -apply-request! :contact_request/removed
  [{:keys [auth/user-id] :as ctx} {:keys [them]}]
  (remove-contact! ctx {:from them :to user-id :by user-id}))

(defn apply-request!
  "decides what is :from and :to depending on the action"
  [{:keys [biff.xtdb/node auth/user-id] :as ctx}
   {:keys [them] :as args}]

  (assert (uuid? user-id))
  (assert (uuid? them))
  (assert (not= user-id them))

  (let [txn (-apply-request! ctx args)
        _ (xtdb/await-tx node (::xtdb/tx-id txn))
        db (xtdb/db node)]
    {:my-contacts (by-uid db user-id)
     :their-contacts (by-uid db them)}))


;; ======================================================================  
;; Migrations

(defn forced-contact-txn
  "Used only for migrations"
  ([db aid bid]
   (forced-contact-txn db aid bid {:now (Date.)}))
  ([db aid bid {:keys [now]}]
   {:pre [(uuid? aid) (uuid? bid) (inst? now)]}

   (let [a-contacts (by-uid db aid)
         b-contacts (by-uid db bid)]
     (assert (= (contains? (:contacts/ids a-contacts) bid)
                (contains? (:contacts/ids b-contacts) aid))
             "There states are consistent. They either have each other or not")
     (when-not (contains? (:contacts/ids a-contacts) bid)
       (let [args {:from aid :to bid :now now}]
         [[:xtdb.api/fn :gatz.db.contacts/add-contacts {:args args}]])))))

