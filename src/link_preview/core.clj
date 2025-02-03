(ns link-preview.core
  (:require [clj-http.client :as http]
            [clj-http.headers :as http.headers]
            [clj-http.links :as http.links]
            [clojure.tools.logging :as log]
            [com.biffweb :as biff :refer [q]]
            [clojure.string :as str]
            [clojure.data.json :as json]
            [crdt.ulid :as ulid]
            [malli.util :as mu]
            [malli.core :as m]
            [net.cgrand.enlive-html :as html]
            [taoensso.nippy :as nippy]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [xtdb.api :as xtdb]
            [xtdb.codec])
  (:import [java.net URI]
           [org.agrona MutableDirectBuffer]
           [java.nio.charset StandardCharsets]))

;; Custom HTTP client to avoid cookies

(def http-middleware
  "The default list of middleware clj-http uses for wrapping requests."
  [http/wrap-request-timing
   http.headers/wrap-header-map
   http/wrap-query-params
   http/wrap-basic-auth
   http/wrap-oauth
   http/wrap-user-info
   http/wrap-url
   http/wrap-decompression
   http/wrap-input-coercion
   ;; put this before output-coercion, so additional charset
   ;; headers can be used if desired
   http/wrap-additional-header-parsing
   http/wrap-output-coercion
   http/wrap-exceptions
   http/wrap-accept
   http/wrap-accept-encoding
   http/wrap-content-type
   http/wrap-form-params
   http/wrap-nested-params
   http/wrap-flatten-nested-params
   http/wrap-method
   ;; Disable cookies because Twitter sends malformed cookies
   ;; http.cookies/wrap-cookies
   http.links/wrap-links
   http/wrap-unknown-host])


;; ================================
;; Add EDN reader/writer support for java.net.URI

(defmethod print-method URI [^URI uri ^java.io.Writer w]
  (.write w (str "#java/uri \"" uri "\"")))

(defmethod print-dup URI [^URI uri ^java.io.Writer w]
  (.write w (str "#=(link-preview.core/read-uri " (pr-str (.toString uri)) ")")))

(defn read-uri [s]
  (URI/create s))

