(ns gatz.db.invite-link
  (:require [crdt.core :as crdt]
            [com.biffweb :as biff :refer [q]]
            [xtdb.api :as xtdb]
            [clojure.string :as str])
  (:import [java.util Date]
           [java.time Duration]))

(comment

  "https://gatz.chat/invite-link/1234567890abcdef"
  "chat.gatz://invite-link/1234567890abcdef")

(defn parse-url [s]
  {:post [(or (nil? %) (crdt/ulid? %))]}
  (some->> (str/split s #"/")
           last
           (crdt/parse-ulid)))

(defn make-url [ctx id]
  {:pre [(crdt/ulid? id)] :post [(string? %)]}
  (format "%s/invite-link/%s"
          (:gatz/host ctx)
          (str id)))

(defn valid? [{:keys [] :as invite-link}]
  (and (nil? (:invite_link/used_at invite-link))
       (nil? (:invite_link/used_by invite-link))))

(def default-open-duration (Duration/ofDays 7))

(defn expires-on ^Date [^Date created-at]
  (Date. (+ (.getTime created-at) (.toMillis default-open-duration))))

(defn make [{:keys [type uid gid now id]}]

  {:pre [(uuid? uid)
         (contains? #{:invite_link/group :invite_link/contact} type)
         (or (nil? id) (crdt/ulid? id))
         (or (nil? now) (instance? Date now))]}

  (when (= :invite_link/group type)
    (assert (crdt/ulid? gid)))

  (let [id (or id (crdt/random-ulid))
        now (or now (Date.))]
    {:xt/id id
     :db/type :gatz/invite_link
     :db/version 1
     :invite_link/type type
     :invite_link/group_id (when (= :invite_link/group type) gid)
     :invite_link/contact_id (when (= :invite_link/contact type) uid)
     :invite_link/created_by uid
     :invite_link/created_at now
     :invite_link/expires_at (expires-on now)
     :invite_link/used_at nil
     :invite_link/used_by nil}))

(defn create! [ctx opts]
  (let [invite-link (make opts)]
    (biff/submit-tx (assoc ctx :biff.xtdb/retry false)
                    [(assoc invite-link :db/doc-type :gatz/invite_link)])
    invite-link))

(defn mark-used [invite-link {:keys [by-uid now]}]
  {:pre [(uuid? by-uid) (instance? Date now)]}
  (assoc invite-link
         :invite_link/used_at now
         :invite_link/used_by by-uid))

(def default-fields
  {:invite_link/contact_id nil})

(defn by-id [db id]
  {:pre [(crdt/ulid? id)]}
  (merge default-fields (xtdb/entity db id)))

(defn find-url [db url]
  (when-let [id (parse-url url)]
    (by-id db id)))

(defn mark-used!
  [{:keys [biff/db] :as ctx} id {:keys [by-uid now]}]
  (when-let [invite-link (by-id db id)]
    (let [now (or now (Date.))
          new-invite-link (mark-used invite-link {:by-uid by-uid
                                                  :now now})]
      (biff/submit-tx (assoc ctx :biff.xtdb/retry false)
                      [new-invite-link])
      new-invite-link)))

(defn mark-used-txn [xtdb-ctx {:keys [args]}]
  (let [{:keys [id user-id now]} args
        db (xtdb/db xtdb-ctx)
        invite-link (by-id db id)]
    (assert (uuid? user-id))
    (assert (inst? now))
    (assert (some? invite-link))
    [[:xtdb.api/put (-> invite-link
                        (mark-used {:by-uid user-id :now now}))]]))

(def mark-used-expr
  '(fn mark-used-fn [ctx args]
     (gatz.db.invite-link/mark-used-txn ctx args)))

(def tx-fns
  {:gatz.db.invite-links/mark-used mark-used-expr})