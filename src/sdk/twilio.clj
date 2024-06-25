(ns sdk.twilio
  (:require [clj-http.client :as http]
            [clojure.string :as str]))

(def TEST_PHONES
  (->> ["+1 111 111 1111", "+1 222 222 2222", "+1 333 333 3333"
        "+1 444 444 4444", "+1 555 555 5555", "+1 666 666 6666"
        "+1 777 777 7777", "+1 888 888 8888", "+1 999 999 9999"
        "+1 111 222 3333", "+1 222 333 4444", "+1 333 444 4444"
        "+1 111 222 3333", "+1 222 333 5555", "+1 333 444 5555"
        "+1 444 555 5555", "+1 555 666 6666", "+1 666 777 7777"
        "+1 444 555 6666", "+1 555 666 7777", "+1 666 777 8888"
        "+1 123 456 7890", "+1 234 567 8901", "+1 345 678 9012"]
       (map #(str/replace % " " ""))
       set))

(defn start-verification!
  "Starts a verification from Twilio's service.
   Returns an id for its session or an error."
  [env {:keys [phone]}]
  (if (contains? TEST_PHONES phone)
    {:sid "test_twilio_sid" :status "pending" :send_code_attempts []}
    (-> (format "https://verify.twilio.com/v2/Services/%s/Verifications"
                (env :twilio/verify-service))
        (http/post
         {:basic-auth [(env :twilio/sid) (env :twilio/auth-token)]
          :as :json
          :form-params {:Channel "sms" :To phone}})
        :body)))

(def MAX_ATTEMPTS_REACHED 60202)

(defn check-code!
  "Checks if the code is the right one. Returns either true or false if the code is invalid"
  [env {:keys [phone code]}]
  (if (contains? TEST_PHONES phone)
    {:sid "test_twilio_sid" :status "approved" :send_code_attempts []}
    (let [r (-> (format "https://verify.twilio.com/v2/Services/%s/VerificationCheck"
                        (env :twilio/verify-service))
                (http/post
                 {:basic-auth [(env :twilio/sid) (env :twilio/auth-token)]
                  :as :json
                  :form-params {:Code code :To phone}})
                :body)]
      (if (= MAX_ATTEMPTS_REACHED (:code r))
        {:status "failed" :send_code_attempts []}
        r))))