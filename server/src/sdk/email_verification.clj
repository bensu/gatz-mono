(ns sdk.email-verification
  (:require [clojure.tools.logging :as log]
            [clojure.string :as str]
            [gatz.email :as email]
            [xtdb.api :as xtdb])
  (:import [java.util Date]
           [java.security SecureRandom]))

;; Email verification configuration
(def CODE_LENGTH 6)
(def CODE_EXPIRY_MINUTES 10)
(def MAX_ATTEMPTS_PER_EMAIL 3)
(def RATE_LIMIT_MINUTES 15)
(def MAX_ATTEMPTS_PER_IP 10) ; Maximum attempts per IP in RATE_LIMIT_MINUTES
(def MIN_CODE_DELAY_SECONDS 60) ; Minimum delay between code requests for same email

;; Schema for verification codes
(def verification-code-schema
  {:db/type :email/verification_code
   :verification/email string?
   :verification/code string?
   :verification/created_at inst?
   :verification/expires_at inst?
   :verification/attempts int?
   :verification/used boolean?
   :verification/ip_address {:optional true} string?
   :verification/user_agent {:optional true} string?})

(defn generate-code
  "Generate a random 6-digit verification code"
  []
  (let [random (SecureRandom.)
        code (StringBuilder.)]
    (dotimes [_ CODE_LENGTH]
      (.append code (.nextInt random 10)))
    (.toString code)))

(defn code-expires-at 
  "Calculate expiration time for a verification code"
  [created-at]
  (Date. (+ (.getTime created-at) (* CODE_EXPIRY_MINUTES 60 1000))))

(defn clean-email 
  "Clean and normalize email address"
  [email]
  (some-> email str/trim str/lower-case))

(defn valid-email? 
  "Comprehensive email validation"
  [email]
  (and (string? email)
       (>= 320 (count email))  ; RFC 5321 limit
       (<= 6 (count email))    ; Minimum reasonable email length
       (re-matches #"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$" email)
       (not (str/starts-with? email "."))
       (not (str/ends-with? email "."))
       (not (str/includes? email ".."))
       (not (str/includes? email "@."))
       (not (str/includes? email ".@"))))

(defn expired? 
  "Check if a verification code has expired"
  [verification-doc]
  (let [now (Date.)
        expires-at (:verification/expires_at verification-doc)]
    (.after now expires-at)))

(defn get-active-verification 
  "Get active (non-expired, non-used) verification for an email"
  [db email]
  (let [clean-email (clean-email email)
        verifications (xtdb/q db
                             '{:find [(pull v [*])]
                               :in [email]
                               :where [[v :verification/email email]
                                      [v :db/type :email/verification_code]
                                      [v :verification/used false]]}
                             clean-email)]
    (->> verifications
         (map first)
         (remove expired?)
         (sort-by :verification/created_at)
         last))) ; Get the most recent non-expired verification

(defn count-recent-attempts
  "Count verification attempts for an email in the last RATE_LIMIT_MINUTES"
  [db email]
  (let [clean-email (clean-email email)
        cutoff-time (Date. (- (.getTime (Date.)) (* RATE_LIMIT_MINUTES 60 1000)))
        attempts (xtdb/q db
                        '{:find [attempts]
                          :in [email cutoff-time]
                          :where [[v :verification/email email]
                                 [v :db/type :email/verification_code]
                                 [v :verification/created_at created-at]
                                 [(>= created-at cutoff-time)]
                                 [v :verification/attempts attempts]]}
                        clean-email
                        cutoff-time)]
    (reduce + 0 (map first attempts))))

(defn create-verification-code! 
  "Create a new email verification code with security checks"
  [{:keys [biff.xtdb/node headers remote-addr] :as ctx} email]
  (let [clean-email (clean-email email)
        db (xtdb/db node)
        now (Date.)
        ip-address (or remote-addr (get headers "x-forwarded-for") (get headers "x-real-ip"))
        user-agent (get headers "user-agent")]
    
    ;; Security checks
    (cond
      (not (valid-email? clean-email))
      (throw (ex-info "Invalid email format" {:type :invalid-email}))
      
      (is-suspicious-email? clean-email)
      (throw (ex-info "Suspicious email address" {:type :suspicious-email}))
      
      (rate-limit-exceeded? db clean-email)
      (throw (ex-info "Rate limit exceeded for email" {:type :rate-limit-exceeded}))
      
      (ip-rate-limit-exceeded? db ip-address)
      (throw (ex-info "Rate limit exceeded for IP" {:type :ip-rate-limit-exceeded}))
      
      (too-soon-for-new-code? db clean-email)
      (throw (ex-info "Please wait before requesting another code" {:type :too-soon}))
      
      :else
      (let [code (generate-code)
            verification-id (random-uuid)
            verification-doc (cond-> {:xt/id verification-id
                                     :db/type :email/verification_code
                                     :verification/email clean-email
                                     :verification/code code
                                     :verification/created_at now
                                     :verification/expires_at (code-expires-at now)
                                     :verification/attempts 0
                                     :verification/used false}
                               ip-address (assoc :verification/ip_address ip-address)
                               user-agent (assoc :verification/user_agent user-agent))]
    
        (log/info "Creating email verification code for" clean-email "with ID" verification-id)
        
        ;; Store the verification code
        (xtdb/submit-tx node [[:xtdb/put verification-doc]])
        
        ;; Send email with code
        (let [email-sent? (email/send-email ctx
                                           {:template :signin-code
                                            :to clean-email
                                            :code code
                                            :user-exists false})]
          (if email-sent?
            {:status "sent" :email clean-email}
            (throw (ex-info "Failed to send verification email" 
                           {:email clean-email :code code})))))))))

