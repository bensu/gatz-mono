(ns sdk.twilio
  (:require [clj-http.client :as http]
            [clojure.tools.logging :as log]
            [clojure.string :as str]))

(def TEST_PHONES
  (->> ["+1 111 111 1111", "+1 222 222 2222", "+1 333 333 3333"
        "+1 444 444 4444", "+1 555 555 5555", "+1 666 666 6666"
        "+1 777 777 7777", "+1 888 888 8888", "+1 999 999 9999"
        "+1 111 222 3333", "+1 222 333 4444", "+1 333 444 4444"
        "+1 111 222 3333", "+1 222 333 5555", "+1 333 444 5555"
        "+1 444 555 5555", "+1 555 666 6666", "+1 666 777 7777"
        "+1 444 555 6666", "+1 555 666 7777", "+1 666 777 8888"
        "+1 777 888 9999", "+1 888 999 0000", "+1 999 000 1111"
        "+1 000 111 2222", "+1 000 000 1111", "+1 000 000 2222"
        "+1 123 456 7890", "+1 234 567 8901", "+1 345 678 9012"
        "+1 123 456 7891"  "+1 123 456 7892"  "+1 123 456 7893"
        "+1 123 456 7894"  "+1 123 456 7895"  "+1 123 456 7896"
        "+1 123 456 7897"  "+1 123 456 7898"  "+1 123 456 7899"
        "+1 000 000 0000", "+1 000 000 0001", "+1 000 000 0002"
        "+1 000 000 0003", "+1 000 000 0004", "+1 000 000 0005"
        "+1 000 000 0006", "+1 000 000 0007", "+1 000 000 0008"
        "+1 000 000 0009", "+1 000 000 0010", "+1 000 000 0011"
        "+1 000 000 0012", "+1 000 000 0013", "+1 000 000 0014"
        "+1 000 000 0015", "+1 000 000 0016", "+1 000 000 0017"
        "+1 000 000 0018", "+1 000 000 0019", "+1 000 000 0020"]
       (map #(str/replace % " " ""))
       set))

;; TODO: this should throw a warning for certain countries

(def denylist-countries {"+228" "TG"})

(def denylist-country-codes (set (keys denylist-countries)))

(defn phone-in-denylist? [phone]
  {:pre [(string? phone)]
   :post [(boolean? %)]}
  (->> denylist-country-codes
       (some (fn [code]
               (str/starts-with? phone code)))
       (boolean)))

(defn start-verification!
  "Starts a verification from Twilio's service.
   Returns an id for its session or an error."
  [env {:keys [phone]}]
  (cond
    (contains? TEST_PHONES phone)
    {:sid "test_twilio_sid" :status "pending" :send_code_attempts []}

    ;; we fail silently as to not tell teh attackers of what is going on
    (phone-in-denylist? phone)
    {:sid "test_twilio_sid" :status "pending" :send_code_attempts []}

    :else
    (try
      (-> (format "https://verify.twilio.com/v2/Services/%s/Verifications"
                  (env :twilio/verify-service))
          (http/post
           {:basic-auth [(env :twilio/sid) (env :twilio/auth-token)]
            :as :json
            :form-params {:Channel "sms" :To phone}})
          :body)
      (catch Throwable t
        (log/error "Failed to start verification")
        (log/error t)
        (let [response (ex-data t)]
          (if (= 400 (:status response))
            {:status "failed" :attempts 0}
            (throw t)))))))

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
