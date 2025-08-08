(ns gatz.api.user-google-test
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
            [sdk.posthog :as sdk.posthog])
  (:import [java.util Date]))

(defn parse-resp [resp]
  (json/read-str (:body resp) :key-fn keyword))

(def mock-google-claims
  {:sub "123456789012345678901"
  :email "user@example.com"
  :name "Test User"
  :iss "https://accounts.google.com"
  :aud "google-client-id.apps.googleusercontent.com"
  :exp (+ (/ (System/currentTimeMillis) 1000) 3600)
  :iat (/ (System/currentTimeMillis) 1000)})

(deftest test-google-sign-in-validation
  (testing "Google Sign-In parameter validation"
    (let [ctx (db.util-test/test-system)]
      
      (testing "Missing id_token"
        (let [resp (api.user/google-sign-in! (assoc ctx :params {:client_id "google-client-id"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_id_token" (:error (parse-resp resp))))))

      (testing "Missing client_id"  
        (let [resp (api.user/google-sign-in! (assoc ctx :params {:id_token "mock.jwt.token"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_client_id" (:error (parse-resp resp))))))

      (testing "Signup disabled flag"
        (let [resp (api.user/google-sign-in! (assoc ctx 
                                                     :params {:id_token "mock.jwt.token"
                                                             :client_id "google-client-id"}
                                                     :gatz.auth/signup-disabled? true))]
          (is (= 400 (:status resp)))
          (is (= "signup_disabled" (:error (parse-resp resp)))))))))

(deftest test-google-sign-in-new-user
  (testing "Creating new user with Google Sign-In"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)]
      
      (with-redefs [auth/verify-google-id-token (constantly mock-google-claims)
                    sdk.posthog/identify! (constantly nil)
                    sdk.posthog/capture! (constantly nil)]
        
        (let [resp (api.user/google-sign-in! (assoc ctx 
                                                    :params {:id_token "mock.jwt.token"
                                                            :client_id "google-client-id"}
                                                    :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (= "sign_up" (:type response-data)))
          (is (some? (:user response-data)))
          (is (some? (:token response-data)))
          
          ;; Verify user was created with Google auth
          (xtdb/sync node)
          (let [user-id (get-in response-data [:user :xt/id])
                user (db.user/by-id (xtdb/db node) user-id)
                user-value (crdt.user/->value user)]
            (is (= (:sub mock-google-claims) (:user/google_id user-value)))
            (is (= (:email mock-google-claims) (:user/email user-value)))))
        
        (.close node)))))

(deftest test-google-sign-in-existing-user  
  (testing "Existing user login with Google Sign-In"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          google-id (:sub mock-google-claims)
          user-id (random-uuid)]

      ;; Create existing user with Google ID
      (db.user/create-user! ctx {:id user-id
                                 :username "existing_google_user"
                                 :phone "+14159499900"
                                 :now now
                                 :google_id google-id
                                 :email (:email mock-google-claims)})
      (xtdb/sync node)

      (with-redefs [auth/verify-google-id-token (constantly mock-google-claims)
                    sdk.posthog/identify! (constantly nil)
                    sdk.posthog/capture! (constantly nil)]
        
        (let [resp (api.user/google-sign-in! (assoc ctx
                                                    :params {:id_token "mock.jwt.token"
                                                            :client_id "google-client-id"}
                                                    :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (nil? (:type response-data))) ; No "sign_up" for existing user
          (is (= user-id (get-in response-data [:user :xt/id])))
          (is (some? (:token response-data)))))
      
      (.close node))))

(deftest test-link-google-validation
  (testing "Link Google ID parameter validation"
    (let [ctx (assoc (db.util-test/test-system) :auth/user-id (random-uuid))]
      
      (testing "Missing id_token"
        (let [resp (api.user/link-google! (assoc ctx :params {:client_id "google-client-id"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_id_token" (:error (parse-resp resp))))))

      (testing "Missing client_id"
        (let [resp (api.user/link-google! (assoc ctx :params {:id_token "mock.jwt.token"}))]
          (is (= 400 (:status resp)))
          (is (= "missing_client_id" (:error (parse-resp resp)))))))))

(deftest test-link-google-success
  (testing "Successfully linking Google ID to existing account"
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

      (with-redefs [auth/verify-google-id-token (constantly mock-google-claims)
                    sdk.posthog/capture! (constantly nil)]
        
        (let [resp (api.user/link-google! (assoc ctx
                                                 :params {:id_token "mock.jwt.token"
                                                         :client_id "google-client-id"}
                                                 :auth/user-id user-id
                                                 :biff/db (xtdb/db node)))
              response-data (parse-resp resp)]
          
          (is (= 200 (:status resp)))
          (is (= "linked" (:status response-data)))
          (is (some? (:user response-data)))))
      
      (.close node))))

(deftest test-google-id-already-taken
  (testing "Google ID already linked to another account"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user1-id (random-uuid)
          user2-id (random-uuid)
          google-id (:sub mock-google-claims)]

      ;; Create user1 with Google ID
      (db.user/create-user! ctx {:id user1-id
                                 :username "user1"
                                 :phone "+14159499903"
                                 :now now
                                 :google_id google-id})
      
      ;; Create user2 without Google ID  
      (db.user/create-user! ctx {:id user2-id
                                 :username "user2"
                                 :phone "+14159499904"
                                 :now now})
      (xtdb/sync node)

      (with-redefs [auth/verify-google-id-token (constantly mock-google-claims)]
        
        ;; Try to link same Google ID to user2
        (let [resp (api.user/link-google! (assoc ctx
                                                 :params {:id_token "mock.jwt.token"
                                                         :client_id "google-client-id"}
                                                 :auth/user-id user2-id
                                                 :biff/db (xtdb/db node)))]
          
          (is (= 400 (:status resp)))
          (is (= "google_id_taken" (:error (parse-resp resp))))))
      
      (.close node))))

(deftest test-google-already-linked
  (testing "Google ID already linked to current account"
    (let [ctx (db.util-test/test-system)
          node (:biff.xtdb/node ctx)
          now (Date.)
          user-id (random-uuid)
          google-id (:sub mock-google-claims)]

      ;; Create a user with Google ID
      (db.user/create-user! ctx {:id user-id
                                 :username "google_user"
                                 :phone "+14159499905"
                                 :now now
                                 :google_id google-id})
      (xtdb/sync node)

      (with-redefs [auth/verify-google-id-token (constantly mock-google-claims)]
        ;; Try to link the same Google ID again
        (let [resp (api.user/link-google! (assoc ctx
                                                 :params {:id_token "mock.jwt.token"
                                                         :client_id "google-client-id"}
                                                 :auth/user-id user-id
                                                 :biff/db (xtdb/db node)))]
          (is (= 200 (:status resp)))
          (let [response-data (parse-resp resp)]
            (is (= "already_linked" (:status response-data)))
            (is (some? (:user response-data))))))
      
      (.close node))))