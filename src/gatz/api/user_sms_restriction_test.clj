(ns gatz.api.user-sms-restriction-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.data.json :as json]
            [clojure.string :as str]
            [gatz.api.user :as api.user]
            [gatz.auth]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [xtdb.api :as xtdb]
            [sdk.posthog :as sdk.posthog]
            [sdk.twilio])
  (:import [java.util Date]))

(defn parse-resp [resp]
  (json/read-str (:body resp) :key-fn keyword))

(deftest test-sms-only-user-check
  (testing "SMS-only user identification logic"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)]

      ;; Test SMS-only user (legacy user)
      (testing "Identifies SMS-only user correctly"
        (let [user-id (random-uuid)]
          (db.user/create-user! ctx {:id user-id
                                    :username "sms_only_user"
                                    :phone "+14159499900"
                                    :now now})
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)]
            (is (db.user/sms-only-user? user)))))

      ;; Test user with Apple ID (not SMS-only)
      (testing "Identifies user with Apple ID as not SMS-only"
        (let [user-id (random-uuid)]
          (db.user/create-user! ctx {:id user-id
                                    :username "apple_user" 
                                    :phone "+14159499901"
                                    :apple_id "apple.test.123"
                                    :now now})
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)]
            (is (not (db.user/sms-only-user? user))))))

      ;; Test user with Google ID (not SMS-only)
      (testing "Identifies user with Google ID as not SMS-only"
        (let [user-id (random-uuid)]
          (db.user/create-user! ctx {:id user-id
                                    :username "google_user"
                                    :phone "+14159499902"  
                                    :google_id "google.test.123"
                                    :now now})
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)]
            (is (not (db.user/sms-only-user? user))))))

      ;; Test user with email (not SMS-only)
      (testing "Identifies user with email as not SMS-only"
        (let [user-id (random-uuid)]
          (db.user/create-user! ctx {:id user-id
                                    :username "email_user"
                                    :phone "+14159499903"
                                    :email "test@example.com"
                                    :now now})
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)]
            (is (not (db.user/sms-only-user? user))))))

      ;; Test user without phone (not SMS-only)
      (testing "Identifies user without phone as not SMS-only"
        (let [user-id (random-uuid)]
          (db.user/create-user! ctx {:id user-id
                                    :username "no_phone_user"
                                    :email "nophone@example.com"
                                    :now now})
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)]
            (is (not (db.user/sms-only-user? user))))))

      (.close node))))

(deftest test-sms-signup-restriction
  (testing "SMS signup restriction when flag is enabled"
    (let [ctx (db.util-test/test-system)]

      (with-redefs [sdk.posthog/identify! (constantly nil)
                    sdk.posthog/capture! (constantly nil)]

        (testing "Blocks SMS signup when restriction is enabled"
          (let [resp (api.user/sign-up! (assoc ctx 
                                               :params {:username "test_user"
                                                       :phone_number "+14159499999"}
                                               :gatz.auth/sms-signup-restricted? true))
                response-data (parse-resp resp)]
            
            (is (= 400 (:status resp)))
            (is (= "sms_signup_restricted" (:error response-data)))
            (is (str/includes? (:message response-data) "SMS signup is no longer available"))))

        (testing "Allows SMS signup when restriction is disabled"
          (with-redefs [gatz.auth/create-auth-token (constantly "mock-jwt-token")]
            (let [resp (api.user/sign-up! (assoc ctx
                                                 :params {:username "test_user2" 
                                                         :phone_number "+14159499998"}
                                                 :gatz.auth/sms-signup-restricted? false))
                  response-data (parse-resp resp)]
              
              (is (= 200 (:status resp)))
              (is (= "sign_up" (:type response-data)))
              (is (some? (:user response-data)))
              (is (some? (:token response-data))))))))))

(deftest test-sms-signin-still-works
  (testing "SMS sign-in still works for existing SMS-only users"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          phone "+14159499997"]

      ;; Create existing SMS-only user
      (with-redefs [sdk.posthog/identify! (constantly nil)
                    sdk.posthog/capture! (constantly nil)
                    gatz.auth/create-auth-token (constantly "mock-jwt-token")]
        (api.user/sign-up! (assoc ctx
                                  :params {:username "legacy_sms_user"
                                          :phone_number phone}
                                  :gatz.auth/sms-signup-restricted? false)))
      (xtdb/sync node)

      ;; Verify the user can still sign in via SMS verification
      (testing "Existing SMS-only user can still verify phone"
        (with-redefs [sdk.twilio/start-verification! (constantly {:status "pending" :sid "mock-sid"})]
          (let [resp (api.user/verify-phone! (assoc ctx 
                                                    :params {:phone_number phone}
                                                    :gatz.auth/sms-signup-restricted? true
                                                    :biff/secret (fn [_] "mock-secret")
                                                    :biff/db (xtdb/db node)))
                response-data (parse-resp resp)]
            
            (is (= 200 (:status resp)))
            (is (some? (:user response-data)) "Should find existing user")
            (is (= phone (:phone_number response-data))))))

      (.close node))))