(ns gatz.db-test
  (:require [clojure.test :refer [deftest is testing]]
            [crdt.core :as crdt]
            [gatz.db :as db]
            [gatz.db.media :as db.media]
            [gatz.crdt.message :as crdt.message]
            [gatz.crdt.discussion :as crdt.discussion]
            [gatz.db.group :as db.group]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [link-preview.core :as link-preview]
            [xtdb.api :as xtdb]
            [gatz.db.contacts :as db.contacts])
  (:import [java.util Date]))

(deftest test-parse-create-discussion-params
  (testing "Basic text-only message"
    (is (= {:text "hello"
            :to_all_contacts true
            :to_all_friends_of_friends false}
           (db/parse-create-params {:text "hello"
                                    :to_all_contacts true}))))

  (testing "Message with name"
    (is (= {:name "Test Discussion"
            :text "hello"
            :to_all_contacts true
            :to_all_friends_of_friends false}
           (db/parse-create-params {:name "Test Discussion  "
                                    :text "hello  "
                                    :to_all_contacts true}))))

  (testing "Message with group"
    (let [group-id (crdt/random-ulid)]
      (is (= {:text "hello"
              :group_id group-id
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :group_id (str group-id)
                                      :to_all_contacts true})))))

  (testing "Message with single media (deprecated)"
    (let [media-id (random-uuid)]
      (is (= {:text "hello"
              :media_ids [media-id]
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :media_id (str media-id)
                                      :to_all_contacts true})))))

  (testing "Message with multiple media"
    (let [media-ids [(random-uuid) (random-uuid)]]
      (is (= {:text "hello"
              :media_ids media-ids
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :to_all_contacts true
                                      :media_ids (mapv str media-ids)})))))

  (testing "Message with link previews"
    (let [preview-ids [(random-uuid) (random-uuid)]]
      (is (= {:text "hello"
              :link_previews preview-ids
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :to_all_contacts true
                                      :link_previews (mapv str preview-ids)})))))

  (testing "Message with originally-from"
    (let [did (random-uuid)
          mid (random-uuid)]
      (is (= {:text "hello"
              :originally_from {:did did
                                :mid mid}
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :originally_from {:did (str did)
                                                        :mid (str mid)}
                                      :to_all_contacts true})))))

  (testing "Message with selected users"
    (let [user-ids [(random-uuid) (random-uuid)]]
      (is (= {:text "hello"
              :selected_users (set user-ids)
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text "hello"
                                      :selected_users (mapv str user-ids)})))))

  (testing "Message to all contacts"
    (is (= {:text "hello"
            :to_all_contacts true
            :to_all_friends_of_friends false}
           (db/parse-create-params {:text "hello"
                                    :to_all_contacts true}))))

  (testing "Empty text with media is valid"
    (let [media-ids [(random-uuid) (random-uuid)]]
      (is (= {:text ""
              :media_ids media-ids
              :to_all_contacts true
              :to_all_friends_of_friends false}
             (db/parse-create-params {:text ""
                                      :media_ids (mapv str media-ids)
                                      :to_all_contacts true})))))

  (testing "Invalid cases"
    (testing "Empty text without media"
      (is (thrown? AssertionError
                   (db/parse-create-params {:text ""
                                            :to_all_contacts true}))))

    (testing "Missing required recipient specification"
      (is (thrown? AssertionError
                   (db/parse-create-params {:text "hello"}))))

    (testing "Invalid originally-from (missing mid)"
      (is (thrown? IllegalArgumentException
                   (db/parse-create-params {:text "hello"
                                            :originally_from {:did "550e8400-e29b-41d4-a716-446655440000"}
                                            :to_all_contacts true}))))))

