(ns gatz.db.invite-link-test
  (:require [crdt.core :as crdt]
            [com.biffweb :as biff]
            [clojure.test :as t :refer [deftest testing is]]
            [gatz.db :as db]
            [gatz.db.contacts :as db.contacts]
            [gatz.db.discussion :as db.discussion]
            [gatz.db.invite-link :as db.invite-link]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb]
            [gatz.db.user :as db.user]
            [gatz.crdt.discussion :as crdt.discussion])
  (:import [java.util Date]))

(deftest roundtrip
  (testing "we can make an invite"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn []
                    (assoc ctx :biff/db (xtdb/db node)))
          uid (random-uuid)
          invitee (random-uuid)
          il (db.invite-link/create! ctx
                                     {:type :invite_link/contact
                                      :uid uid})
          id (:xt/id il)
          now (:invite_link/created_at il)
          later (Date.)
          _ (xtdb/sync node)
          _ (db.invite-link/mark-used! (get-ctx) id {:by-uid invitee
                                                     :now later})
          _ (xtdb/sync node)
          db (xtdb/db node)
          final-il (db.invite-link/by-id (xtdb/db node) id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
      (is (= final-il (db.invite-link/by-code db (:invite_link/code il))))
      (is (= expected-il final-il)))))


(deftest roundtrip-crew
  (testing "we can make an invite"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn []
                    (assoc ctx :biff/db (xtdb/db node)))
          uid (random-uuid)
          invitee (random-uuid)
          gid (crdt/random-ulid)
          il (db.invite-link/create! ctx
                                     {:type :invite_link/crew
                                      :gid gid
                                      :uid uid})
          id (:xt/id il)
          now (:invite_link/created_at il)
          later (Date.)
          _ (xtdb/sync node)
          _ (db.invite-link/mark-used! (get-ctx) id {:by-uid invitee
                                                     :now later})
          _ (xtdb/sync node)
          db (xtdb/db node)
          final-il (db.invite-link/by-id db id)
          expected-il (assoc il
                             :invite_link/used_at {invitee later}
                             :invite_link/used_by #{invitee})]
      (is (some? id))
      (is (= expected-il (db.invite-link/mark-used il {:by-uid invitee
                                                       :now later})))
      (is (= final-il (db.invite-link/by-code db (:invite_link/code il))))
      (is (= expected-il final-il)))))

(deftest unique-codes
  (testing "invite links must have unique codes"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          uid (random-uuid)
          il1 (with-redefs [db.invite-link/random-code (constantly "ABCDEF")]
                (db.invite-link/create! ctx
                                        {:type :invite_link/contact
                                         :uid uid}))]
      (xtdb/sync node)
      (testing
       "First invite link should be created successfully"
        (is (some? (:xt/id il1)))
        (is (= "ABCDEF" (:invite_link/code il1))))

      (testing "teh second attempt with the same code fails"
        (is (thrown? Exception
                     (with-redefs [db.invite-link/random-code (constantly "ABCDEF")]
                       (db.invite-link/create! ctx
                                               {:type :invite_link/contact
                                                :uid uid}))))))))

