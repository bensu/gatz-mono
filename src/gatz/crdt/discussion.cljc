(ns gatz.crdt.discussion
  (:require [crdt.core :as crdt]
            [gatz.schema :as schema]
            [malli.core :as malli])
  (:import [java.util Date]))

(def discussion-defaults
  {:discussion/seen_at {}
   :discussion/mentions {}
   ;; :discussion/mentioned (crdt/gos #{})
   :discussion/archived_at {}
   :discussion/archived_uids #{}
   :discussion/last_message_read {}
   :discussion/subscribers #{}
   :discussion/originally_from nil
   :discussion/first_message nil
   :discussion/member_mode :discussion.member_mode/closed
   :discussion/public_mode :discussion.public_mode/hidden
   :discussion/open_until nil
   :discussion/group_id nil
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

  [{:keys [did uid mid group-id originally-from
           member-uids archived-uids mentions]}
   {:keys [now]}]

  {:pre [(uuid? mid) (uuid? did) (uuid? uid)
         (or (nil? group-id) (crdt/ulid? group-id))
         (set? member-uids) (every? uuid? member-uids)
         (or (nil? mentions)
             (and (map? mentions)
                  (every? uuid? (keys mentions))))
         (or (nil? archived-uids)
             (and (set? archived-uids) (every? uuid? archived-uids)))]
   :post [(malli/validate schema/DiscussionCRDT %)]}

  (let [clock (crdt/new-hlc uid now)]

    {:db/type :gatz/discussion
     :crdt/clock clock
     :xt/id did
     :db/version 3
     :discussion/did did
     :discussion/name nil
     :discussion/created_by uid
     :discussion/created_at now
     :discussion/group_id group-id
     :discussion/originally_from originally-from
     :discussion/first_message mid
     :discussion/member_mode :discussion.member_mode/closed
     :discussion/public_mode :discussion.public_mode/hidden
     :discussion/open_until nil

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
     :discussion/mentions (or mentions {})
     ;; :discussion/mentioned (crdt/gos #{})
     :discussion/archived_uids (crdt/lww-set clock (or archived-uids #{}))}))


(defn ->value [d]
  (crdt/-value d))

(defn apply-delta [d delta]
  (crdt/-apply-delta d delta))
