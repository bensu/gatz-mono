(ns gatz.admin
  "Admin functionality for user authentication migration reporting"
  (:require [clojure.data.csv :as csv]
            [clojure.data.json :as json]
            [clojure.tools.logging :as log]
            [gatz.db.user :as db.user]))

;; ======================================================================
;; User Authentication Migration Status

(defn user-migration-status
  "Determines if user has migrated from SMS auth and their active method"
  [user]
  (let [{:user/keys [apple_id google_id email phone_number]} user
        migrated? (boolean (or apple_id google_id email))
        active-method (cond
                        apple_id "apple"
                        google_id "google" 
                        email "email"
                        phone_number "sms"
                        :else "unknown")]
    {:migrated migrated?
     :active_method active-method}))

(defn generate-user-migration-csv-data
  "Generate CSV data structure for user authentication migration report"
  [users]
  (let [user-rows (mapv (fn [user]
                          (let [{:keys [migrated active_method]} (user-migration-status user)]
                            [(str (:xt/id user))
                             (:user/name user)
                             (if migrated "true" "false")
                             active_method]))
                        users)
        migrated-count (count (filter #(= "true" (nth % 2)) user-rows))
        non-migrated-count (- (count user-rows) migrated-count)
        
        ;; CSV header
        header ["id" "name" "migrated" "active_method"]
        
        ;; Totals section
        totals [[]  ; Empty row for spacing
                ["TOTALS"]
                ["Migrated" migrated-count]
                ["Non-migrated" non-migrated-count]]
        
        ;; Combine all parts
        all-rows (concat [header] user-rows totals)]
    
    all-rows))

(defn generate-user-migration-csv-string
  "Generate CSV string content for user authentication migration report"
  [users]
  (let [csv-data (generate-user-migration-csv-data users)]
    (with-out-str
      (csv/write-csv *out* csv-data))))

(defn user-auth-migration-report
  "Admin endpoint to export user authentication migration status as CSV file"
  [{:keys [biff/db] :as _ctx}]
  (try
    (let [users (db.user/all-users db)
          csv-content (generate-user-migration-csv-string users)
          filename "user-auth-migration-report.csv"
          timestamp (.format (java.time.format.DateTimeFormatter/ofPattern "yyyyMMdd-HHmmss")
                            (java.time.LocalDateTime/now))
          filename-with-timestamp (str "user-auth-migration-report-" timestamp ".csv")]
      {:status 200
       :headers {"Content-Type" "text/csv; charset=utf-8"
                 "Content-Disposition" (str "attachment; filename=\"" filename-with-timestamp "\"")
                 "Cache-Control" "no-cache, no-store, must-revalidate"
                 "Pragma" "no-cache"
                 "Expires" "0"
                 "Content-Length" (str (count (.getBytes csv-content "UTF-8")))}
       :body csv-content})
    (catch Exception e
      (log/error e "Error generating user migration report")
      {:status 500
       :headers {"Content-Type" "application/json"}
       :body (json/write-str {:error "Internal server error generating report"})})))