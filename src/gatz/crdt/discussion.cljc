(ns gatz.crdt.discussion
  (:require [crdt.core :as crdt]
            [gatz.schema :as schema]
            [malli.core :as malli])
  (:import [java.util Date]))

(def discussion-defaults
  {:discussion/seen_at {}
   :discussion/archived_at {}
   :discussion/last_message_read {}
   :discussion/subscribers #{}
   :discussion/originally_from nil
   :discussion/first_message nil
   :discussion/latest_message nil})

(defn update-discussion
  ([d] (update-discussion d (Date.)))
  ([d now]
   (-> (merge discussion-defaults
              ;; TODO: remove when migration is complete
              {:discussion/latest_activity_ts now}
              d)
       (assoc :db/doc-type :gatz/discussion)
       (assoc :discussion/updated_at now))))

;; TODO: annotate CRDT fields
(defn new-discussion

  [{:keys [did uid mid originally-from member-uids]}
   {:keys [now]}]

  {:pre [(uuid? mid) (uuid? did) (uuid? uid)
         (set? member-uids) (every? uuid? member-uids)]
   :post [(malli/validate schema/DiscussionCRDT %)]}

  (let [clock (crdt/new-hlc uid now)]

    {:db/type :gatz/discussion
     :crdt/clock clock
     :xt/id did
     :db/version 2
     :discussion/did did
     :discussion/name nil
     :discussion/created_by uid
     :discussion/created_at now
     :discussion/originally_from originally-from
     :discussion/first_message mid

     :discussion/members (crdt/lww-set clock (conj member-uids uid))
     :discussion/subscribers (crdt/lww-set clock #{uid})
     :discussion/active_members (crdt/gos #{uid})
     :discussion/latest_message (crdt/->LWW clock mid)
     :discussion/last_message_read {}


     :discussion/updated_at (crdt/->MaxWins now)
     :discussion/latest_activity_ts (crdt/->MaxWins now)
     ;; We'll let the user see their own discussion in the feed as new
     ;; :discussion/seen_at {uid now}
     :discussion/seen_at {}
     :discussion/archived_at {}}))


(defn ->value [d]
  (crdt/-value d))

(defn apply-delta [d delta]
  (crdt/-apply-delta d delta))