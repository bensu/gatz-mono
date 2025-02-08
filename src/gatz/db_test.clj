(ns gatz.db-test
  (:require [clojure.test :refer [deftest is testing]]
            [gatz.db :as db]
            [gatz.db.media :as db.media]
            [gatz.crdt.message :as crdt.message]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [link-preview.core :as link-preview]
            [xtdb.api :as xtdb])
  (:import [java.util Date]))

(deftest test-parse-create-params
  (testing "Basic text-only message"
    (is (= {:text "hello" :to_all_contacts true}
           (db/parse-create-params {:text "hello"
                                    :to_all_contacts true}))))

  (testing "Message with name"
    (is (= {:name "Test Discussion"
            :text "hello"
            :to_all_contacts true}
           (db/parse-create-params {:name "Test Discussion  "
                                    :text "hello  "
                                    :to_all_contacts true}))))

  (testing "Message with group"
    (let [group-id #crdt/ulid "01HQ7YXKB9P5RJ0K1HY3TQXJ8N"]
      (is (= {:text "hello"
              :group_id group-id
              :to_all_contacts true}
             (db/parse-create-params {:text "hello"
                                      :group_id (str group-id)
                                      :to_all_contacts true})))))

  (testing "Message with single media (deprecated)"
    (let [media-id #uuid "550e8400-e29b-41d4-a716-446655440000"]
      (is (= {:text "hello"
              :media_ids [media-id]
              :to_all_contacts true}
             (db/parse-create-params {:text "hello"
                                      :media_id (str media-id)
                                      :to_all_contacts true})))))

  (testing "Message with multiple media"
    (let [media-ids [#uuid "550e8400-e29b-41d4-a716-446655440000"
                     #uuid "650e8400-e29b-41d4-a716-446655440000"]]
      (is (= {:text "hello"
              :media_ids media-ids
              :to_all_contacts true}
             (db/parse-create-params {:text "hello"
                                      :to_all_contacts true
                                      :media_ids (mapv str media-ids)})))))

  (testing "Message with link previews"
    (let [preview-ids [#uuid "550e8400-e29b-41d4-a716-446655440000"]]
      (is (= {:text "hello"
              :link_previews preview-ids
              :to_all_contacts true}
             (db/parse-create-params {:text "hello"
                                      :to_all_contacts true
                                      :link_previews (mapv str preview-ids)})))))

  (testing "Message with originally-from"
    (let [did #uuid "550e8400-e29b-41d4-a716-446655440000"
          mid #uuid "650e8400-e29b-41d4-a716-446655440000"]
      (is (= {:text "hello"
              :originally_from {:did did
                                :mid mid}
              :to_all_contacts true}
             (db/parse-create-params {:text "hello"
                                      :originally_from {:did (str did)
                                                        :mid (str mid)}
                                      :to_all_contacts true})))))

  (testing "Message with selected users"
    (let [user-ids [#uuid "550e8400-e29b-41d4-a716-446655440000"
                    #uuid "650e8400-e29b-41d4-a716-446655440000"]]
      (is (= {:text "hello"
              :selected_users (set user-ids)}
             (db/parse-create-params {:text "hello"
                                      :selected_users (mapv str user-ids)})))))

  (testing "Message to all contacts"
    (is (= {:text "hello"
            :to_all_contacts true}
           (db/parse-create-params {:text "hello"
                                    :to_all_contacts true}))))

  (testing "Empty text with media is valid"
    (let [media-ids [#uuid "550e8400-e29b-41d4-a716-446655440000"]]
      (is (= {:text ""
              :media_ids media-ids
              :to_all_contacts true}
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
      (is (= {:text "hello"}
             (db/parse-create-message-params {:text "hello"}))))

    (testing "Message with ID"
      (is (= {:text "hello"
              :mid uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :id (str uuid1)}))))

    (testing "Message with discussion ID"
      (is (= {:text "hello"
              :did uuid1}
             (db/parse-create-message-params {:text "hello"
                                              :discussion_id (str uuid1)}))))

    (testing "Message with single media (deprecated)"
      (is (= {:text "hello"
              :media_ids [uuid1]}
             (db/parse-create-message-params {:text "hello"
                                              :media_id (str uuid1)}))))

    (testing "Message with multiple media"
      (is (= {:text "hello"
              :media_ids [uuid1 uuid2]}
             (db/parse-create-message-params {:text "hello"
                                              :media_ids [(str uuid1)
                                                          (str uuid2)]}))))

    (testing "Message with link previews"
      (is (= {:text "hello"
              :link_previews [uuid1]}
             (db/parse-create-message-params {:text "hello"
                                              :link_previews [(str uuid1)]}))))

    (testing "Message with reply_to"
      (is (= {:text "hello"
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

