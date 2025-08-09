(ns gatz.admin-test
  (:require [clojure.test :refer [deftest testing is]]
            [gatz.admin :as admin]
            [gatz.db.user :as gatz.db.user]
            [gatz.system :as system]
            [gatz.db.util-test :as db.util-test]
            [xtdb.api :as xtdb]))

(deftest user-migration-status-test
  (testing "user-migration-status correctly identifies migration status"
    (testing "Apple user is migrated with apple method"
      (let [user {:user/apple_id "apple123" :user/phone_number "+1234567890"}
            result (admin/user-migration-status user)]
        (is (= true (:migrated result)))
        (is (= "apple" (:active_method result)))))
    
    (testing "Google user is migrated with google method"
      (let [user {:user/google_id "google123" :user/phone_number "+1234567890"}
            result (admin/user-migration-status user)]
        (is (= true (:migrated result)))
        (is (= "google" (:active_method result)))))
    
    (testing "Email user is migrated with email method"
      (let [user {:user/email "test@example.com" :user/phone_number "+1234567890"}
            result (admin/user-migration-status user)]
        (is (= true (:migrated result)))
        (is (= "email" (:active_method result)))))
    
    (testing "SMS-only user is not migrated with sms method"
      (let [user {:user/phone_number "+1234567890"}
            result (admin/user-migration-status user)]
        (is (= false (:migrated result)))
        (is (= "sms" (:active_method result)))))
    
    (testing "Priority order: apple > google > email > sms"
      (let [user {:user/apple_id "apple123" 
                  :user/google_id "google123"
                  :user/email "test@example.com"
                  :user/phone_number "+1234567890"}
            result (admin/user-migration-status user)]
        (is (= true (:migrated result)))
        (is (= "apple" (:active_method result)))))))

(deftest generate-user-migration-csv-data-test
  (testing "CSV data generation with sample users"
    (let [users [{:xt/id "user1" :user/name "AppleUser" :user/apple_id "apple123"}
                 {:xt/id "user2" :user/name "GoogleUser" :user/google_id "google123"}  
                 {:xt/id "user3" :user/name "EmailUser" :user/email "test@example.com"}
                 {:xt/id "user4" :user/name "SMSUser" :user/phone_number "+1234567890"}]
          csv-data (admin/generate-user-migration-csv-data users)]
      
      (testing "CSV structure"
        (is (= ["id" "name" "migrated" "active_method"] (first csv-data)))
        (is (= 9 (count csv-data))) ; header + 4 users + empty row + totals header + 2 totals
        
        ;; Check user data rows
        (is (= ["user1" "AppleUser" "true" "apple"] (second csv-data)))
        (is (= ["user2" "GoogleUser" "true" "google"] (nth csv-data 2)))
        (is (= ["user3" "EmailUser" "true" "email"] (nth csv-data 3)))
        (is (= ["user4" "SMSUser" "false" "sms"] (nth csv-data 4)))
        
        ;; Check totals section
        (is (= [] (nth csv-data 5))) ; blank row
        (is (= ["TOTALS"] (nth csv-data 6)))
        (is (= ["Migrated" 3] (nth csv-data 7)))
        (is (= ["Non-migrated" 1] (nth csv-data 8)))))))

(deftest generate-user-migration-csv-string-test
  (testing "CSV string generation"
    (let [users [{:xt/id "user1" :user/name "TestUser" :user/apple_id "apple123"}]
          csv-string (admin/generate-user-migration-csv-string users)]
      
      (is (string? csv-string))
      (is (clojure.string/includes? csv-string "id,name,migrated,active_method"))
      (is (clojure.string/includes? csv-string "user1,TestUser,true,apple"))
      (is (clojure.string/includes? csv-string "TOTALS"))
      (is (clojure.string/includes? csv-string "Migrated,1"))
      (is (clojure.string/includes? csv-string "Non-migrated,0")))))

(deftest admin-csv-endpoint-integration-test
  (testing "Admin CSV endpoint integration test"
    (let [ctx (db.util-test/test-system)
          handler system/handler
          now (java.util.Date.)]
      
      ;; Create test users
      (gatz.db.user/create-user! ctx {:username "testuser1" :phone "+1111111111" :apple_id "apple123" :now now})
      (gatz.db.user/create-user! ctx {:username "testuser2" :phone "+2222222222" :email "test@email.com" :now now})
      (gatz.db.user/create-user! ctx {:username "testuser3" :phone "+3333333333" :now now})
      
      ;; Sync database
      (xtdb/sync (:biff.xtdb/node ctx))
      
      (let [fresh-db (xtdb/db (:biff.xtdb/node ctx))
            valid-creds (.encodeToString (java.util.Base64/getEncoder) (.getBytes "admin:secret"))
            request {:uri "/admin/user-auth-migration-report"
                     :request-method :get
                     :headers {"authorization" (str "Basic " valid-creds)}
                     :biff/db fresh-db
                     :biff/secret {:admin/username "admin" :admin/password "secret"}}
            response (handler request)]
        
        (testing "Response status and headers"
          (is (= 200 (:status response)))
          (is (clojure.string/starts-with? (get-in response [:headers "Content-Type"]) "text/csv"))
          
          ;; Check that Content-Disposition indicates attachment with timestamped filename
          (let [content-disposition (get-in response [:headers "Content-Disposition"])]
            (is (clojure.string/starts-with? content-disposition "attachment; filename=\"user-auth-migration-report-"))
            (is (clojure.string/ends-with? content-disposition ".csv\"")))
          
          ;; Check cache control headers for download
          (is (= "no-cache, no-store, must-revalidate" (get-in response [:headers "Cache-Control"])))
          (is (= "no-cache" (get-in response [:headers "Pragma"])))
          (is (= "0" (get-in response [:headers "Expires"])))
          
          ;; Check content length is present
          (is (string? (get-in response [:headers "Content-Length"]))))
        
        (testing "CSV content structure"
          (let [csv-content (:body response)
                lines (clojure.string/split csv-content #"\n")]
            (is (= "id,name,migrated,active_method" (first lines)))
            (is (> (count lines) 5)) ; Should have header, users, blank line, and totals
            (is (some #(clojure.string/includes? % "TOTALS") lines))))))))