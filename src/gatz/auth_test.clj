(ns gatz.auth-test
  (:require [clojure.test :refer [deftest testing is]]
            [gatz.auth :as auth]
            [clojure.string :as str])
  (:import [java.util Date]))

(def mock-apple-jwk
  {:kty "RSA"
   :kid "test-key-id" 
   :use "sig"
   :alg "RS256"
   :n "test-modulus-value"
   :e "AQAB"})

(def mock-jwks-response
  {:keys [mock-apple-jwk]})

(deftest test-base64url-decode
  (testing "Base64URL decoding works correctly"
    (let [test-string "SGVsbG8gV29ybGQ"  ; "Hello World" in base64url
          decoded (auth/base64url-decode test-string)]
      (is (= "Hello World" (String. decoded))))))

(deftest test-apple-jwks-cache
  (testing "Apple JWKS caching functionality"
    ;; Reset cache
    (reset! auth/apple-jwks-cache {:keys nil :expires-at 0})
    
    (with-redefs [clj-http.client/get (fn [url opts]
                                        (is (= auth/apple-jwks-url url))
                                        {:body "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"test-key\"}]}"})]
      (let [keys (auth/fetch-apple-jwks)]
        (is (= 1 (count keys)))
        (is (= "test-key" (:kid (first keys))))
        
        ;; Test caching - should not make another HTTP request
        (with-redefs [clj-http.client/get (fn [& _] (throw (Exception. "Should not be called")))]
          (let [cached-keys (auth/fetch-apple-jwks)]
            (is (= keys cached-keys))))))))

(deftest test-find-apple-key
  (testing "Finding Apple key by kid"
    (with-redefs [auth/fetch-apple-jwks (fn [] [{:kid "key1" :kty "RSA"}
                                                {:kid "key2" :kty "RSA"}])]
      (is (= {:kid "key1" :kty "RSA"} (auth/find-apple-key "key1")))
      (is (= {:kid "key2" :kty "RSA"} (auth/find-apple-key "key2")))
      (is (nil? (auth/find-apple-key "nonexistent"))))))

(deftest test-verify-apple-id-token-validation
  (testing "Apple ID token validation errors"
    ;; Test invalid algorithm
    (with-redefs [clojure.data.json/read-str (fn [json-str & opts] {:kid "test-key" :alg "HS256"})]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Apple ID token verification failed"
                           (auth/verify-apple-id-token "mock.token" {:client-id "test-client"}))))
    
    ;; Test missing key
    (with-redefs [clojure.data.json/read-str (fn [json-str & opts] {:kid "missing-key" :alg "RS256"})
                  auth/find-apple-key (fn [kid] nil)]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Apple ID token verification failed"
                           (auth/verify-apple-id-token "mock.token" {:client-id "test-client"}))))))

(deftest test-google-jwks-cache
  (testing "Google JWKS caching functionality"
    ;; Reset cache
    (reset! auth/google-jwks-cache {:keys nil :expires-at 0})
    
    (with-redefs [clj-http.client/get (fn [url opts]
                                        (is (= auth/google-jwks-url url))
                                        {:body "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"google-key\"}]}"})]
      (let [keys (auth/fetch-google-jwks)]
        (is (= 1 (count keys)))
        (is (= "google-key" (:kid (first keys))))
        
        ;; Test caching - should not make another HTTP request (5 min cache)
        (with-redefs [clj-http.client/get (fn [& _] (throw (Exception. "Should not be called")))]
          (let [cached-keys (auth/fetch-google-jwks)]
            (is (= keys cached-keys))))))))

(deftest test-find-google-key
  (testing "Finding Google key by kid"
    (with-redefs [auth/fetch-google-jwks (fn [] [{:kid "gkey1" :kty "RSA"}
                                                 {:kid "gkey2" :kty "RSA"}])]
      (is (= {:kid "gkey1" :kty "RSA"} (auth/find-google-key "gkey1")))
      (is (= {:kid "gkey2" :kty "RSA"} (auth/find-google-key "gkey2")))
      (is (nil? (auth/find-google-key "nonexistent"))))))

(deftest test-verify-google-id-token-validation
  (testing "Google ID token validation errors"
    ;; Test invalid algorithm
    (with-redefs [clojure.data.json/read-str (fn [json-str & opts] {:kid "google-key" :alg "HS256"})]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Google ID token verification failed"
                           (auth/verify-google-id-token "mock.token" {:client-id "test-client"}))))
    
    ;; Test missing key
    (with-redefs [clojure.data.json/read-str (fn [json-str & opts] {:kid "missing-key" :alg "RS256"})
                  auth/find-google-key (fn [kid] nil)]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Google ID token verification failed"
                           (auth/verify-google-id-token "mock.token" {:client-id "test-client"}))))))