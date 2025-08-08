(ns gatz.api.user-apple-test
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

(def mock-apple-claims
  {:sub "000123.abc456def789.apple-user-id"
   :email "user@privaterelay.appleid.com" 
   :name "Test User"
   :iss "https://appleid.apple.com"
   :aud "com.example.app"
   :exp (+ (/ (System/currentTimeMillis) 1000) 3600)
   :iat (/ (System/currentTimeMillis) 1000)})

(deftest test-apple-sign-in-validation
  (testing "Apple Sign-In parameter validation"
    (let [ctx (db.util-test/test-system)]
      
      (testing "Missing id_token"
        (let [resp (api.user/apple-sign-in! (assoc ctx :params {:client_id "com.example.app"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_id_token" (:error (parse-resp resp))))))

      (testing "Missing client_id"  
        (let [resp (api.user/apple-sign-in! (assoc ctx :params {:id_token "mock.jwt.token"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_client_id" (:error (parse-resp resp))))))

      (testing "Signup disabled flag"
        (let [resp (api.user/apple-sign-in! (assoc ctx 
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :gatz.auth/signup-disabled? true))]
          (is (= 400 (:status resp)))
          (is (= "signup_disabled" (:error (parse-resp resp)))))))))

(deftest test-apple-sign-in-new-user
  (testing "Creating new user with Apple Sign-In"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)]
      
      (with-redefs [auth/verify-apple-id-token (constantly mock-apple-claims)
                    posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/apple-sign-in! (assoc ctx 
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (= "sign_up" (:type response-data)))
          (is (some? (:user response-data)))
          (is (some? (:token response-data)))
          
          ;; Verify user was created with Apple auth
          (xtdb/sync node)
          (let [user-id (get-in response-data [:user :xt/id])
                user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= (:sub mock-apple-claims) (:user/apple_id user-value)))
            (is (= (:email mock-apple-claims) (:user/email user-value)))))
        
        (.close node)))))

(deftest test-apple-sign-in-existing-user  
  (testing "Existing user login with Apple Sign-In"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          apple-id (:sub mock-apple-claims)
          user-id (random-uuid)]

      ;; Create existing user with Apple ID
      (db.user/create-user! ctx {:id user-id
                                 :username "existing_apple_user"
                                 :phone "+14159499900"
                                 :now now
                                 :apple_id apple-id
                                 :email (:email mock-apple-claims)})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly mock-apple-claims)
                    posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/apple-sign-in! (assoc ctx
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:type response-data))) ; No "sign_up" for existing user
          (is (= user-id (get-in response-data [:user :xt/id])))
          (is (some? (:token response-data)))))
      
      (.close node))))

(deftest test-link-apple-validation
  (testing "Link Apple ID parameter validation"
    (let [ctx (assoc (db.util-test/test-system) :auth/user-id (random-uuid))]
      
      (testing "Missing id_token"
        (let [resp (api.user/link-apple! (assoc ctx :params {:client_id "com.example.app"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_id_token" (:error (parse-resp resp))))))

      (testing "Missing client_id"
        (let [resp (api.user/link-apple! (assoc ctx :params {:id_token "mock.jwt.token"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_client_id" (:error (parse-resp resp)))))))))

(deftest test-link-apple-success
  (testing "Successfully linking Apple ID to existing account"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)]

      ;; Create regular user
      (db.user/create-user! ctx {:id user-id
                                 :username "regular_user"
                                 :phone "+14159499902"
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly mock-apple-claims)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/link-apple! (assoc ctx
                                                :params {:id_token "mock.jwt.token"
                                                        :client_id "com.example.app"}
                                                :auth/user-id user-id
                                                :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (= "linked" (:status response-data)))
          (is (some? (:user response-data)))))
      
      (.close node))))

(deftest test-apple-id-already-taken
  (testing "Apple ID already linked to another account"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user1-id (random-uuid)
          user2-id (random-uuid)
          apple-id (:sub mock-apple-claims)]

      ;; Create user1 with Apple ID
      (db.user/create-user! ctx {:id user1-id
                                 :username "user1"
                                 :phone "+14159499903"
                                 :now now
                                 :apple_id apple-id})
      
      ;; Create user2 without Apple ID  
      (db.user/create-user! ctx {:id user2-id
                                 :username "user2"
                                 :phone "+14159499904"
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly mock-apple-claims)]
        
        ;; Try to link same Apple ID to user2
        (let [resp (api.user/link-apple! (assoc ctx
                                                :params {:id_token "mock.jwt.token"
                                                        :client_id "com.example.app"}
                                                :auth/user-id user2-id
                                                :biff/db (xtdb/db node)))]
          
          (is (= 400 (:status resp)))
          (is (= "apple_id_taken" (:error (parse-resp resp))))))
      
      (.close node))))

(deftest test-apple-sign-in-auto-link-to-existing-email
  (testing "Apple Sign-In automatically links to existing account with same email"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "user@example.com"]

      ;; Create existing user with email (created via SMS/email auth)
      (db.user/create-user! ctx {:id user-id
                                 :username "existing_user"
                                 :phone "+14159499901"
                                 :email shared-email
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly (assoc mock-apple-claims :email shared-email))
                    sdk.posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/apple-sign-in! (assoc ctx
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:type response-data))) ; No "sign_up" since user exists
          (is (= user-id (get-in response-data [:user :xt/id]))) ; Same user ID
          (is (some? (:token response-data)))
          
          ;; Verify user now has Apple ID linked
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= (:sub mock-apple-claims) (:user/apple_id user-value)))
            (is (= shared-email (:user/email user-value)))
            (is (= "existing_user" (:user/username user-value))))))
      
      (.close node))))

(deftest test-apple-sign-in-auto-link-to-existing-google-user
  (testing "Apple Sign-In automatically links to existing Google user with same email"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "user@example.com"
          google-id "google-123"]

      ;; Create existing user with Google ID
      (db.user/create-user! ctx {:id user-id
                                 :username "google_user"
                                 :google_id google-id
                                 :email shared-email
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly (assoc mock-apple-claims :email shared-email))
                    sdk.posthog/identify! (constantly nil)
                    posthog/capture! (constantly nil)]
        
        (let [resp (api.user/apple-sign-in! (assoc ctx
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:type response-data)))
          (is (= user-id (get-in response-data [:user :xt/id])))
          
          ;; Verify user now has both Google and Apple IDs
          (xtdb/sync node)
          (let [user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= (:sub mock-apple-claims) (:user/apple_id user-value)))
            (is (= google-id (:user/google_id user-value)))
            (is (= shared-email (:user/email user-value))))))
      
      (.close node))))

(deftest test-apple-sign-in-deleted-user-by-email
  (testing "Apple Sign-In fails when user with same email is deleted"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          shared-email "deleted@example.com"]

      ;; Create and then delete user
      (db.user/create-user! ctx {:id user-id
                                 :username "deleted_user"
                                 :phone "+14159499905"
                                 :email shared-email
                                 :now now})
      (db.user/mark-deleted! ctx {:uid user-id :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-apple-id-token (constantly (assoc mock-apple-claims :email shared-email))]
        
        (let [resp (api.user/apple-sign-in! (assoc ctx
                                                   :params {:id_token "mock.jwt.token"
                                                           :client_id "com.example.app"}
                                                   :biff/db (xtdb/db node)))]
          
          (is (= 400 (:status resp)))
          (is (= "account_deleted" (:error (parse-resp resp))))))
      
      (.close node))))