(defn verify-email-code! 
  "Verify an email code and mark it as used"
  [{:keys [biff.xtdb/node] :as _ctx} email code]
  (let [clean-email (clean-email email)
        clean-code (str/trim code)
        db (xtdb/db node)
        verification (get-active-verification db clean-email)]
    
    (log/info "Verifying email code for" clean-email "with code" clean-code)
    
    (cond
      (nil? verification)
      {:status "no_code" :message "No active verification code found for this email"}
      
      (expired? verification)
      {:status "expired" :message "Verification code has expired"}
      
      (>= (:verification/attempts verification) MAX_ATTEMPTS_PER_EMAIL)
      {:status "max_attempts" :message "Too many failed attempts"}
      
      (not= clean-code (:verification/code verification))
      (do
        ;; Increment attempts
        (xtdb/submit-tx node [[:xtdb/put 
                              (update verification :verification/attempts inc)]])
        {:status "wrong_code" :message "Invalid verification code"})
      
      :else
      (do
        ;; Mark as used
        (xtdb/submit-tx node [[:xtdb/put 
                              (assoc verification :verification/used true)]])
        {:status "approved" :email clean-email}))))

(defn rate-limit-exceeded? 
  "Check if email sending rate limit has been exceeded"
  [db email]
  (let [recent-attempts (count-recent-attempts db email)]
    (>= recent-attempts MAX_ATTEMPTS_PER_EMAIL)))

(defn count-recent-ip-attempts
  "Count verification attempts for an IP in the last RATE_LIMIT_MINUTES"
  [db ip-address]
  (when ip-address
    (let [cutoff-time (Date. (- (.getTime (Date.)) (* RATE_LIMIT_MINUTES 60 1000)))
          attempts (xtdb/q db
                          '{:find [attempts]
                            :in [ip-address cutoff-time]
                            :where [[v :verification/ip_address ip-address]
                                   [v :db/type :email/verification_code]
                                   [v :verification/created_at created-at]
                                   [(>= created-at cutoff-time)]
                                   [v :verification/attempts attempts]]}
                          ip-address
                          cutoff-time)]
      (reduce + 0 (map first attempts)))))

(defn ip-rate-limit-exceeded?
  "Check if IP-based rate limit has been exceeded"
  [db ip-address]
  (when ip-address
    (let [recent-attempts (count-recent-ip-attempts db ip-address)]
      (>= recent-attempts MAX_ATTEMPTS_PER_IP))))

(defn get-last-code-time
  "Get the timestamp of the last code sent for this email"
  [db email]
  (let [clean-email (clean-email email)
        last-verification (xtdb/q db
                                 '{:find [(max created-at)]
                                   :in [email]
                                   :where [[v :verification/email email]
                                          [v :db/type :email/verification_code]
                                          [v :verification/created_at created-at]]}
                                 clean-email)]
    (ffirst last-verification)))

(defn too-soon-for-new-code?
  "Check if it's too soon to send another code to this email"
  [db email]
  (when-let [last-time (get-last-code-time db email)]
    (let [now (Date.)
          time-diff (- (.getTime now) (.getTime last-time))
          min-delay-ms (* MIN_CODE_DELAY_SECONDS 1000)]
      (< time-diff min-delay-ms))))

(defn is-suspicious-email?
  "Check if email appears to be suspicious (basic checks)"
  [email]
  (let [clean-email (clean-email email)]
    (or
     ;; Check for obvious temporary email domains (basic list)
     (some #(str/includes? clean-email %) ["10minutemail" "tempmail" "guerrillamail" "mailinator"])
     ;; Check for excessive dots or suspicious patterns
     (> (count (filter #(= % \.) clean-email)) 5)
     ;; Check for suspicious characters in succession
     (re-find #"[._-]{3,}" clean-email))))