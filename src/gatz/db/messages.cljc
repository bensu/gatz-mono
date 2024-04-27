(ns gatz.db.messages
  (:require [clojure.test :refer [deftest testing is]]
            [crdt.core :as crdt])
  (:import [java.util Date]))

(def message-defaults
  {:message/media nil
   :message/reply_to nil
   :message/deleted_at nil
   :message/edits []
   :message/reactions {}
   :message/posted_as_discussion []})

(def final-keys
  [:xt/id
   :message/did
   :message/user_id
   :message/reply_to
   :message/media
   :message/created_at])

(deftest crdt-messages
  (let [mid (random-uuid)
        did (random-uuid)
        uid (random-uuid)
        tick! (let [clock (atom 0)]
                (fn [] (swap! clock inc)))
        now (Date.)
        uid2 (random-uuid)
        text "0"
        msg {:xt/id mid
             :message/did did
             :message/user_id uid
             :message/reply_to nil
             :message/media nil
             :message/created_at now
             :message/deleted_at (crdt/->MinWins nil)
             :message/updated_at (crdt/->MaxWins now)
             :message/posted_as_discussion (crdt/->GrowOnlySet #{})
             :message/edits (crdt/->GrowOnlySet (set [{:message/text text :message/edited_at now}]))
             :message/text (crdt/->LWW (tick!) text)
             :message/reactions {}}
        deltas [{:message/text (crdt/->LWW (tick!) "1")
                 :message/edits {:message/text "1" :message/edited_at (Date.)}
                 :message/updated_at (Date.)}
                {:message/text (crdt/->LWW (tick!) "2")
                 :message/updated_at (Date.)
                 :message/edits {:message/text "2" :message/edited_at (Date.)}}
                {:message/text (crdt/->LWW (tick!) "3")
                 :message/updated_at (Date.)
                 :message/edits {:message/text "3" :message/edited_at (Date.)}}

                {:message/posted_as_discussion (random-uuid)
                 :message/updated_at (Date.)}
                {:message/posted_as_discussion (random-uuid)
                 :message/updated_at (Date.)}

                {:message/reactions {uid {"like" (crdt/->LWW (tick!) now)}}}
                {:message/reactions {uid {"dislike" (crdt/->LWW (tick!) now)}}}
                {:message/reactions {uid {"dislike" (crdt/->LWW (tick!) nil)}}}
                {:message/reactions {uid2 {"like" (crdt/->LWW (tick!) now)}}}

                {:message/deleted_at (Date.)
                 :message/updated_at (Date.)}]
        final (reduce crdt/-apply-delta msg (shuffle deltas))
        final-value (crdt/-value final)]

    (testing "message converges to what we expect"
      (is (= (select-keys (crdt/-value msg) final-keys)
             (select-keys final-value final-keys)))

      (is (= (:message/deleted_at final-value)
             (first (keep :message/deleted_at deltas))))

      (is (= 2 (count (:message/posted_as_discussion final-value))))

      (is (= "3" (:message/text final-value)))

      (is (= #{"0" "1" "2" "3"}
             (set (map :message/text (:message/edits final-value)))))

      (is (= {uid {"like" now "dislike" nil} uid2 {"like" now}}
             (:message/reactions final-value)))

      (is (= (last (sort (map :message/updated_at deltas)))
             (:message/updated_at final-value))))))
