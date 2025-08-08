(ns gatz.api.user-email-test
  (:require [clojure.test :refer [deftest testing is]]
            [clojure.data.json :as json]
            [gatz.api.user :as api.user]
            [gatz.auth :as auth]
            [gatz.db.user :as db.user]
            [gatz.db.util-test :as db.util-test]
            [crdt.core :as crdt]
            [gatz.crdt.user :as crdt.user]
            [xtdb.api :as xtdb]
            [clojure.string :as str]
            [sdk.posthog :as posthog])
  (:import [java.util Date]))

(defn parse-resp [resp]
  (json/read-str (:body resp) :key-fn keyword))

(deftest test-email-verify-auto-link-to-existing-apple-user
  (testing "Email verification automatically links to existing Apple user with same email"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "user@example.com"
          apple-id "apple-123"
          email-code "123456"]

      ;; Create existing user with Apple ID
      (db.user/create-user! ctx {:id user-id
                                 :username "apple_user"
                                 :apple_id apple-id
                                 :email shared-email
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-email-code! (constantly {:status "approved"})
                    posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/verify-email-code! (assoc ctx
                                                       :params {:email shared-email
                                                               :code email-code}
                                                       :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:requires_signup response-data))) ; Should not require signup
          (is (= user-id (get-in response-data [:user :xt/id]))) ; Same user ID
          (is (some? (:token response-data)))
          
          ;; Verify user still has Apple ID and email
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= apple-id (:user/apple_id user-value)))
            (is (= shared-email (:user/email user-value)))
            (is (= "apple_user" (:user/username user-value))))))
      
      (.close node))))

(deftest test-email-verify-auto-link-to-existing-google-user
  (testing "Email verification automatically links to existing Google user with same email"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "user@example.com"
          google-id "google-123"
          email-code "123456"]

      ;; Create existing user with Google ID
      (db.user/create-user! ctx {:id user-id
                                 :username "google_user"
                                 :google_id google-id
                                 :email shared-email
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-email-code! (constantly {:status "approved"})
                    posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/verify-email-code! (assoc ctx
                                                       :params {:email shared-email
                                                               :code email-code}
                                                       :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:requires_signup response-data)))
          (is (= user-id (get-in response-data [:user :xt/id])))
          
          ;; Verify user still has Google ID and email
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= google-id (:user/google_id user-value)))
            (is (= shared-email (:user/email user-value)))
            (is (= "google_user" (:user/username user-value))))))
      
      (.close node))))

(deftest test-email-verify-auto-link-to-existing-hybrid-user
  (testing "Email verification automatically links to existing user with both Apple and Google IDs"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "user@example.com"
          apple-id "apple-123"
          google-id "google-456"
          email-code "123456"]

      ;; Create existing user with both Apple and Google IDs
      (db.user/create-user! ctx {:id user-id
                                 :username "hybrid_user"
                                 :apple_id apple-id
                                 :google_id google-id
                                 :email shared-email
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-email-code! (constantly {:status "approved"})
                    posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/verify-email-code! (assoc ctx
                                                       :params {:email shared-email
                                                               :code email-code}
                                                       :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:requires_signup response-data)))
          (is (= user-id (get-in response-data [:user :xt/id])))
          
          ;; Verify user has both IDs and email
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= apple-id (:user/apple_id user-value)))
            (is (= google-id (:user/google_id user-value)))
            (is (= shared-email (:user/email user-value)))
            (is (= "hybrid_user" (:user/username user-value))))))
      
      (.close node))))

(deftest test-email-verify-new-user-requires-signup
  (testing "Email verification for completely new email requires signup"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          new-email "new@example.com"
          email-code "123456"]

      (with-redefs [auth/verify-email-code! (constantly {:status "approved"})]
        
        (let [resp (api.user/verify-email-code! (assoc ctx
                                                       :params {:email new-email
                                                               :code email-code}
                                                       :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (true? (:requires_signup response-data))) ; Should require signup
          (is (= new-email (:email response-data)))))
      
      (.close node))))

(deftest test-email-verify-deleted-user
  (testing "Email verification fails when user with same email is deleted"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "deleted@example.com"
          email-code "123456"]

      ;; Create and then delete user
      (db.user/create-user! ctx {:id user-id
                                 :username "deleted_user"
                                 :phone "+14159499905"
                                 :email shared-email
                                 :now now})
      (db.user/mark-deleted! ctx {:uid user-id :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-email-code! (constantly {:status "approved"})]
        
        (let [resp (api.user/verify-email-code! (assoc ctx
                                                       :params {:email shared-email
                                                               :code email-code}
                                                       :biff/db (xtdb/db node)))]
          
          (is (= 400 (:status resp)))
          (is (= "account_deleted" (:error (parse-resp resp))))))
      
      (.close node))))