(deftest test-parse-create-message-params
  (let [uuid1 #uuid "550e8400-e29b-41d4-a716-446655440000"
        uuid2 #uuid "650e8400-e29b-41d4-a716-446655440000"]

    (testing "Basic text-only message"
      (is (= {:text "hello"
              :media_ids []
              :link_previews []}
             (db/parse-create-message-params {:text "hello"}))))

    (testing "Message with ID"
      (is (= {:text "hello"
              :media_ids []
              :link_previews []
              :mid uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :id (str uuid1)}))))

    (testing "Message with discussion ID"
      (is (= {:text "hello"
              :media_ids []
              :link_previews []
              :did uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :discussion_id (str uuid1)}))))

    (testing "Message with single media (deprecated)"
      (is (= {:text "hello"
              :link_previews []
              :media_ids [uuid1]}
             (db/parse-create-message-params {:text "hello"
                                              :media_id (str uuid1)}))))

    (testing "Message with multiple media"
      (is (= {:text "hello"
              :link_previews []
              :media_ids [uuid1 uuid2]}
             (db/parse-create-message-params {:text "hello"
                                              :media_ids [(str uuid1)
                                                          (str uuid2)]}))))

    (testing "Message with link previews"
      (is (= {:text "hello"
              :media_ids []
              :link_previews [uuid1]}
             (db/parse-create-message-params {:text "hello"
                                              :link_previews [(str uuid1)]}))))

    (testing "Message with reply_to"
      (is (= {:text "hello"
              :media_ids []
              :link_previews []
              :reply_to uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :reply_to (str uuid1)}))))

    (testing "Message with all optional fields"
      (is (= {:text "hello"
              :mid uuid1
              :did uuid2
              :media_ids [uuid1]
              :link_previews [uuid2]
              :reply_to uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :id (str uuid1)
                                              :discussion_id (str uuid2)
                                              :media_ids [(str uuid1)]
                                              :link_previews [(str uuid2)]
                                              :reply_to (str uuid1)}))))

    (testing "Invalid UUID strings are ignored"
      (is (= {:text "hello"
              :mid nil
              :reply_to nil
              :did nil
              :media_ids []
              :link_previews []}
             (db/parse-create-message-params {:text "hello"
                                              :id "not-a-uuid"
                                              :discussion_id "invalid"
                                              :media_ids ["bad-uuid"]
                                              :link_previews ["also-bad"]
                                              :reply_to "nope"}))))))

(def link-preview-data
  #:link_preview{:host "github.com",
                 :images
                 [#:link_preview{:uri
                                 #java/uri "https://opengraph.githubassets.com/1a438532909851015f0d4fc289a48a2865d595f8033e632c3d2d8420a28ecb53/rauhs/klang",
                                 :width 1200,
                                 :height 600}],
                 :media_type "object",
                 :title
                 "GitHub - rauhs/klang: Clojurescript logging library",
                 :favicons
                 #{#java/uri "https://github.githubassets.com/favicons/favicon.svg"},
                 :description
                 "Clojurescript logging library. Contribute to rauhs/klang development by creating an account on GitHub.",
                 :site_name "GitHub",
                 :videos [],
                 :url "https://github.com",
                 :html nil,
                 :uri #java/uri "https://github.com"})

