(ns link-preview.api
  (:require [clojure.data.json :as json]
            [clojure.tools.logging :as log]
            [link-preview.core :as link-preview]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn error-response [error]
  {:status 400
   :headers {"Content-Type" "application/json"}
   :body (json/write-str {:error error})})

(defn try-prepare-preview
  [{:keys [biff/db] :as ctx} url]
  (if-let [preview (link-preview/by-url db url)]
    preview
    (try
      (when-let [new-preview (link-preview/create-preview url)]
        (log/info "new preview" new-preview)
        (let [preview (link-preview/create! ctx new-preview)]
          (log/info "Created preview" preview)
          preview))
      (catch Exception e
        (log/warn "Error creating link preview" e)
        nil))))

(defn post-preview
  [{:keys [biff/db params] :as ctx}]
  (let [urls (get-in params [:urls])]
    (if (and (not (empty? urls)) (every? string? urls))
      (let [previews-futures (map (fn [url]
                                    (future
                                      (try-prepare-preview ctx url)))
                                  urls)
            previews (->> previews-futures
                          (keep deref)
                          (vec))]
        (json-response {:previews previews}))
      (error-response {:error "invalid request"}))))