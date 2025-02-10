(ns gatz.api.media
  "All the operations but in an API"
  (:require [clojure.data.json :as json]
            [gatz.db.media :as db.media]
            [gatz.util :as util]
            [sdk.posthog :as posthog]
            [sdk.s3 :as s3]))

(defn json-response [body]
  {:status 200
   :headers {"Content-Type" "application/json"}
   :body (json/write-str body)})

(defn err-resp [err-type err-msg]
  (-> {:type "error" :error err-type :message err-msg}
      (json-response)
      (assoc :status 400)))

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

(def str-media-kinds (set (map name db.media/media-kinds)))

(defn str->media-kind [s]
  {:pre [(string? s)]
   :post [(or (nil? %) (contains? db.media/media-kinds %))]}
  (when (contains? str-media-kinds s)
    (keyword "media" s)))

(def create-params
  [:map
   [:id uuid?]
   [:file_url string?]
   [:kind [:enum "img" "vid"]]
   [:height [:maybe int?]]
   [:width [:maybe int?]]
   [:size [:maybe int?]]])

(defn parse-create-params [{:keys [id file_url kind height width size]}]
  (cond-> {}
    (string? id) (assoc :id (util/parse-uuid id))
    (string? file_url) (assoc :file_url file_url)
    (string? kind) (assoc :kind (str->media-kind kind))
    (number? height) (assoc :height height)
    (number? width) (assoc :width width)
    (number? size) (assoc :size size)))

;; TODO: fill in the other elements of the media type
;; TODO: this should be authenticated
(defn create-media!
  [{:keys [params] :as ctx}]
  (let [params (parse-create-params params)]
    (if-let [id (:id params)]
      (if-let [media-kind (:kind params)]
        (let [media (db.media/create-media! ctx {:kind media-kind
                                                 :id id
                                                 :size (:size params)
                                                 :height (:height params)
                                                 :width (:width params)
                                                 :url (:file_url params)})]
          (posthog/capture! ctx "media.new" {:media_id id :media_kind media-kind})
          (json-response {:media media}))
        (err-resp "invalid_media_type" "Invalid media type"))
      (err-resp "invalid_id" "Invalid id"))))