(deftest test-create-message!
  (let [user-id #uuid "550e8400-e29b-41d4-a716-446655440000"
        did #uuid "650e8400-e29b-41d4-a716-446655440000"
        now (Date.)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn []
                  (assoc ctx
                         :auth/user-id user-id
                         :biff/db (xtdb/db node)))]

    (db.user/create-user! (get-ctx) {:id user-id :username "test" :phone "+14159499000" :now now})
    (xtdb/sync node)

    (db/create-discussion-with-message! (get-ctx) {:did did :text "hello" :to_all_contacts true :now now})

    (testing "Basic text-only message"
      (let [params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)})
            result (db/create-message! (get-ctx) (assoc params :now now))
            message (crdt.message/->value result)]
        (is (uuid? (:xt/id message)))
        (is (= "hello" (:message/text message)))
        (is (= did (:message/did message)))))

    (testing "Message with made up media"
      (let [media-id #uuid "750e8400-e29b-41d4-a716-446655440000"
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :media_ids [(str media-id)]})]
        (is (thrown? AssertionError
                     (db/create-message! (get-ctx) (assoc params :now now))))))

    (testing "Message with media"
      (let [media-id #uuid "750e8400-e29b-41d4-a716-446655440000"
            _ (db.media/create-media! (get-ctx) {:id media-id
                                                 :kind :media/img
                                                 :url "https://example.com/image.jpg"
                                                 :now now})
            _ (xtdb/sync node)
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :media_ids [(str media-id)]})
            result (db/create-message! (get-ctx) (assoc params :now now))
            message (crdt.message/->value result)]
        (is (uuid? (:xt/id message)))
        (is (= "hello" (:message/text message)))
        (is (= [media-id] (map :xt/id (:message/media message))))))

    (testing "Message with missing link previews"
      (let [preview-id #uuid "850e8400-e29b-41d4-a716-446655440000"
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :link_previews [(str preview-id)]})]

        (is (thrown? AssertionError
                     (db/create-message! (get-ctx) (assoc params :now now))))))

    (testing "Message with link previews"
      (let [preview-id #uuid "850e8400-e29b-41d4-a716-446655440000"
            _ (link-preview/create! (get-ctx)  (assoc link-preview-data :xt/id preview-id))
            _ (xtdb/sync node)
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :link_previews [(str preview-id)]})
            result (db/create-message! (get-ctx) (assoc params :now now))
            message (crdt.message/->value result)]
        (is (= "hello" (:message/text message)))
        (is (= [preview-id] (map :xt/id (:message/link_previews message))))))

    (testing "Message with missing reply_to"
      (let [reply-to #uuid "950e8400-e29b-41d4-a716-446655440000"
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :reply_to (str reply-to)})]
        (is (thrown? AssertionError
                     (db/create-message! (get-ctx) (assoc params :now now))))))

    (testing "Message with reply_to"
      (let [reply-to-params (db/parse-create-message-params {:text "hello"
                                                             :discussion_id (str did)})
            reply-to-result (db/create-message! (get-ctx) reply-to-params)
            reply-to-message (crdt.message/->value reply-to-result)
            reply-to-id (:xt/id reply-to-message)
            _ (xtdb/sync node)
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :reply_to (str reply-to-id)})
            result (db/create-message! (get-ctx) (assoc params :now now))
            message (crdt.message/->value result)]
        (is (= "hello" (:message/text message)))
        (is (= reply-to-id (:message/reply_to message)))))

    (testing "Message with all optional fields"
      (let [media-id #uuid "750e8400-e29b-41d4-a716-446655440000"
            _ (db.media/create-media! (get-ctx) {:id media-id
                                                 :kind :media/img
                                                 :url "https://example.com/image.jpg"
                                                 :now now})

            preview-id #uuid "850e8400-e29b-41d4-a716-446655440000"
            _ (link-preview/create! (get-ctx)  (assoc link-preview-data :xt/id preview-id))

            reply-to-params (db/parse-create-message-params {:text "hello"
                                                             :discussion_id (str did)})
            reply-to-result (db/create-message! (get-ctx) reply-to-params)
            reply-to-message (crdt.message/->value reply-to-result)
            reply-to-id (:xt/id reply-to-message)

            _ (xtdb/sync node)

            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :media_ids [(str media-id)]
                                                    :link_previews [(str preview-id)]
                                                    :reply_to (str reply-to-id)})
            result (db/create-message! (get-ctx) (assoc params :now now))
            message (crdt.message/->value result)]
        (is (= "hello" (:message/text message)))
        (is (= [media-id] (map :xt/id (:message/media message))))
        (is (= [preview-id] (map :xt/id (:message/link_previews message))))
        (is (= reply-to-id (:message/reply_to message)))))

    (testing "Invalid cases"
      (testing "Missing discussion ID"
        (let [params (db/parse-create-message-params {:text "hello"})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx) (assoc params :now now))))))

      (testing "Invalid media_ids"
        (let [params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :media_ids ["not-a-uuid"]})]
          (is (= [] (:media_ids params)))
          (is (map? (db/create-message! (get-ctx) (assoc params :now now))))))

      (testing "Invalid reply_to"
        (let [params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :reply_to "not-a-uuid"})]
          (is (nil? (:reply_to params)))
          (is (map? (db/create-message! (get-ctx) (assoc params :now now))))))

      (testing "Invalid link_previews"
        (let [params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :link_previews ["not-a-uuid"]})]
          (is (= [] (:link_previews params)))
          (is (map? (db/create-message! (get-ctx) (assoc params :now now))))))

      (testing "Missing text"
        (is (thrown? AssertionError
                     (db/create-message! (get-ctx) {:did did :now now}))))

      (testing "Non-string text"
        (is (thrown? AssertionError
                     (db/create-message! (get-ctx) {:text 123
                                                    :did did
                                                    :now now})))))))

