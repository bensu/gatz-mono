(ns link-preview.core-test
  (:require [clojure.test :refer [deftest is testing]]
            [link-preview.core :refer :all]
            [clojure.data.json :as json]
            [clojure.edn :as edn]
            [clj-http.client :as http]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [clojure.pprint :as pprint]))


(deftest preview-generation-test
  (testing "Preview generation matches expected results"
    (let [html-dir (io/file "resources/test/link_preview/html")
          expected-results (edn/read-string
                            {:readers {'java/uri read-uri}}
                            (slurp "resources/test/link_preview/previews_results.edn"))
          files (filter #(.isFile %) (.listFiles html-dir))]
      (doseq [file files]
        (let [filename (.getName file)
              url (str "https://" (str/replace filename #"\.html$" ""))
              html-str (slurp file)
              actual-preview (create-preview-from-html url html-str)
              expected-preview (get expected-results filename)]
          (testing (str "Testing preview for " filename)
            (is (= expected-preview actual-preview))))))))

;; ================================
;; Scripts to fetch test data

(defn fetch-and-save-html
  "Fetches HTML content from URLs and saves them to resources/tests/link_preview
   urls-and-files should be a sequence of [url filename] pairs"
  [urls-and-files]
  (doseq [[url filename] urls-and-files]
    (try
      (let [response (http/get url {:throw-exceptions false})
            content-type (get-in response [:headers "content-type"])]
        (when (and (= (:status response) 200)
                   (some? content-type)
                   (clojure.string/includes? content-type "text/html"))
          (let [dir (io/file "resources/tests/link_preview/html/")]
            (.mkdirs dir)
            (spit (io/file dir filename) (:body response))
            (println "Saved" url "to" filename))))
      (catch Exception e
        (println "Failed to fetch" url ":" (.getMessage e))))))

(defn sanitize-filename [url]
  (-> url
      (str/replace #"https?://(www\.)?" "")
      (str/split #"[/?#]")
      first
      (str ".html")))

(defn fetch-important-sites []
  (let [urls (-> "resources/test/link_preview/important_sites_urls.txt"
                 io/reader
                 line-seq)]
    (fetch-and-save-html
     (map (fn [url] [url (sanitize-filename url)]) urls))))

(defn process-html-files []
  (let [html-dir (io/file "resources/test/link_preview/html")
        files (filter #(.isFile %) (.listFiles html-dir))
        results (reduce (fn [acc file]
                          (let [filename (.getName file)
                                url (str "https://" (str/replace filename #"\.html$" ""))
                                html-str (slurp file)
                                preview (create-preview-from-html url html-str)]
                            (if preview
                              (assoc acc filename preview)
                              acc)))
                        {}
                        files)]
    (with-open [w (io/writer "resources/test/link_preview/previews_results.edn")]
      (clojure.pprint/pprint results w))))

(comment
  ;; Process HTML files and generate previews.edn
  (process-html-files)

  ;; fetch HTML files for testing without making HTTP requests
  (fetch-important-sites)

  (fetch-and-save-html
   [["https://github.com/bensu" "github.html"]
    ["https://twitter.com/bensu" "twitter.html"]
    ["https://news.ycombinator.com" "hn.html"]]))
