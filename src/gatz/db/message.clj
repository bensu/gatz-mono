(ns gatz.db.message
  (:require [com.biffweb :as biff :refer [q]]
            [gatz.crdt.message :as crdt.message]
            [medley.core :refer [dissoc-in]]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(def message-defaults
  {:message/media nil
   :message/reply_to nil
   :message/deleted_at nil
   :message/edits []
   :message/reactions {}
   :message/posted_as_discussion []})

(defn update-message
  ([m] (update-message m (java.util.Date.)))
  ([m now]
   (-> (merge message-defaults m)
       (assoc :db/doc-type :gatz/message)
       (assoc :db/type :gatz/message)
       (assoc :message/updated_at now))))

;; TODO: can't query messages
(defn by-id [db mid]
  {:pre [(uuid? mid)]}
  ;; TODO: deserialization here
  (xtdb/entity db mid))

;; TODO: can't query messages
(defn by-did [db did]
  (->> (q db '{:find m
               :in [did]
               :where [[m :message/did did]
                       [m :db/type :gatz/message]]}
          did)
       (map (partial by-id db))
       (remove :message/deleted_at)
       (sort-by :message/created_at)
       vec))

(defn delete-message!
  "Marks a message as deleted with :message/deleted_at"
  [{:keys [biff/db] :as ctx} mid]
  {:pre [(uuid? mid)]}
  (if-let [m (by-id db mid)]
    (let [now (Date.)
          updated-m (-> m
                        (assoc :message/deleted_at now)
                        (update-message now))]
      (biff/submit-tx ctx [updated-m])
      updated-m)
    (assert false "Tried to delete a non-existing message")))

(defn new-evt [evt]
  (merge {:db/doc-type :gatz/evt
          :evt/ts (Date.)
          :db/type :gatz/evt
          :evt/id (random-uuid)}
         evt))

;; TODO: update into discussion
(defn react-to-message!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (if-let [msg (by-id db mid)]
    (let [now (java.util.Date.)
          full-reaction {:reaction/emoji reaction
                         :reaction/created_at now
                         :reaction/did did
                         :reaction/to_mid mid
                         :reaction/by_uid user-id}
          new-msg (-> msg
                      (update :message/reactions assoc-in [user-id reaction] now)
                      (update-message now))
          evt (new-evt
               {:evt/type :evt.message/add-reaction
                :evt/uid user-id
                :evt/did did
                :evt/mid mid
                :evt/data {:reaction full-reaction}})]
      (biff/submit-tx ctx [new-msg evt])
      {:message new-msg :reaction full-reaction :evt evt})
    (assert false "Tried to update a non-existent message")))


;; TODO: update into discussion
(defn undo-react!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [reaction mid did]}]

  {:pre [(string? reaction) (uuid? mid) (uuid? did) (uuid? user-id)]}

  (if-let [msg (by-id db mid)]
    (let [now (java.util.Date.)
          new-msg (-> msg
                      (update :message/reactions dissoc-in [user-id reaction])
                      (update-message now))]
      (biff/submit-tx ctx [new-msg])
      new-msg)
    (assert false "Tried to update a non-existent message")))

(defn flatten-reactions [did mid reactions]
  {:pre [(uuid? did) (uuid? mid)]}
  (mapcat
   (fn [[uid emoji->ts]]
     (map (fn [[emoji ts]]
            {:reaction/emoji emoji
             :reaction/created_at ts
             :reaction/to_mid mid
             :reaction/by_uid uid
             :reaction/did did})
          emoji->ts))
   reactions))

(defn count-reactions [reactions]
  {:post [(number? %)]}
  (count (mapcat vals (vals reactions))))


;; TODO: update into discussion
(defn edit-message!

  [{:keys [auth/user-id biff/db] :as ctx}
   {:keys [text mid did]}]

  {:pre [(string? text) (uuid? mid) (uuid? did) (uuid? user-id)]}
  (if-let [msg (by-id db mid)]
    (let [now (java.util.Date.)
          new-edit {:message/text text
                    :message/edited_at now}
          first-edit? (empty? (:message/edits msg))
          original-edit {:message/text (:message/text msg)
                         :message/edited_at (:message/created_at msg)}
          new-msg (cond-> msg
                    first-edit? (update :message/edits (fnil conj []) original-edit))
          new-msg (-> new-msg
                      (update :message/edits conj new-edit)
                      (assoc :message/text text)
                      (update-message now))]
      (biff/submit-tx ctx [new-msg])
      new-msg)
    (assert false "Tried to update a non-existent message")))

