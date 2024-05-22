(ns gatz.db.contacts
  (:require [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

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
     :contacts/requests_received {}
     :contacts/requests_made {}
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

(defn request-contact-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [id from to now]} args
        requester-contacts (gatz.db.contacts/by-uid db from)
        receiver-contacts (gatz.db.contacts/by-uid db to)]

    (when-not (contains? (:contacts/requests_received receiver-contacts) from)
      (let [new-request {:contact_request/id id
                         :contact_request/from from
                         :contact_request/to to
                         :contact_request/created_at now
                         :contact_request/decided_at nil
                         :contact_request/decision nil}]
        [[:xtdb.api/put (-> receiver-contacts
                            (assoc :db/doc-type :gatz/contacts)
                            (update :contacts/requests_received assoc from new-request))]
         [:xtdb.api/put (-> requester-contacts
                            (assoc :db/doc-type :gatz/contacts)
                            (update :contacts/requests_made assoc to new-request))]]))))

(defn decide-on-request-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now decision]} args
        requester-contacts (gatz.db.contacts/by-uid db from)
        receiver-contacts (gatz.db.contacts/by-uid db to)
        accepted? (= :contact_request/accepted decision)]
    (when-let [request (get-in receiver-contacts [:contacts/requests_received from])]
      (assert (or (nil? (:contact_request/decided_at request))
                  (= decision (:contact_request/decision request)))
              "This request hasn't been decided or this is the same decision")
      (when-not (= decision (:contact_request/decision request))
        ;; If it is the same decision, then, don't do this again
        (let [new-request (assoc request
                                 :contact_request/decided_at now
                                 :contact_request/decision decision)]
          [[:xtdb.api/put (cond-> (-> receiver-contacts
                                      (assoc :db/doc-type :gatz/contacts)
                                      (update :contacts/requests_received assoc from new-request))
                            accepted? (update :contacts/ids conj from))]
           [:xtdb.api/put (cond-> (-> requester-contacts
                                      (assoc :db/doc-type :gatz/contacts)
                                      (update :contacts/requests_made assoc to new-request))
                            accepted? (update :contacts/ids conj to))]])))))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  request-contact-expr
  '(fn request-contact-fn [ctx args]
     (gatz.db.contacts/request-contact-txn ctx args)))

(defn request-contact! [ctx {:keys [from to]}]
  (let [args {:id (random-uuid) :from from :to to :now (Date.)}]
    ;; TODO: check if they already have a request?
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/request-contact {:args args}]])))

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  decide-on-request-expr
  '(fn decide-on-request-expr [ctx args]
     (gatz.db.contacts/decide-on-request-txn ctx args)))

(defn decide-on-request! [ctx {:keys [from to decision]}]
  {:pre [(uuid? from) (uuid? to)
         (contains? #{:contact_request/accepted :contact_request/ignored} decision)]}
  (let [args {:from from :to to :now (Date.) :decision decision}]
    ;; TODO: check if they already have a request?
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/decide-on-request {:args args}]])))

(def tx-fns
  {:gatz.db.contacts/request-contact request-contact-expr
   :gatz.db.contacts/decide-on-request decide-on-request-expr})

