(ns gatz.db.message-test
  (:require [com.biffweb :as biff :refer [q]]
            [clojure.test :refer [deftest testing is are]]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [taoensso.nippy :as taoensso-nippy]
            [crdt.core :as crdt]
            [gatz.db :as db]
            [gatz.schema :as schema]
            [gatz.db.message :refer :all]
            [gatz.db.util-test :as db.util-test]
            [malli.core :as malli]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest message-events
  (testing "Events can be validated"
    (let [now (Date.)
          [uid did mid cid] (repeatedly 4 random-uuid)
          clock (crdt/new-hlc cid now)]
      (are [action] (malli/validate schema/MessageAction action)
        {:message.crdt/action :message.crdt/edit
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}}}
        {:message.crdt/action :message.crdt/delete
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/deleted_at now}}
        {:message.crdt/action :message.crdt/add-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock now)}}}}
        {:message.crdt/action :message.crdt/remove-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock nil)}}}})
      (are [action] (false? (malli/validate schema/MessageAction action))
        {:message.crdt/action :message.crdt/edit
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}}}
        {:message.crdt/action :message.crdt/delete
         :message.crdt/delta {:crdt/clock clock
                              :message/text (crdt/->LWW clock "new text")
                              :message/edits {:message/text "new text"
                                              :message/edited_at now}
                              :message/updated_at now
                              :message/deleted_at now}}
        {:message.crdt/action :message.crdt/add-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock now)}}}}
        {:message.crdt/action :message.crdt/remove-reaction
         :message.crdt/delta {:crdt/clock clock
                              :message/deleted_at now
                              :message/updated_at now
                              :message/reactions {uid {"like" (crdt/->LWW clock nil)}}}}))))



(deftest message-authorization
  (testing "Deltas have to be authorized"
    (let [now (Date.)
          [poster-uid commenter-uid outsider-uid cid mid did]
          (repeatedly 6 random-uuid)
          clock (crdt/new-hlc cid now)
          message {:xt/id mid
                   :message/user_id poster-uid}
          discussion {:xt/id did
                      :discussion/members #{poster-uid commenter-uid}}]

      (testing "the poster has access to all the operations"
        (are [action]
             (let [evt {:evt/id (random-uuid)
                        :evt/uid poster-uid
                        :evt/data action}]
               (authorized-for-message-delta? discussion message evt))

          {:message.crdt/action :message.crdt/edit
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/text (crdt/->LWW clock "new text")
                                :message/edits {:message/text "new text"
                                                :message/edited_at now}}}

          {:message.crdt/action :message.crdt/delete
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/deleted_at now}}

          {:message.crdt/action :message.crdt/add-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {poster-uid {"like" (crdt/->LWW clock now)}}}}

          {:message.crdt/action :message.crdt/remove-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {poster-uid {"like" (crdt/->LWW clock nil)}}}}))
      (testing "the subscribed has access to some operations"
        (are [action]
             (let [evt {:evt/id (random-uuid) :evt/uid commenter-uid :evt/data action}]
               (authorized-for-message-delta? discussion message evt))

          {:message.crdt/action :message.crdt/add-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {commenter-uid {"like" (crdt/->LWW clock now)}}}}

          {:message.crdt/action :message.crdt/remove-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {commenter-uid {"like" (crdt/->LWW clock nil)}}}})
        (testing "but not others"
          (are [action]
               (let [evt {:evt/id (random-uuid) :evt/uid commenter-uid :evt/data action}]
                 (not (authorized-for-message-delta? discussion message evt)))

            {:message.crdt/action :message.crdt/edit
             :message.crdt/delta {:crdt/clock clock
                                  :message/updated_at now
                                  :message/text (crdt/->LWW clock "new text")
                                  :message/edits {:message/text "new text"
                                                  :message/edited_at now}}}

            {:message.crdt/action :message.crdt/delete
             :message.crdt/delta {:crdt/clock clock
                                  :message/updated_at now
                                  :message/deleted_at now}}

            {:message.crdt/action :message.crdt/add-reaction
             :message.crdt/delta {:crdt/clock clock
                                  :message/updated_at now
                                  :message/reactions {poster-uid {"like" (crdt/->LWW clock now)}}}}

            {:message.crdt/action :message.crdt/remove-reaction
             :message.crdt/delta {:crdt/clock clock
                                  :message/updated_at now
                                  :message/reactions {commenter-uid  {"like" (crdt/->LWW clock nil)}
                                                      poster-uid {"like" (crdt/->LWW clock nil)}}}})))
      (testing "the outside has no access"
        (are [action]
             (let [evt {:evt/id (random-uuid) :evt/uid outsider-uid :evt/data action}]
               (not (authorized-for-message-delta? discussion message evt)))

          {:message.crdt/action :message.crdt/edit
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/text (crdt/->LWW clock "new text")
                                :message/edits {:message/text "new text"
                                                :message/edited_at now}}}

          {:message.crdt/action :message.crdt/delete
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/deleted_at now}}

          {:message.crdt/action :message.crdt/add-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {outsider-uid {"like" (crdt/->LWW clock now)}}}}

          {:message.crdt/action :message.crdt/remove-reaction
           :message.crdt/delta {:crdt/clock clock
                                :message/updated_at now
                                :message/reactions {outsider-uid {"like" (crdt/->LWW clock nil)}}}})))))

(deftest db-roundtrip
  (testing "we can store a message and retrieve it"
    (let [node (db.util-test/test-node)
          id (random-uuid)
          doc0 {:xt/id id
                :message/updated_at (crdt/->MaxWins (Date.))}
          r  (xtdb/submit-tx node [[::xtdb/put doc0]])]
      (xtdb/await-tx node (::xtdb/tx-id r))
      (is (= doc0 (juxt-nippy/thaw (juxt-nippy/freeze doc0)))
          "Can roundrobin with juxt's nippy")
      (is (= doc0 (taoensso-nippy/thaw (taoensso-nippy/freeze doc0)))
          "Can roundrobin with nippy")
      (let [doc1 (xtdb/entity (xtdb/db node) id)]
        (is (= doc0 doc1))
        (is (= (class (:message/updated_at doc0))
               (class (:message/updated_at doc1))))))))
