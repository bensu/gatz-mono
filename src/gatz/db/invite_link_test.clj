(ns gatz.db.invite-link-test
  (:require [crdt.core :as crdt]
            [clojure.set :as set]
            [com.biffweb :as biff]
            [clojure.test :as t :refer [deftest testing is]]
            [gatz.db.feed :as db.feed]
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
    (if (map? a2)
      (let [relevant-ks (keys a2)]
        (and (= a1 b1) (= a2 (select-keys b2 relevant-ks))))
      (and (= a1 b1) (= a2 b2)))))

(deftest invite-contact
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
          inviter #uuid "432204f5-772b-45c6-a4b8-37757e0d4684"
          invitee1 #uuid "6d54c0c0-9953-4feb-bfd3-3965d21663dd"
          invitee2 #uuid "feced437-1e1d-4499-93e5-b905f35bb206"
          invitee3 #uuid "fde8361d-3ea4-4398-a6ae-b0af339db74f"
          invitee4 #uuid "3ab57e3e-e6db-45b2-8447-45d222bf4e3e"
          now (Date.)

          ;; Create the users
          _ (db.user/create-user! ctx {:id inviter :username "inviter" :phone "+14159499000" :now now})
          _ (db.user/create-user! ctx {:id invitee1 :username "invitee1" :phone "+14159499001" :now now})
          _ (db.user/create-user! ctx {:id invitee2 :username "invitee2" :phone "+14159499002" :now now})
          _ (db.user/create-user! ctx {:id invitee3 :username "invitee3" :phone "+14159499003" :now now})
          _ (db.user/create-user! ctx {:id invitee4 :username "invitee4" :phone "+14159499004" :now now})
          _ (xtdb/sync node)

          ;; final state should be:
          ;; inviter -> invitee2, 
          ;;            invitee1 -> invitee3, 
          ;;                        invitee3 -> invitee4
          inviter-friends #{invitee1 invitee2}
          inviter-fofs #{invitee3}
          invitee1-friends #{inviter invitee3}
          invitee1-fofs #{invitee2 invitee4}
          invitee2-friends #{inviter}
          invitee2-fofs #{invitee1}
          invitee3-friends #{invitee1 invitee4}
          invitee3-fofs #{inviter}
          invitee4-friends #{invitee3}
          invitee4-fofs #{invitee1}

          _ (db.contacts/force-contacts! ctx invitee3 invitee4)

          inviter-did1 #uuid "5ca2de5c-0f2a-47bc-bb2d-d2224f088087"
          inviter-did2 #uuid "e1c7e2f9-5510-4915-98c7-ea5a91eb5e97"
          inviter-did3 #uuid "131e82e0-7611-4fe6-9d15-5e9a58b20408"
          invitee1-did1 #uuid "ebc17fa3-d7d0-4d75-b965-eced36fe733e"
          invitee1-did2 #uuid "29fa58a7-351b-4d57-9125-f11a2574cd7d"
          invitee2-did1 #uuid "fb9aa3da-0783-4f36-b825-d38a534aa89d"
          invitee2-did2 #uuid "1f07105b-6420-4df2-822b-4a54b6f9c3a2"
          invitee3-did1 #uuid "15c5e79c-22fd-4649-9330-f6b39972fc51"
          invitee3-did2 #uuid "92ccc075-3d4d-4a1d-b2cc-0fe76c72ca58"
          invitee3-did3 #uuid "6fa0612d-8379-43ab-b90e-6cbc51e6033b"

          ;; Create some open discussions for inviter
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did1
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter 1 to contacts (not friends)"
                                                 :to_all_contacts true})
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did2
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter to friends of friends"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends true})

          ;; Create a discussion that's only shared with contacts
          _ (db/create-discussion-with-message! (get-ctx inviter)
                                                {:did inviter-did3
                                                 :created_by inviter
                                                 :now now
                                                 :text "Hello from inviter 3 (contacts only)"
                                                 :to_all_contacts true
                                                 :to_all_friends_of_friends false})

          ;; Create some open discussions for invitee1

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
          accepted_invite_feed_item_id1 (random-uuid)
          accepted_invite_feed_item_id2 (random-uuid)

          ;; inviter <-> invitee1
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

          ;; inviter <-> invitee2
          invitee2-args {:by-uid inviter
                         :to-uid invitee2
                         :now now
                         :invite_link_id invite-link-id2
                         :accepted_invite_feed_item_id accepted_invite_feed_item_id2}
          invitee2-txn (db.contacts/invite-contact-txn node {:args invitee2-args})

          _ (biff/submit-tx ctx [[:xtdb.api/fn :gatz.db.contacts/invite-contact {:args invitee2-args}]])
          _ (xtdb/sync node)

          ;; Now invitee1 sends a contact request to invitee3
          _ (db.contacts/request-contact! (get-ctx invitee1) {:from invitee1
                                                              :to invitee3
                                                              :feed_item_id (random-uuid)})
          _ (xtdb/sync node)
          db (xtdb/db node)
          cr (db.contacts/current-request-between db invitee1 invitee3)
          _ (assert cr)
          _ (db.contacts/accept-request! (get-ctx invitee3) {:by invitee3
                                                             :from invitee1
                                                             :to invitee3})

          _ (xtdb/sync node)

          ;; Get the final state
          db (xtdb/db node)
          inviter-contacts (db.contacts/by-uid db inviter)
          invitee1-contacts (db.contacts/by-uid db invitee1)
          invitee2-contacts (db.contacts/by-uid db invitee2)
          invitee3-contacts (db.contacts/by-uid db invitee3)
          invitee4-contacts (db.contacts/by-uid db invitee4)

          inviter-d-friends-only (crdt.discussion/->value (db.discussion/by-id db inviter-did1))
          inviter-d-fofs (crdt.discussion/->value (db.discussion/by-id db inviter-did2))

          invitee1-d-fofs (crdt.discussion/->value (db.discussion/by-id db invitee1-did1))
          invitee2-d-fofs (crdt.discussion/->value (db.discussion/by-id db invitee2-did1))

          invitee3-d-fofs (crdt.discussion/->value (db.discussion/by-id db invitee3-did1))
          invitee3-friends-only-discussion (crdt.discussion/->value (db.discussion/by-id db invitee3-did2))
          invitee3-selected-users-discussion (crdt.discussion/->value (db.discussion/by-id db invitee3-did3))
          inviter-d-friends (crdt.discussion/->value (db.discussion/by-id db inviter-did3))]

      (testing "people are each others contacts as expected"
        (is (= #{invitee1 invitee2}
               inviter-friends
               (:contacts/ids inviter-contacts)))
        (is (= #{inviter invitee3}
               invitee1-friends
               (:contacts/ids invitee1-contacts)))
        (is (= #{inviter}
               invitee2-friends
               (:contacts/ids invitee2-contacts)))
        (is (= #{invitee1 invitee4}
               invitee3-friends
               (:contacts/ids invitee3-contacts)))
        (is (= #{invitee3}
               invitee4-friends
               (:contacts/ids invitee4-contacts))))

      (testing "The discussions we think are open, are open"

        (is (= #{inviter-did1 inviter-did2 inviter-did3}
               (db.discussion/open-for-friend db inviter {:now now})))
        (is (= #{invitee1-did1 invitee1-did2}
               (db.discussion/open-for-friend db invitee1 {:now now})))
        (is (= #{invitee2-did1 invitee2-did2}
               (db.discussion/open-for-friend db invitee2 {:now now})))
        (is (= #{invitee3-did1 invitee3-did2}
               (db.discussion/open-for-friend db invitee3 {:now now})))
        (is (= #{} (db.discussion/open-for-friend db invitee4 {:now now})))

        ;; inviter is friends with invitee1 and invitee2
        (is (= (set/union #{invitee1-did1 invitee1-did2}
                          #{invitee2-did1 invitee2-did2})
               (db.discussion/open-from-my-friends-to-fofs db inviter {:now now})))

        ;; invitee2 is friends with inviter
        (is (= #{inviter-did2}
               (db.discussion/open-from-my-friends-to-fofs db invitee2 {:now now})))

         ;; invitee3 is friends with invitee1 and invitee4
        (is (= (set/union #{invitee1-did1 invitee1-did2} #{})
               (db.discussion/open-from-my-friends-to-fofs db invitee3 {:now now})))

        ;; invitee4 is friends with invitee3
        (is (= #{invitee3-did1} (db.discussion/open-from-my-friends-to-fofs db invitee4 {:now now}))))

      ;; Test that discussions were shared
      (testing "the discussions have the right members"

        (is (= :discussion.member_mode/open (:discussion/member_mode inviter-d-friends-only)))
        (is (= inviter-friends
               (disj (:discussion/members inviter-d-friends-only) inviter)))

        (is (= :discussion.member_mode/friends_of_friends (:discussion/member_mode inviter-d-fofs)))
        (is (= (set/union inviter-friends inviter-fofs)
               (disj (:discussion/members inviter-d-fofs) inviter)))

        (is (= :discussion.member_mode/open (:discussion/member_mode inviter-d-friends)))
        (is (= inviter-friends
               (disj (:discussion/members inviter-d-friends) inviter)))

        (is (= :discussion.member_mode/friends_of_friends (:discussion/member_mode invitee1-d-fofs)))
        (is (= (set/union invitee1-friends invitee1-fofs)
               (disj (:discussion/members invitee1-d-fofs) invitee1)))

        (is (= :discussion.member_mode/friends_of_friends (:discussion/member_mode invitee2-d-fofs)))
        (is (= (set/union invitee2-friends invitee2-fofs)
               (disj (:discussion/members invitee2-d-fofs) invitee2)))

        (is (= :discussion.member_mode/friends_of_friends (:discussion/member_mode invitee3-d-fofs)))
        (is (= (set/union invitee3-friends invitee3-fofs)
               (disj (:discussion/members invitee3-d-fofs) invitee3)))

        (is (= :discussion.member_mode/open (:discussion/member_mode invitee3-friends-only-discussion)))
        (is (= invitee3-friends
               (disj (:discussion/members invitee3-friends-only-discussion) invitee3)))

        (is (= :discussion.member_mode/closed (:discussion/member_mode invitee3-selected-users-discussion)))
        (is (= #{invitee4}
               (disj (:discussion/members invitee3-selected-users-discussion) invitee3))))

      (testing "the feed items were created"

        (let [->dids (fn [feed-items]
                       (->> feed-items
                            (filter #(and (= :gatz/discussion (:feed/ref_type %))
                                          (= :feed.type/new_post (:feed/feed_type %))))
                            (map (comp :xt/id :feed/ref))
                            set))]
          ;; inviter is friends with invitee1 and invitee2
          ;; inviter is fof with invitee3
          (is (= (set/union #{inviter-did1 inviter-did2 inviter-did3}
                            #{invitee1-did1 invitee1-did2
                              invitee2-did1 invitee2-did2}
                            #{invitee3-did1})
                 (->dids (db.feed/for-user-with-ts db inviter))))

          ;; invitee1 is friends with inviter and invitee3
          ;; invitee1 is fof with invitee2 and invitee4
          (is (= (set/union #{invitee1-did1 invitee1-did2}
                            #{inviter-did1 inviter-did2 inviter-did3}
                            #{invitee2-did1 invitee2-did2}
                            #{invitee3-did1 invitee3-did2})
                 (->dids (db.feed/for-user-with-ts db invitee1))))

          ;; invitee2 is friends with inviter
          ;; invitee2 is fof with invitee1
          (is (= (set/union #{invitee2-did1 invitee2-did2}
                            #{inviter-did1 inviter-did2 inviter-did3}
                            #{invitee1-did1 invitee1-did2})
                 (->dids (db.feed/for-user-with-ts db invitee2))))

          ;; invitee3 is friends with invitee1 and invitee4
          ;; invitee3 is fof with inviter
          (is (= (set/union #{invitee3-did1 invitee3-did2 invitee3-did3}
                            #{invitee1-did1 invitee1-did2}
                            #{inviter-did2})
                 (->dids (db.feed/for-user-with-ts db invitee3))))

          ;; invitee4 is friends with invitee3
          ;; invitee4 is fof with invitee1
          (is (= (set/union #{invitee3-did1 invitee3-did2 invitee3-did3}
                            #{invitee1-did1 invitee1-did2})
                 (->dids (db.feed/for-user-with-ts db invitee4))))))

      (testing "check the transaction has the operations you expect"
        (let [force-contact-txn [:xtdb.api/fn :gatz.db.contacts/add-contacts]
              expected-fi-txn [:xtdb.api/put {:db/type :gatz/feed_item
                                              :feed/ref_type :gatz/invite_link
                                              :feed/feed_type :feed.type/accepted_invite}]
              expected-evt-txn [:xtdb.api/put {:db/type :gatz/evt
                                               :evt/type :feed_item/new}]
              expected-did-txn [:xtdb.api/fn :gatz.db.discussion/apply-delta]
              expected-d-fi-txn [:xtdb.api/put {:db/type :gatz/feed_item
                                                :feed/ref_type :gatz/discussion
                                                :feed/feed_type :feed.type/new_post}]
              expected-d-evt-txn [:xtdb.api/put {:db/type :gatz/evt
                                                 :evt/type :feed_item/new}]]
          (let [[fc-txn fi-txn fi-evt & rest-txns] invitee1-txn
                ;; by the time that invitee1 accepted the inviter's invite, they could only access
                ;; inviter's discussions
                n-friend-access-txns (count (set/union #{inviter-did1 inviter-did2 inviter-did3}))
                friend-did-txns (take n-friend-access-txns (partition 3 rest-txns))
                fof-did-txns (partition 2 (drop (* 3 n-friend-access-txns) rest-txns))]
            (is (same-operation? force-contact-txn fc-txn))
            (is (same-operation? expected-fi-txn fi-txn))
            (is (same-operation? expected-evt-txn fi-evt))
            (doseq [[d-fi-txn fi-evt-txn did-txn] friend-did-txns]
              ;; TODO: the ts for d-fi-txn should be the same as the discussions created_by
              (is (same-operation? expected-d-fi-txn d-fi-txn))
              (is (same-operation? expected-d-evt-txn fi-evt-txn))
              (is (same-operation? expected-did-txn did-txn)))
            (doseq [[d-fi-txn did-txn] fof-did-txns]
              (is (same-operation? expected-d-fi-txn d-fi-txn))
              (is (same-operation? expected-did-txn did-txn))))

          (let [[fc-txn fi-txn fi-evt & rest-txns] invitee2-txn
                ;; by the time that invitee2 accepted the inviter's invite, they could access
                ;; inviter's discussions and invitee1's discussions through fofs
                n-friend-access-txns (count (set/union #{inviter-did1 inviter-did2 inviter-did3}
                                                       #{invitee1-did1 invitee1-did2}))
                friend-did-txns (take n-friend-access-txns (partition 3 rest-txns))
                fof-did-txns (partition 2 (drop (* 3 n-friend-access-txns) rest-txns))]
            (is (same-operation? force-contact-txn fc-txn))
            (is (same-operation? expected-fi-txn fi-txn))
            (is (same-operation? expected-evt-txn fi-evt))
            (doseq [[d-fi-txn fi-evt-txn did-txn] friend-did-txns]
              ;; TODO: the ts for d-fi-txn should be the same as the discussions created_by
              (is (same-operation? expected-d-fi-txn d-fi-txn))
              (is (same-operation? expected-d-evt-txn fi-evt-txn))
              (is (same-operation? expected-did-txn did-txn)))
            (doseq [[d-fi-txn did-txn] fof-did-txns]
              (is (same-operation? expected-d-fi-txn d-fi-txn))
              (is (same-operation? expected-did-txn did-txn)))))))))