(deftest test-create-message-conditions
  (let [[user-id other-user-id did other-did] (repeatedly 4 random-uuid)
        now (Date.)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn [uid]
                  (assoc ctx
                         :auth/user-id uid
                         :biff/db (xtdb/db node)))]

    ;; Setup test data
    (db.user/create-user! (get-ctx user-id)
                          {:id user-id
                           :username "test"
                           :phone "+14159499000"
                           :now now})
    (db.user/create-user! (get-ctx other-user-id)
                          {:id other-user-id
                           :username "other"
                           :phone "+14159499001"
                           :now now})
    (xtdb/sync node)

    ;; Create two discussions
    (db/create-discussion-with-message! (get-ctx user-id)
                                        {:did did
                                         :text "hello"
                                         :to_all_contacts true
                                         :now now})
    (db/create-discussion-with-message! (get-ctx other-user-id)
                                        {:did other-did
                                         :text "hello"
                                         :to_all_contacts true
                                         :now now})
    (xtdb/sync node)

    (testing "User conditions"
      (testing "Non-existent user"
        (let [non-existent-user #uuid "950e8400-e29b-41d4-a716-446655440000"
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx non-existent-user)
                                           (assoc params :now now))))))

      (testing "User not in discussion"
        (let [params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str other-did)})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now)))))))

    (testing "Discussion conditions"
      (testing "Non-existent discussion"
        (let [non-existent-did #uuid "a50e8400-e29b-41d4-a716-446655440000"
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str non-existent-did)})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now)))))))

    (testing "Reply conditions"
      (testing "Reply to non-existent message"
        (let [non-existent-msg #uuid "b50e8400-e29b-41d4-a716-446655440000"
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :reply_to (str non-existent-msg)})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now))))))

      (testing "Reply to message from different discussion"
        (let [msg-params (db/parse-create-message-params {:text "hello"
                                                          :discussion_id (str other-did)})
              msg-result (db/create-message! (get-ctx other-user-id) msg-params)
              msg (crdt.message/->value msg-result)
              reply-params (db/parse-create-message-params {:text "hello"
                                                            :discussion_id (str did)
                                                            :reply_to (str (:xt/id msg))})]
          (xtdb/sync node)
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc reply-params :now now)))))))

    (testing "Media conditions"
      (testing "Non-existent media"
        (let [non-existent-media #uuid "c50e8400-e29b-41d4-a716-446655440000"
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :media_ids [(str non-existent-media)]})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now))))))

      (testing "Multiple media, one non-existent"
        (let [media-id #uuid "d50e8400-e29b-41d4-a716-446655440000"
              non-existent-media #uuid "e50e8400-e29b-41d4-a716-446655440000"
              _ (db.media/create-media! (get-ctx user-id)
                                        {:id media-id
                                         :kind :media/img
                                         :url "https://example.com/image.jpg"
                                         :now now})
              _ (xtdb/sync node)
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :media_ids [(str media-id)
                                                                  (str non-existent-media)]})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now)))))))

    (testing "Link preview conditions"
      (testing "Non-existent link preview"
        (let [non-existent-preview #uuid "f50e8400-e29b-41d4-a716-446655440000"
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :link_previews [(str non-existent-preview)]})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now))))))

      (testing "Multiple previews, one non-existent"
        (let [preview-id #uuid "150e8400-e29b-41d4-a716-446655440000"
              non-existent-preview #uuid "250e8400-e29b-41d4-a716-446655440000"
              _ (link-preview/create! (get-ctx user-id)
                                      (assoc link-preview-data :xt/id preview-id))
              _ (xtdb/sync node)
              params (db/parse-create-message-params {:text "hello"
                                                      :discussion_id (str did)
                                                      :link_previews [(str preview-id)
                                                                      (str non-existent-preview)]})]
          (is (thrown? AssertionError
                       (db/create-message! (get-ctx user-id)
                                           (assoc params :now now)))))))

    (testing "Valid combinations"
      (let [media-id #uuid "350e8400-e29b-41d4-a716-446655440000"
            preview-id #uuid "450e8400-e29b-41d4-a716-446655440000"
            _ (db.media/create-media! (get-ctx user-id)
                                      {:id media-id
                                       :kind :media/img
                                       :url "https://example.com/image.jpg"
                                       :now now})
            _ (link-preview/create! (get-ctx user-id)
                                    (assoc link-preview-data :xt/id preview-id))
            _ (xtdb/sync node)

            ;; Create a message to reply to
            reply-to-params (db/parse-create-message-params {:text "original"
                                                             :discussion_id (str did)})
            reply-to-result (db/create-message! (get-ctx user-id) reply-to-params)
            reply-to-message (crdt.message/->value reply-to-result)
            reply-to-id (:xt/id reply-to-message)
            _ (xtdb/sync node)

            ;; Create message with all valid references
            params (db/parse-create-message-params {:text "hello"
                                                    :discussion_id (str did)
                                                    :media_ids [(str media-id)]
                                                    :link_previews [(str preview-id)]
                                                    :reply_to (str reply-to-id)})
            result (db/create-message! (get-ctx user-id)
                                       (assoc params :now now))
            message (crdt.message/->value result)]

        (is (= "hello" (:message/text message)))
        (is (= [media-id] (map :xt/id (:message/media message))))
        (is (= [preview-id] (map :xt/id (:message/link_previews message))))
        (is (= reply-to-id (:message/reply_to message)))))))

