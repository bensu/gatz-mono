(ns test-linking
  (:require [gatz.db.util-test :as db.util-test]
            [gatz.db.user :as db.user]
            [gatz.api.user :as api.user]
            [gatz.auth :as auth]
            [gatz.crdt.user :as crdt.user]
            [xtdb.api :as xtdb]
            [clojure.pprint :as pprint])
  (:import [java.util Date]))

(def mock-apple-claims
  {:sub "000123.abc456def789.apple-user-id"
   :email "user@privaterelay.appleid.com" 
   :name "Test User"
   :iss "https://appleid.apple.com"
   :aud "com.example.app"
   :exp (+ (/ (System/currentTimeMillis) 1000) 3600)
   :iat (/ (System/currentTimeMillis) 1000)})

(defn test-apple-linking []
  (println "Testing Apple ID linking functionality...")
  (let [ctx (db.util-test/test-system)
        node (:biff.xtdb/node ctx)
        now (Date.)
        user-id (random-uuid)]

    ;; Create regular SMS user
    (println "1. Creating regular SMS user...")
    (db.user/create-user! ctx {:id user-id
                               :username "regular_user"
                               :phone "+14159499902"
                               :now now})
    (xtdb/sync node)
    
    ;; Print initial user state
    (let [initial-user (db.user/by-id (xtdb/db node) user-id)
          initial-user-value (crdt.user/->value initial-user)]
      (println "Initial user structure:")
      (pprint/pprint (select-keys initial-user-value 
                                  [:xt/id :user/name :user/phone_number :user/apple_id 
                                   :user/google_id :user/email 
                                   :user/migration_completed_at])))

    ;; Test linking Apple ID
    (println "\n2. Linking Apple ID to existing user...")
    (with-redefs [auth/verify-apple-id-token (constantly mock-apple-claims)]
      (let [resp (api.user/link-apple! (assoc ctx
                                              :params {:id_token "mock.jwt.token"
                                                      :client_id "com.example.app"}
                                              :auth/user-id user-id
                                              :biff/db (xtdb/db node)))]
        (println "Link response status:" (:status resp))
        (xtdb/sync node)
        
        ;; Print updated user state
        (let [updated-user (db.user/by-id (xtdb/db node) user-id)
              updated-user-value (crdt.user/->value updated-user)]
          (println "\nUpdated user structure after linking:")
          (pprint/pprint (select-keys updated-user-value 
                                      [:xt/id :user/name :user/phone_number :user/apple_id 
                                       :user/google_id :user/email 
                                       :user/migration_completed_at])))))
    
    (.close node)
    (println "\n✅ Test completed successfully!")))

;; Run the test
(test-apple-linking)