(extend-type URI
  xtdb.codec/IdToBuffer
  (id->buffer [^URI uri ^MutableDirectBuffer to]
    (xtdb.codec/id-function to (.getBytes (.toString uri) StandardCharsets/UTF_8)))

  juxt-nippy/IFreezable1
  (-freeze-without-meta! [this out]
    (nippy/freeze-to-out! out this))

  json/JSONWriter
  (-write [^URI uri ^Appendable out _options]
    (.append out \")
    (.append out (.toString uri))
    (.append out \")))

;; ================================
;; Create preview from HTML

(def LinkPreview
  [:map
   [:xt/id uuid?]
   [:db/type [:enum :link-preview/preview]]
   [:db/version [:enum 1]]
   [:link_preview/created_at inst?]
   [:link_preview/url string?]

   [:link_preview/uri uri?]
   [:link_preview/title [:maybe string?]]
   [:link_preview/site_name [:maybe string?]]
   [:link_preview/host [:maybe string?]]
   [:link_preview/description [:maybe string?]]
   [:link_preview/media_type [:maybe string?]]
   [:link_preview/html [:maybe string?]]
   [:link_preview/images [:vector
                          [:map
                           [:link_preview/uri uri?]
                           [:link_preview/width [:maybe int?]]
                           [:link_preview/height [:maybe int?]]]]]
   [:link_preview/videos [:vector
                          [:map
                           [:link_preview/uri uri?]
                           [:link_preview/width [:maybe int?]]
                           [:link_preview/height [:maybe int?]]]]]
   [:link_preview/favicons [:set uri?]]])

(def data-keys
  [:link_preview/uri
   :link_preview/title
   :link_preview/site_name
   :link_preview/host
   :link_preview/description
   :link_preview/media_type
   :link_preview/images
   :link_preview/videos
   :link_preview/favicons
   :link_preview/videos
   :link_preview/favicons])

(def LinkPreviewData
  (mu/select-keys LinkPreview data-keys))

(defn create!
  [ctx {:keys [xt/id] :as preview}]

  {:pre [(or (nil? id) (uuid? id))]}

  (when preview
    (assert (m/validate LinkPreviewData (dissoc preview :xt/id)))
    (let [now (java.util.Date.)
          preview-id (or id (ulid/rand-uuid))
          preview (assoc preview
                         :db/doc-type :link-preview/preview
                         :db/type :link-preview/preview
                         :db/version 1
                         :xt/id preview-id
                         :link_preview/url (str (:link_preview/uri preview))
                         :link_preview/created_at now)]
      (biff/submit-tx ctx [preview])
      preview)))

;; Shouldn't be necessary in prod
(def link-preview-defaults
  {:link_preview/html nil})

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (merge link-preview-defaults (xtdb/entity db id)))

(defn by-url [db url]
  {:pre [(string? url)]}
  (ffirst
   (q db '{:find [(pull e [*])]
           :in [url]
           :where [[e :link_preview/url url]]}
      url)))

;; ==================================================================
;; Extract

(def url-regex #"(?i)(https?://)?([\\w.-]+)(\\.\\w{2,})+(?::(\\d+))?([/\\w.?=-]*)")

(defn try-parse-int
  "Safely parse an integer, returns nil if parsing fails"
  [s]
  (try
    (Integer/parseUnsignedInt s)
    (catch NumberFormatException _
      nil)))

(defn get-meta-content
  "Extract meta content from HTML resource using property or name attribute"
  [resource type]
  (or
   (some-> (html/select resource [(html/attr= :property type)])
           first
           :attrs
           :content)
   (some-> (html/select resource [(html/attr= :name type)])
           first
           :attrs
           :content)))

(defn get-title
  "Get title from meta tags or fallback to title tag"
  [resource]
  (or (get-meta-content resource "og:link_preview/title")
      (some-> (html/select resource [:link_preview/title]) first html/text)
      ""))

(defn to-absolute [url-str base-uri]
  (when url-str
    (try
      (let [uri (URI/create url-str)]
        (if (.isAbsolute uri)
          uri
          (.resolve base-uri url-str)))
      (catch Exception _
        (.resolve base-uri url-str)))))

(defn get-images
  "Extract image information from HTML"
  [resource base-uri]
  (let [og-images (html/select resource [(html/attr= :property "og:image")])
        og-widths (html/select resource [(html/attr= :property "og:image:width")])
        og-heights (html/select resource [(html/attr= :property "og:image:height")])]
    (if (seq og-images)
      (->> (map (fn [img w h]
                  {:link_preview/uri (some-> img :attrs :content (to-absolute base-uri))
                   :link_preview/width (some-> w :attrs :content try-parse-int)
                   :link_preview/height (some-> h :attrs :content try-parse-int)})
                og-images
                (concat og-widths (repeat nil))
                (concat og-heights (repeat nil)))
           (filter :link_preview/uri)
           (take 10)
           vec)
      []
      #_(let [img-src (html/select resource [(html/attr= :rel "image_src")])]
          (if (-> img-src first :attrs :href)
            [(let [href (-> img-src first :attrs :href)]
               {:link_preview/uri (.resolve base-uri href)})]
            (->> (html/select resource [:img])
                 (keep (fn [img]
                         (when-let [attrs (:attrs img)]
                           {:link_preview/uri (.resolve base-uri (:src attrs))
                            :link_preview/width (try-parse-int (:link_preview/width attrs))
                            :link_preview/height (try-parse-int (:link_preview/height attrs))})))
                 vec))))))

(defn get-favicons
  "Extract favicon information from HTML"
  [resource base-uri]
  (let [icons (->> ["icon" "shortcut icon" "apple-touch-icon"]
                   (mapcat #(html/select resource [(html/attr= :rel %)]))
                   (map #(-> % :attrs :href))
                   (keep #(to-absolute % base-uri))
                   (distinct)
                   (take 10)
                   set)]
    (if (empty? icons)
      #{(to-absolute "/favicon.ico" base-uri)}
      icons)))

(defn get-videos
  "Extract video information from HTML"
  [resource base-uri]
  (->> (concat
        (html/select resource [(html/attr= :property "og:video:secure_url")])
        (html/select resource [(html/attr= :property "og:video:url")]))
       (map #(-> % :attrs :content))
       (keep #(to-absolute % base-uri))
       (distinct)
       (take 10)
       (mapv (fn [uri]
               {:link_preview/uri uri
                :link_preview/width (some-> (get-meta-content resource "og:video:width")
                                            try-parse-int)
                :link_preview/height (some-> (get-meta-content resource "og:video:height")
                                             try-parse-int)}))))

(defn create-preview-from-html
  "Create a preview from HTML source directly. Returns a map conforming to preview-schema"
  [url html-str]
  (let [resource (-> html-str java.io.StringReader. html/html-resource)
        base-uri (URI/create url)]
    {:link_preview/uri base-uri
     :link_preview/url (str base-uri)
     :link_preview/title (get-title resource)
     :link_preview/host (.getHost base-uri)
     :link_preview/site_name (or (get-meta-content resource "og:site_name") "")
     :link_preview/description (or (get-meta-content resource "description")
                                   (get-meta-content resource "Description")
                                   (get-meta-content resource "og:description")
                                   "")
     :link_preview/media_type (str/lower-case
                               (or (get-meta-content resource "medium")
                                   (get-meta-content resource "og:type")
                                   "website"))
     :link_preview/html nil
     :link_preview/images (get-images resource base-uri)
     :link_preview/videos (get-videos resource base-uri)
     :link_preview/favicons (get-favicons resource base-uri)}))

;; ==================================================================
;; Oembed

;; If x.com or twitter.com, use the oembed API

;; https://developer.x.com/en/docs/x-for-websites/embedded-tweets/guides/embedded-tweet-parameter-reference

(comment
  ;; Response from oembed API
  {:author_url "https://twitter.com/TheBabylonBee",
   :width 550,
   :type "rich",
   :provider_name "Twitter",
   :cache_age "3153600000",
   :url "https://twitter.com/TheBabylonBee/status/1861454974426722737",
   :author_name "The Babylon Bee",
   :version "1.0",
   :provider_url "https://twitter.com", :height nil,
   :html "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">Trump Proposes 25 Percent Tariff On Imports From California <a href=\"https://t.co/dfF52auITC\">https://t.co/dfF52auITC</a> <a href=\"https://t.co/rLytnSDy3i\">pic.twitter.com/rLytnSDy3i</a></p>&mdash; The Babylon Bee (@TheBabylonBee) <a href=\"https://twitter.com/TheBabylonBee/status/1861454974426722737?ref_src=twsrc%5Etfw\">November 26, 2024</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n\n"})

(defn create-preview-from-oembed-twitter
  "Create a preview from a URL using the oembed API"
  [url]
  (log/info "(oembed) Creating preview for" url)
  (let [response (http/get (str "https://publish.twitter.com/oembed?url=" url)
                           {:timeout 3000
                            :throw-exceptions false
                            :cookie-policy :none
                            :cookies {}
                            :cookie-store nil})]
    (log/info "(oembed) Request succeeded" url)
    (when (= (:status response) 200)
      (try
        (let [embed (json/read-str (:body response) :key-fn keyword)
              uri (URI/create url)]
          {:link_preview/uri uri
           :link_preview/url (str uri)
           :link_preview/title nil
           :link_preview/host (.getHost uri)
           :link_preview/site_name (:provider_name embed)
           :link_preview/description nil
           :link_preview/media_type "tweet"
           :link_preview/images []
           :link_preview/videos []
           :link_preview/favicons #{}
           :link_preview/html (:html embed)})
        (catch Exception e
          ;; TODO: report to Sentry
          (throw e))))))


;; "https://publish.twitter.com/oembed?url="
;; "https://x.com/TheBabylonBee/status/1861454974426722737"

(defn twitter? [url]
  (and (or (str/starts-with? url "https://x.com/")
           (str/starts-with? url "https://twitter.com/"))
       (str/includes? url "/status/")))


;; https://www.youtube.com/oembed?url=VIDEO_URL&format=json
(comment
  {:author_url "https://www.youtube.com/@paramountpictures",
   :thumbnail_height 360,
   :thumbnail_url "https://i.ytimg.com/vi/-lsFs2615gw/hqdefault.jpg",
   :width 200,
   :type "video",
   :title "Mission: Impossible - Dead Reckoning Part One | The Biggest Stunt in Cinema History (Tom Cruise)",
   :provider_name "YouTube",
   :author_name "Paramount Pictures",
   :thumbnail_width 480,
   :version "1.0",
   :provider_url "https://www.youtube.com/",
   :height 113,
   :html "<iframe width=\"200\" height=\"113\" src=\"https://www.youtube.com/embed/-lsFs2615gw?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Mission: Impossible - Dead Reckoning Part One | The Biggest Stunt in Cinema History (Tom Cruise)\"></iframe>"})

(defn parse-title-and-description-youtube
  [embed]
  (let [title (:title embed)
        [title description] (str/split title #" \| ")]
    [title description]))

(defn create-preview-from-oembed-youtube
  "Create a preview from a URL using the oembed API"
  [url]
  (log/info "(oembed) Creating preview for" url)
  (let [response (http/get (format "https://www.youtube.com/oembed?url=%s&format=json" url)
                           {:timeout 3000
                            :throw-exceptions false
                            :cookie-policy :none
                            :cookies {}
                            :cookie-store nil})]
    (log/info "status" (:status response))
    (when (= (:status response) 200)
      (log/info "(oembed) Request succeeded" url)
      (log/info "yt response" (:body response))
      (try
        (let [embed (json/read-str (:body response) :key-fn keyword)
              uri (URI/create url)
              [title description] (parse-title-and-description-youtube embed)]
          {:link_preview/uri uri
           :link_preview/url (str uri)
           :link_preview/title title
           :link_preview/host (.getHost uri)
           :link_preview/site_name (:provider_name embed)
           :link_preview/description description
           :link_preview/media_type "video"
           :link_preview/images [{:link_preview/uri (URI/create (:thumbnail_url embed))
                                  :link_preview/width (:thumbnail_width embed)
                                  :link_preview/height (:thumbnail_height embed)}]
           :link_preview/videos []
           :link_preview/favicons #{#java/uri "https://www.youtube.com/s/desktop/024ccc3d/img/logos/favicon.ico"}
           :link_preview/html nil})
        (catch Exception e
          ;; TODO: report to Sentry
          (log/error "Failed to get Youtube oembed" e)
          (throw e))))))

(defn youtube? [url]
  (or (str/starts-with? url "https://www.youtube.com/")
      (str/starts-with? url "http://www.youtube.com/")
      (str/starts-with? url "https://youtu.be/")
      (str/starts-with? url "http://youtu.be")))

(defn fetch-url! [url]
  (http/with-middleware http-middleware
    (http/get url {:timeout 3000
                   :save-request? true
                   :throw-exceptions false
                                      ;; Disable cookie handling completely
                                      ;; Twitter sends malformed cookies
                   :cookie-policy :none
                   :cookies {}
                   :cookie-store nil
                   :headers {"User-Agent" "WhatsApp/2"}})))

(defn create-preview
  "Create a preview from a URL. Returns a map conforming to preview-schema"
  [url]
  (cond
    (twitter? url) (create-preview-from-oembed-twitter url)
    (youtube? url) (create-preview-from-oembed-youtube url)
    :else (do
            (log/info "(no cookies) Creating preview for" url)
            (let [response (fetch-url! url)]
              (log/info "Request succeeded" url)
              (when (= (:status response) 200)
                (when-let [content-type (get-in response [:headers "content-type"])]
                  (when (str/includes? content-type "text/html")
                    (create-preview-from-html url (:body response)))))))))

(defn create-previews
  "Create previews from text containing URLs"
  [text]
  (->> (re-seq url-regex text)
       (map first)
       (keep (fn [url]
               (try
                 (create-preview url)
                 (catch Exception _
                   nil))))))