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

(defn by-id [db id]
  {:pre [(uuid? id)]}
  (into {} (xtdb/entity db id)))

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

(defn get-images
  "Extract image information from HTML"
  [resource base-uri]
  (let [og-images (html/select resource [(html/attr= :property "og:image")])
        og-widths (html/select resource [(html/attr= :property "og:image:link_preview/width")])
        og-heights (html/select resource [(html/attr= :property "og:image:link_preview/height")])]
    (if (seq og-images)
      (->> (map (fn [img w h]
                  {:link_preview/uri (-> img :attrs :content URI/create)
                   :link_preview/width (some-> w :attrs :content try-parse-int)
                   :link_preview/height (some-> h :attrs :content try-parse-int)})
                og-images
                (concat og-widths (repeat nil))
                (concat og-heights (repeat nil)))
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
                   (map #(.resolve base-uri %))
                   (distinct)
                   (take 10)
                   set)]
    (if (empty? icons)
      #{(.resolve base-uri "/favicon.ico")}
      icons)))

(defn get-videos
  "Extract video information from HTML"
  [resource]
  (->> (concat
        (html/select resource [(html/attr= :property "og:video:secure_url")])
        (html/select resource [(html/attr= :property "og:video:url")]))
       (map #(-> % :attrs :content))
       (distinct)
       (take 10)
       (mapv (fn [url]
               {:link_preview/uri (URI/create url)
                :link_preview/width (some-> (get-meta-content resource "og:video:link_preview/width")
                                            try-parse-int)
                :link_preview/height (some-> (get-meta-content resource "og:video:link_preview/height")
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
     :link_preview/images (get-images resource base-uri)
     :link_preview/videos (get-videos resource)
     :link_preview/favicons (get-favicons resource base-uri)}))

(defn create-preview
  "Create a preview from a URL. Returns a map conforming to preview-schema"
  [url]
  (log/info "(no cookies) Creating preview for" url)
  (let [response (http/with-middleware http-middleware
                   (http/get url {:timeout 3000
                                  :throw-exceptions false
                                  ;; Disable cookie handling completely
                                  ;; Twitter sends malformed cookies
                                  :cookie-policy :none
                                  :cookies {}
                                  :cookie-store nil}))]
    (log/info "Request succeeded" url)
    (when (= (:status response) 200)
      (when-let [content-type (get-in response [:headers "content-type"])]
        (when (str/includes? content-type "text/html")
          (create-preview-from-html url (:body response)))))))

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