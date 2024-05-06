(ns gatz.db.discussion-test
  (:require [clojure.test :refer [deftest is testing]]
            [crdt.core :as crdt]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.util-test :refer [is-equal]]
            [gatz.db.discussion :refer :all]
            [gatz.db.evt :as db.evt]
            [gatz.schema :as schema]
            [malli.core :as malli])
  (:import [java.util Date]))

(deftest schemas
  (testing "we can validate all the deltas"
    (let [uid (random-uuid)
          did (random-uuid)
          mid (random-uuid)
          t0 (Date.)
          clock (crdt/new-hlc uid t0)
          mark-message-read-delta {:crdt/clock clock
                                   :discussion/updated_at t0
                                   :discussion/last_message_read {uid (crdt/->LWW clock mid)}}
          archive-delta  {:crdt/clock clock
                          :discussion/updated_at t0
                          :discussion/archived_at {uid (crdt/->LWW clock t0)}}
          subscribe-delta {:crdt/clock clock
                           :discussion/updated_at t0
                           :discussion/subscribers {uid (crdt/->LWW clock true)}}
          unsubscribe-delta {:crdt/clock clock
                             :discussion/updated_at t0
                             :discussion/subscribers {uid (crdt/->LWW clock false)}}]
      (is (malli/validate schema/MarkMessageRead mark-message-read-delta)
          (malli/explain  schema/MarkMessageRead mark-message-read-delta))
      (is (malli/validate schema/ArchiveDiscussion archive-delta)
          (malli/explain  schema/ArchiveDiscussion archive-delta))
      (is (malli/validate schema/SubscribeDelta subscribe-delta)
          (malli/explain  schema/SubscribeDelta subscribe-delta))
      (is (malli/validate schema/SubscribeDelta unsubscribe-delta)
          (malli/explain  schema/SubscribeDelta unsubscribe-delta))
      (testing "and as actions"
        (let [actions [{:discussion.crdt/action :discussion.crdt/mark-message-read
                        :discussion.crdt/delta mark-message-read-delta}
                       {:discussion.crdt/action :discussion.crdt/archive
                        :discussion.crdt/delta archive-delta}
                       {:discussion.crdt/action :discussion.crdt/subscribe
                        :discussion.crdt/delta subscribe-delta}
                       {:discussion.crdt/action :discussion.crdt/subscribe
                        :discussion.crdt/delta unsubscribe-delta}]]
          (doseq [action actions]
            (is (malli/validate schema/DiscussionAction action)
                (malli/explain schema/DiscussionAction action)))
          (testing "and as events"
            (let [events (mapv (fn [action]
                                 (db.evt/new-evt {:evt/type :discussion.crdt/delta
                                                  :evt/uid uid
                                                  :evt/did did
                                                  :evt/cid uid
                                                  :evt/mid mid
                                                  :evt/data action}))
                               actions)]
              (doseq [evt events]
                (is (malli/validate schema/DiscussionEvt evt)
                    (malli/explain schema/DiscussionEvt evt))))))))))

(deftest deltas
  (testing "we can apply the deltas"
    (let [[poster-uid commenter-uid did mid] (take 4 (repeatedly random-uuid))
          _ (println "poster" poster-uid "commenter" commenter-uid)
          now (Date.)
          t0 (crdt/inc-time now)
          t1 (crdt/inc-time t0)
          t2 (crdt/inc-time t1)
          t3 (crdt/inc-time t2)
          [cnow c0 c1 c2 c3] (map #(crdt/new-hlc poster-uid %) [now t0 t1 t2 t3])
          initial (crdt.discussion/new-discussion
                   {:did did :mid mid :uid poster-uid
                    :originally-from nil :member-uids #{commenter-uid}}
                   {:now now})
          deltas [{:crdt/clock c0
                   :discussion/updated_at t0
                   :discussion/last_message_read {poster-uid (crdt/->LWW c0 mid)}}
                  {:crdt/clock c0
                   :discussion/updated_at t0
                   :discussion/archived_at {poster-uid (crdt/->LWW c0 t0)}}
                  {:crdt/clock c1
                   :discussion/updated_at t1
                   :discussion/archived_at {commenter-uid (crdt/->LWW c1 t1)}}
                  {:crdt/clock c2
                   :discussion/updated_at t2
                   :discussion/subscribers {commenter-uid (crdt/->LWW c2 true)}}
                  {:crdt/clock c3
                   :discussion/updated_at t3
                   :discussion/subscribers {poster-uid (crdt/->LWW c3 false)}}]
          final (reduce crdt.discussion/apply-delta initial (shuffle (concat deltas deltas)))]
      (is-equal {:xt/id did
                 :crdt/clock cnow
                 :db/type :gatz/discussion
                 :discussion/did did
                 :discussion/name nil
                 :discussion/created_at now
                 :discussion/created_by poster-uid
                 :discussion/originally_from nil
                 :discussion/first_message mid
                 :discussion/members #{poster-uid commenter-uid}
                 :discussion/subscribers #{poster-uid}
                 :discussion/latest_message mid
                 :discussion/last_message_read {}
                 :discussion/latest_activity_ts now
                 :discussion/updated_at now
                 :discussion/seen_at {}
                 :discussion/archived_at {}}
                (crdt.discussion/->value initial))
      (is-equal {:xt/id did
                 :crdt/clock c3
                 :db/type :gatz/discussion
                 :discussion/did did
                 :discussion/name nil
                 :discussion/created_at now
                 :discussion/created_by poster-uid
                 :discussion/originally_from nil
                 :discussion/first_message mid

                 :discussion/members #{poster-uid commenter-uid}
                 :discussion/latest_message mid
                 :discussion/latest_activity_ts now
                 :discussion/seen_at {}

                 :discussion/updated_at t3
                 :discussion/archived_at {poster-uid t0 commenter-uid t1}
                 :discussion/subscribers #{commenter-uid}
                 :discussion/last_message_read {poster-uid mid}}
                (crdt.discussion/->value final)))))