(deftest expiration
  (testing "invite links can expire"
    (let [ctx (db.util-test/test-system)
          uid (random-uuid)
          now (Date.)
          il (binding [db.invite-link/*test-current-ts* now]
               (db.invite-link/create! ctx
                                       {:type :invite_link/contact
                                        :uid uid
                                        :now now}))
          ;; one day after expiration
          future-date (Date. (+ (.getTime now)
                                (.toMillis db.invite-link/default-open-duration)
                                (* 24 60 60 1000)))]
      (is (not (db.invite-link/expired? il {:now now}))
          "Invite link should not be expired when first created")

      (binding [db.invite-link/*test-current-ts* future-date]
        (is (db.invite-link/expired? il {:now future-date})
            "Invite link should be expired after the expiration date")))))

(defn same-operation? [txn-a txn-b]
  (let [[a1 a2 _] txn-a
        [b1 b2 _] txn-b]
    (and (= a1 b1) (= a2 b2))))

(deftest invite-contact
  (testing "one user invites another one"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (let [db (xtdb/db node)
                          user (db.user/by-id db uid)]
                      (assert user)
                      (assoc ctx
                             :auth/user-id uid
                             :auth/user user
                             :biff/db (xtdb/db node))))

          ;; Create users
          inviter (random-uuid)
          invitee (random-uuid)
          now (Date.)

          ;; Create the users
          _ (db.user/create-user! ctx {:id inviter :username "inviter" :phone "+14159499000" :now now})
          _ (db.user/create-user! ctx {:id invitee :username "invitee" :phone "+14159499001" :now now})
          _ (xtdb/sync node)

          ;; Create some open discussions for inviter
          inviter-did1 (random-uuid)
          inviter-did2 (random-uuid)
          _ (db/create-discussion-with-message!
             (get-ctx inviter)
             {:did inviter-did1
              :created_by inviter
              :now now
              :text "Hello from inviter 1"
              :to_all_contacts true
              :to_all_friends_of_friends true})
          _ (db/create-discussion-with-message!
             (get-ctx inviter)
             {:did inviter-did2
              :created_by inviter
              :now now
              :text "Hello from inviter 2"
              :to_all_contacts true
              :to_all_friends_of_friends true})

          ;; Create a discussion that's only shared with contacts
          inviter-did3 (random-uuid)
          _ (db/create-discussion-with-message!
             (get-ctx inviter)
             {:did inviter-did3
              :created_by inviter
              :now now
              :text "Hello from inviter 3 (contacts only)"
              :to_all_contacts true
              :to_all_friends_of_friends false})

          ;; Create some open discussions for invitee
          invitee-did1 (random-uuid)
          invitee-did2 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx invitee)
                                                {:did invitee-did1
                                                 :created_by invitee
                                                 :now now
                                                 :text "Hello from invitee 1"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})
          _ (db/create-discussion-with-message! (get-ctx invitee)
                                                {:did invitee-did2
                                                 :created_by invitee
                                                 :now now
                                                 :text "Hello from invitee 2"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})
          _ (xtdb/sync node)

          ;; Create invite link and mark it as used
          invite-link-id (crdt/random-ulid)
          accepted_invite_feed_item_id (random-uuid)

          ;; Execute the invite-contact transaction
          _ (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/invite-contact
                                  {:args {:by-uid inviter
                                          :to-uid invitee
                                          :now now
                                          :invite_link_id invite-link-id
                                          :accepted_invite_feed_item_id accepted_invite_feed_item_id}}]])

          ;; Sync again
          _ (xtdb/sync node)

          ;; Get the final state
          db (xtdb/db node)
          inviter-contacts (db.contacts/by-uid db inviter)
          invitee-contacts (db.contacts/by-uid db invitee)
          inviter-discussions (crdt.discussion/->value (db.discussion/by-id db inviter-did1))
          invitee-discussions (crdt.discussion/->value (db.discussion/by-id db invitee-did1))
          contacts-only-discussion (crdt.discussion/->value (db.discussion/by-id db inviter-did3))]

      ;; Test that contacts were created
      (is (contains? (:contacts/ids inviter-contacts) invitee)
          "Inviter should have invitee as contact")
      (is (contains? (:contacts/ids invitee-contacts) inviter)
          "Invitee should have inviter as contact")

      ;; Test that discussions were shared
      (is (contains? (:discussion/members inviter-discussions) invitee)
          "Invitee should be a member of inviter's discussion")
      (is (contains? (:discussion/members invitee-discussions) inviter)
          "Inviter should be a member of invitee's discussion")
      (is (contains? (:discussion/members contacts-only-discussion) invitee)
          "Invitee should be a member of inviter's contacts-only discussion")))

  (testing "inviter invites a third person"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          get-ctx (fn [uid]
                    (let [db (xtdb/db node)
                          user (db.user/by-id db uid)]
                      (assert user)
                      (assoc ctx
                             :auth/user-id uid
                             :auth/user user
                             :biff/db (xtdb/db node))))

          ;; Create users
          inviter (random-uuid)
          invitee1 (random-uuid)
          invitee2 (random-uuid)
          invitee3 (random-uuid)
          invitee4 (random-uuid)
          now (Date.)

          ;; Create the users
          _ (db.user/create-user! ctx {:id inviter :username "inviter" :phone "+14159499000" :now now})
          _ (db.user/create-user! ctx {:id invitee1 :username "invitee1" :phone "+14159499001" :now now})
          _ (db.user/create-user! ctx {:id invitee2 :username "invitee2" :phone "+14159499002" :now now})
          _ (db.user/create-user! ctx {:id invitee3 :username "invitee3" :phone "+14159499003" :now now})
          _ (db.user/create-user! ctx {:id invitee4 :username "invitee4" :phone "+14159499004" :now now})
          _ (xtdb/sync node)

          _ (db.contacts/force-contacts! ctx invitee3 invitee4)

          ;; Create some open discussions for inviter
          inviter-did1 (random-uuid)
          inviter-did2 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did1
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter 1"
                                                 :to_all_contacts true})
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did2
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter 2"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})

          ;; Create a discussion that's only shared with contacts
          inviter-did3 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did3
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter 3 (contacts only)"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends false})

          ;; Create some open discussions for invitee1
          invitee1-did1 (random-uuid)
          invitee1-did2 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx invitee1)
                                                {:did invitee1-did1
                                                 :created_by invitee1
                                                 :now now
                                                 :text "Hello from invitee1 1"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})
          _ (db/create-discussion-with-message! (get-ctx invitee1)
                                                {:did invitee1-did2
                                                 :created_by invitee1
                                                 :now now
                                                 :text "Hello from invitee1 2"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})

          ;; Create some open discussions for invitee2
          invitee2-did1 (random-uuid)
          invitee2-did2 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx invitee2)
                                                {:did invitee2-did1
                                                 :created_by invitee2
                                                 :now now
                                                 :text "Hello from invitee2 1"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})
          _ (db/create-discussion-with-message! (get-ctx invitee2)
                                                {:did invitee2-did2
                                                 :created_by invitee2
                                                 :now now
                                                 :text "Hello from invitee2 2"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})

          ;; Create some open discussions for invitee3
          invitee3-did1 (random-uuid)
          invitee3-did2 (random-uuid)
          invitee3-did3 (random-uuid)
          _ (db/create-discussion-with-message! (get-ctx invitee3)
                                                {:did invitee3-did1
                                                 :created_by invitee3
                                                 :now now
                                                 :text "Hello from invitee3 1 (friends of friends)"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})
          _ (db/create-discussion-with-message! (get-ctx invitee3)
                                                {:did invitee3-did2
                                                 :created_by invitee3
                                                 :now now
                                                 :text "Hello from invitee3 2 (contacts only)"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends false})
          _ (db/create-discussion-with-message! (get-ctx invitee3)
                                                {:did invitee3-did3
                                                 :created_by invitee3
                                                 :now now
                                                 :text "Hello from invitee3 to 4 (selected_users)"
                                                 :selected_users [invitee4]
                                                 :to_all_contacts false
                                                 :to_all_friends_of_friends false})
          _ (xtdb/sync node)

          ;; Create invite links and mark them as used
          invite-link-id1 (crdt/random-ulid)
          invite-link-id2 (crdt/random-ulid)
          invite-link-id3 (crdt/random-ulid)
          accepted_invite_feed_item_id1 (random-uuid)
          accepted_invite_feed_item_id2 (random-uuid)
          accepted_invite_feed_item_id3 (random-uuid)

          invitee1-args {:by-uid inviter
                         :to-uid invitee1
                         :now now
                         :invite_link_id invite-link-id1
                         :accepted_invite_feed_item_id accepted_invite_feed_item_id1}
          ;; we look at what the txn does
          invitee1-txn (db.contacts/invite-contact-txn node {:args invitee1-args})

          ;; Execute the invite-contact transactions
          _ (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args invitee1-args}]])
          _ (xtdb/sync node)

          invitee2-args {:by-uid inviter
                         :to-uid invitee2
                         :now now
                         :invite_link_id invite-link-id2
                         :accepted_invite_feed_item_id accepted_invite_feed_item_id2}
          invitee2-txn (db.contacts/invite-contact-txn node {:args invitee2-args})

          _ (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args invitee2-args}]])
          _ (xtdb/sync node)

          ;; Now invitee3 is invited by invitee1 (making them a friend of a friend)
          invitee3-args {:by-uid invitee1
                         :to-uid invitee3
                         :now now
                         :invite_link_id invite-link-id3
                         :accepted_invite_feed_item_id accepted_invite_feed_item_id3}
          invitee3-txn (db.contacts/invite-contact-txn node {:args invitee3-args})

          _ (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args invitee3-args}]])
          _ (xtdb/sync node)

          ;; Get the final state
          db (xtdb/db node)
          inviter-contacts (db.contacts/by-uid db inviter)
          invitee1-contacts (db.contacts/by-uid db invitee1)
          invitee2-contacts (db.contacts/by-uid db invitee2)
          invitee3-contacts (db.contacts/by-uid db invitee3)
          inviter-discussions (crdt.discussion/->value (db.discussion/by-id db inviter-did1))
          invitee1-discussions (crdt.discussion/->value (db.discussion/by-id db invitee1-did1))
          invitee2-discussions (crdt.discussion/->value (db.discussion/by-id db invitee2-did1))
          invitee3-discussions (crdt.discussion/->value (db.discussion/by-id db invitee3-did1))
          invitee3-contacts-only-discussion (crdt.discussion/->value (db.discussion/by-id db invitee3-did2))
          invitee3-selected-users-discussion (crdt.discussion/->value (db.discussion/by-id db invitee3-did3))
          contacts-only-discussion (crdt.discussion/->value (db.discussion/by-id db inviter-did3))]

      ;; Test that contacts were created
      (is (contains? (:contacts/ids inviter-contacts) invitee1)
          "Inviter should have invitee1 as contact")
      (is (contains? (:contacts/ids inviter-contacts) invitee2)
          "Inviter should have invitee2 as contact")
      (is (contains? (:contacts/ids invitee1-contacts) inviter)
          "Invitee1 should have inviter as contact")
      (is (contains? (:contacts/ids invitee2-contacts) inviter)
          "Invitee2 should have inviter as contact")
      (is (contains? (:contacts/ids invitee1-contacts) invitee3)
          "Invitee1 should have invitee3 as contact")
      (is (contains? (:contacts/ids invitee3-contacts) invitee1)
          "Invitee3 should have invitee1 as contact")

      ;; Test that discussions were shared
      (is (contains? (:discussion/members inviter-discussions) invitee1)
          "Invitee1 should be a member of inviter's discussion")
      (is (contains? (:discussion/members inviter-discussions) invitee2)
          "Invitee2 should be a member of inviter's discussion")
      (is (contains? (:discussion/members invitee1-discussions) inviter)
          "Inviter should be a member of invitee1's discussion")
      (is (contains? (:discussion/members invitee2-discussions) inviter)
          "Inviter should be a member of invitee2's discussion")

      ;; Test that invitees can see each other's discussions (friends of friends)
      (is (contains? (:discussion/members invitee1-discussions) invitee2)
          "Invitee2 should be a member of invitee1's discussion (friends of friends)")
      (is (contains? (:discussion/members invitee2-discussions) invitee1)
          "Invitee1 should be a member of invitee2's discussion (friends of friends)")

      ;; Test that contacts-only discussion is shared with contacts but not friends of friends
      (is (contains? (:discussion/members contacts-only-discussion) invitee1)
          "Invitee1 should be a member of inviter's contacts-only discussion")
      (is (contains? (:discussion/members contacts-only-discussion) invitee2)
          "Invitee2 should be a member of inviter's contacts-only discussion")
      (is (not (contains? (:discussion/members contacts-only-discussion) invitee3))
          "Invitee3 should NOT be a member of inviter's contacts-only discussion (friend of friend)")

      (testing "friends of friends have the right level of access to the discussions of the invitee (invitee3)"
        (is (= #{invitee1 invitee2 invitee3 inviter} (:discussion/members invitee3-discussions)))
        (is (= #{invitee1 invitee2 invitee3} (:discussion/members invitee3-contacts-only-discussion)))
        (is (= #{invitee3 invitee4} (:discussion/members invitee3-selected-users-discussion))))

      (testing "check the transaction has the operations you expect"

        (let [force-contact-txn [:xtdb.api/fn :gatz.db.contacts/add-contacts]]
          (is (same-operation? force-contact-txn (first invitee1-txn)))
          (is (same-operation? force-contact-txn (first invitee2-txn)))
          (is (same-operation? force-contact-txn (first invitee3-txn))))))))

