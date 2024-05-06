(ns gatz.db.discussion-test
  (:require [clojure.test :refer [deftest is testing]]
            [crdt.core :as crdt]
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
          (malli/explain schema/MarkMessageRead mark-message-read-delta))
      (is (malli/validate schema/ArchiveDiscussion archive-delta)
          (malli/explain schema/ArchiveDiscussion archive-delta))
      (is (malli/validate schema/SubscribeDelta subscribe-delta)
          (malli/explain schema/SubscribeDelta subscribe-delta))
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