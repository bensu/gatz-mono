(ns gatz.db.contacts
  (:require [clojure.set :as set]
            [com.biffweb :as biff :refer [q]]
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
     :contacts/removed {}
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

(def contact-request-state-schema
  [:enum
   :contact_request/self
   :contact_request/none
   :contact_request/viewer_awaits_response
   :contact_request/response_pending_from_viewer
   :contact_request/viewer_ignored_response
   :contact_request/accepted])

(def contact-request-state
  (set (rest contact-request-state-schema)))

(defn state-for [viewed-contacts viewer-id]
  {:pre [(map? viewed-contacts) (uuid? viewer-id)]
   :post [(contains? contact-request-state %)]}

  (let [request-made-by-viewer (get-in viewed-contacts [:contacts/requests_received viewer-id])
        request-received-by-viewer (get-in viewed-contacts [:contacts/requests_made viewer-id])
        removed-by-viewed (get-in viewed-contacts [:contacts/removed viewer-id])]
    (cond
      (= (:contacts/user_id viewed-contacts) viewer-id)
      :contact_request/self

      (contains? (:contacts/ids viewed-contacts) viewer-id)
      :contact_request/accepted

      (and request-made-by-viewer (nil? (:contact_request/decision request-made-by-viewer)))
      :contact_request/viewer_awaits_response

      ;; This is the crucial asymmetry. If the viewed contact ignored the request
      ;; we still tell the viewer that they are waiting for a response
      (and request-made-by-viewer
           (= :contact_request/ignored
              (:contact_request/decision request-made-by-viewer)))
      :contact_request/viewer_awaits_response

      ;; This is an asymmetry. Even though the viewer has bee removed, 
      ;; we still tell the viewer they are waiting on for a response
      (some? removed-by-viewed) :contact_request/viewer_awaits_response


      (and request-received-by-viewer (nil? (:contact_request/decision request-received-by-viewer)))
      :contact_request/response_pending_from_viewer

      ;; We check some? because if the viewer has accepted, it should already be handled above
      (and request-received-by-viewer (some? (:contact_request/decision request-received-by-viewer)))
      :contact_request/viewer_ignored_response

      :else :contact_request/none)))

(defn request-contact-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [id from to now]} args
        requester-contacts (gatz.db.contacts/by-uid db from)
        receiver-contacts (gatz.db.contacts/by-uid db to)]
    (assert (uuid? id))
    (when-not (= from to)
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
                              (update :contacts/requests_made assoc to new-request))]])))))

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

(defn remove-contact-txn [xtdb-ctx {:keys [args]}]
  (let [db (xtdb.api/db xtdb-ctx)
        {:keys [from to now id]} args
        remover-contacts (gatz.db.contacts/by-uid db from)
        removed-contacts (gatz.db.contacts/by-uid db to)]
    (when (contains? (:contacts/ids remover-contacts) to)
      (assert (contains? (:contacts/ids removed-contacts) from)
              "They should have each other")
      (let [removed-log {:contact_removed/id id
                         :contact_removed/from from
                         :contact_removed/to to
                         :contact_removed/created_at now}]
        [[:xtdb.api/put (-> remover-contacts
                            (update :contacts/removed assoc to removed-log)
                            (update :contacts/ids disj to))]
         [:xtdb.api/put (-> removed-contacts
                            (update :contacts/removed assoc from removed-log)
                            (update :contacts/ids disj from))]]))))

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

(def ^{:doc "This function will be stored in the db which is why it is an expression"}
  remove-contact-expr
  '(fn remove-contact-fn [ctx args]
     (gatz.db.contacts/remove-contact-txn ctx args)))

(defn remove-contact! [ctx {:keys [from to]}]
  (let [args {:id (random-uuid) :from from :to to :now (Date.)}]
    ;; TODO: check if they already have a request?
    (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/remove-contact {:args args}]])))

(def tx-fns
  {:gatz.db.contacts/request-contact request-contact-expr
   :gatz.db.contacts/decide-on-request decide-on-request-expr
   :gatz.db.contacts/remove-contact remove-contact-expr})


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
       (let [args {:from aid :to bid :now now :id (random-uuid)}]
         [[:xtdb.api/fn :gatz.db.contacts/request-contact {:args args}]
          [:xtdb.api/fn :gatz.db.contacts/decide-on-request {:args (assoc args :decision :contact_request/accepted)}]])))))

(defmulti ^:private -apply-request! (fn [_ctx {:keys [action]}] action))

(defmethod -apply-request! :contact_request/request
  [ctx {:keys [to from]}]
  (request-contact! ctx {:from from :to to}))

(defmethod -apply-request! :contact_request/accept
  [ctx {:keys [to from]}]
  (decide-on-request! ctx {:from from :to to :decision :contact_request/accepted}))

(defmethod -apply-request! :contact_request/ignore
  [ctx {:keys [to from]}]
  (decide-on-request! ctx {:from from :to to :decision :contact_request/ignore}))

(defmethod -apply-request! :contact_request/remove
  [ctx {:keys [to from]}]
  (remove-contact! ctx {:from from :to to}))

(defn apply-request!
  [{:keys [biff.xtdb/node] :as ctx}
   {:keys [from to] :as args}]

  (assert (not= from to))

  (let [txn (-apply-request! ctx args)
        _ (xtdb/await-tx node (::xtdb/tx-id txn))
        db (xtdb/db node)]
    {:from-contacts (by-uid db from)
     :to-contacts (by-uid db to)}))