(deftest test-create-discussion-with-message!
  (let [user-id (random-uuid)
        other-user-id (random-uuid)
        third-user-id (random-uuid)
        now (Date.)
        ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        get-ctx (fn [uid]
                  (assoc ctx
                         :auth/user-id uid
                         :biff/db (xtdb/db node)))]

    ;; Setup test data
    (db.user/create-user! (get-ctx user-id)
                          {:id user-id
                           :username "test"
                           :phone "+14159499000"
                           :now now})
    (db.user/create-user! (get-ctx other-user-id)
                          {:id other-user-id
                           :username "other"
                           :phone "+14159499001"
                           :now now})
    (db.user/create-user! (get-ctx third-user-id)
                          {:id third-user-id
                           :username "third"
                           :phone "+14159499002"
                           :now now})
    (xtdb/sync node)
    (db.contacts/force-contacts! (get-ctx user-id) user-id other-user-id)
    (db.contacts/force-contacts! (get-ctx user-id) user-id third-user-id)
    (xtdb/sync node)

    (testing "Basic text-only message"
      (let [{:keys [discussion message]}
            (db/create-discussion-with-message!
             (get-ctx user-id)
             {:text "hello"
              :to_all_contacts true
              :now now})
            discussion (crdt.discussion/->value discussion)
            message (crdt.message/->value message)]
        (is (uuid? (:xt/id discussion)))
        (is (= "hello" (:message/text message)))
        (is (= #{user-id other-user-id third-user-id} (:discussion/members discussion)))
        (is (= :discussion.member_mode/open
               (:discussion/member_mode discussion)))))

    (testing "Message with group"
      (let [group-id (crdt/random-ulid)
            _ (db.group/create! (get-ctx user-id)
                                {:id group-id
                                 :name "Test Group"
                                 :owner user-id
                                 :members #{user-id}
                                 :now now})
            _ (xtdb/sync node)
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :group_id (str group-id)
                     :to_all_contacts true
                     :now now})
            discussion (crdt.discussion/->value (:discussion result))
            message (crdt.message/->value (:message result))]
        (is (= group-id (:discussion/group_id discussion)))
        (is (= #{user-id} (:discussion/members discussion)))
        (is (= "hello" (:message/text message)))))

    (testing "Message with single media (deprecated)"
      (let [media-id (random-uuid)
            _ (db.media/create-media! (get-ctx user-id)
                                      {:id media-id
                                       :kind :media/img
                                       :url "https://example.com/image.jpg"
                                       :now now})
            _ (xtdb/sync node)
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :media_id (str media-id)
                     :to_all_contacts true
                     :now now})
            message (crdt.message/->value (:message result))]
        (is (= [media-id] (map :xt/id (:message/media message))))))

    (testing "Message with multiple media"
      (let [media-ids [(random-uuid) (random-uuid)]
            _ (doseq [media-id media-ids]
                (db.media/create-media! (get-ctx user-id)
                                        {:id media-id
                                         :kind :media/img
                                         :url "https://example.com/image.jpg"
                                         :now now}))
            _ (xtdb/sync node)
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :to_all_contacts true
                     :media_ids (mapv str media-ids)
                     :now now})
            message (crdt.message/->value (:message result))]
        (is (= (set media-ids) (set (map :xt/id (:message/media message)))))))

    (testing "Message with link previews"
      (let [preview-ids [(random-uuid)]
            _ (doseq [preview-id preview-ids]
                (link-preview/create! (get-ctx user-id)
                                      (assoc link-preview-data :xt/id preview-id)))
            _ (xtdb/sync node)
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :to_all_contacts true
                     :link_previews (mapv str preview-ids)
                     :now now})
            message (crdt.message/->value (:message result))]
        (is (= preview-ids (map :xt/id (:message/link_previews message))))))

    (testing "Message with originally-from"
      (let [original-did (random-uuid)
            original-result (db/create-discussion-with-message!
                             (get-ctx user-id)
                             {:did original-did
                              :text "original"
                              :to_all_contacts true
                              :now now})
            original-mid (:xt/id (:message original-result))
            _ (xtdb/sync node)

            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :originally_from {:did (str original-did)
                                       :mid (str original-mid)}
                     :to_all_contacts true
                     :now now})
            discussion (crdt.discussion/->value (:discussion result))]
        (is (= {:did original-did :mid original-mid}
               (:discussion/originally_from discussion)))))

    (testing "Message with selected users"
      (let [user-ids [user-id other-user-id]
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text "hello"
                     :selected_users (mapv str user-ids)
                     :now now})
            discussion (crdt.discussion/->value (:discussion result))]
        (is (= (set user-ids) (:discussion/members discussion)))
        (is (= :discussion.member_mode/closed
               (:discussion/member_mode discussion)))))

    (testing "Empty text with media is valid"
      (let [media-ids [#uuid "550e8400-e29b-41d4-a716-446655440000"]
            _ (doseq [media-id media-ids]
                (db.media/create-media! (get-ctx user-id)
                                        {:id media-id
                                         :kind :media/img
                                         :url "https://example.com/image.jpg"
                                         :now now}))
            _ (xtdb/sync node)
            result (db/create-discussion-with-message!
                    (get-ctx user-id)
                    {:text ""
                     :media_ids (mapv str media-ids)
                     :to_all_contacts true
                     :now now})
            message (crdt.message/->value (:message result))]
        (is (= "" (:message/text message)))
        (is (= media-ids (map :xt/id (:message/media message))))))

    (testing "Invalid cases"
      (testing "Empty text without media"
        (is (thrown? AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx user-id)
                      {:text ""
                       :to_all_contacts true
                       :now now}))))

      (testing "Missing required recipient specification"
        (is (thrown? AssertionError
                     (db/create-discussion-with-message!
                      (get-ctx user-id)
                      {:text "hello"
                       :now now}))))

      (testing "Invalid originally-from (missing mid)"
        (is (thrown? IllegalArgumentException
                     (db/create-discussion-with-message!
                      (get-ctx user-id)
                      {:text "hello"
                       :originally_from {:did "550e8400-e29b-41d4-a716-446655440000"}
                       :to_all_contacts true
                       :now now})))))))

