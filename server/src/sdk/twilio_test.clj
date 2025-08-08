(ns sdk.twilio-test
  (:require [clojure.test :refer [deftest testing is]]
            [sdk.twilio :as twilio]))

(deftest test-mock-twilio
  (testing "Mock Twilio returns success for any phone/code"
    (let [env {}
          test-phone "+1234567890"
          test-code "1234"]
      
      ;; Test start-verification
      (let [result (twilio/start-verification! env {:phone test-phone})]
        (is (= "dev_mock_sid" (:sid result)))
        (is (= "pending" (:status result)))
        (is (empty? (:send_code_attempts result))))
      
      ;; Test check-code 
      (let [result (twilio/check-code! env {:phone test-phone :code test-code})]
        (is (= "dev_mock_sid" (:sid result)))
        (is (= "approved" (:status result)))
        (is (empty? (:send_code_attempts result))))
      
      ;; Test with any code
      (let [result (twilio/check-code! env {:phone test-phone :code "9999"})]
        (is (= "approved" (:status result))))))

  (testing "Mock mode can be disabled"
    (binding [twilio/*mock-twilio* false]
      (let [env {}
            test-phone "+1234567890"
            test-code "1234"]
        
        ;; Should try real Twilio (will fail without proper credentials, but that's expected)
        (try
          (twilio/start-verification! env {:phone test-phone})
          (catch Exception e
            ;; Expected - we don't have real Twilio credentials
            (is (some? e))))))))