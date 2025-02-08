(ns gatz.db-test
  (:require [clojure.test :refer [deftest is testing]]
            [gatz.db :as db]))

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

