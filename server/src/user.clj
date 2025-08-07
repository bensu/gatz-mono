(ns user
  "Used to run ad-hoc scripts"
  (:require [clojure.data.csv :as csv]
            [clojure.java.io :as io]))

(comment

  ;; 2024-10-20: Check what countries have Twilio verifications
  (def twilio-logs (io/resource "twilio-logs.csv"))

  (defn extract-country-codes [csv-data]
    (let [header (first csv-data)
          rows (rest csv-data)
          country-index (.indexOf header "country")]
      (set (map #(nth % country-index) rows))))


  (defn read-csv []
    (with-open [reader (io/reader twilio-logs)]
      (doall
       (csv/read-csv reader))))

  (let [csv-data (read-csv)
        country-codes (extract-country-codes csv-data)]
    (def -country-codes country-codes)
    -country-codes))

