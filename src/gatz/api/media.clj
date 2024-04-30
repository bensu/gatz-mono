(ns gatz.api.media
  "All the operations but in an API"
  (:require [clojure.data.json :as json]
            [gatz.db.media :as db.media]
            [malli.transform :as mt]
            [sdk.s3 :as s3]
            [xtdb.api :as xtdb])
  (:import [java.time Instant Duration]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (json-response {:type "error" :error err-type :message err-msg}))



(def folders #{"media" "avatars"})

(defn presigned-url! [{:keys [params biff/secret] :as ctx}]
  (let [folder (get params :folder)]
    (if (contains? folders folder)
      (let [id (random-uuid)
            k  (format "%s/%s" folder id)
            presigned (.toString
                       (s3/presigned-url! ctx k))]
        (json-response {:id id
                        :presigned_url presigned
                        :url (s3/make-path secret k)}))
      (err-resp "invalid_folder" "Invalid folder"))))

(def media-kinds (set (map name db.media/media-kinds)))

(defn str->media-kind [s]
  {:pre [(string? s)
         (contains? media-kinds s)]}
  (keyword "media" s))

;; TODO: fill in the other elements of the media type
;; TODO: this should be authenticated
(defn create-media!
  [{:keys [params] :as ctx}]
  (if (and (string? (:file_url params))
           (string? (:kind params))
           (contains? media-kinds (:kind params)))
    (if-let [id (some-> (:id params) mt/-string->uuid)]
      (if-let [media-kind (str->media-kind (:kind params))]
        (let [media (db.media/create-media! ctx {:kind media-kind
                                                 :id id
                                      ;; :mime (:mime params)
                                                 :size (:size params)
                                                 :height (:height params)
                                                 :width (:width params)
                                                 :url (:file_url params)})]
          (json-response {:media media}))
        (err-resp "invalid_media_type" "Invalid media type"))
      (err-resp "invalid_id" "Invalid id"))
    (err-resp "invalid_params" "Invalid params")))

