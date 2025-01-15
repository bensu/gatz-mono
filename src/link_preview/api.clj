(ns link-preview.api
  (:require [clojure.data.json :as json]
            [link-preview.core :as link-preview]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

#_(defn post-preview
    [{:keys [params] :as ctx}]
    (let [url (get-in params [:url])
          html-str (get-in params [:html])]
      (create-preview-from-html url html-str)))
