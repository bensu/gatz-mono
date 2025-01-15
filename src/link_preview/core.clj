(ns link-preview.core
  (:require [clj-http.client :as http]
            [net.cgrand.enlive-html :as html]
            [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.data.json :as json]
            [taoensso.nippy :as nippy]
            [juxt.clojars-mirrors.nippy.v3v1v1.taoensso.nippy :as juxt-nippy]
            [malli.core :as m])
  (:import [java.net URI]
           [org.agrona MutableDirectBuffer]
           [java.nio.charset StandardCharsets]))

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
   [:link_preview/uri uri?]
   [:link_preview/title [:maybe string?]]
   [:link_preview/site_name [:maybe string?]]
   [:link_preview/host [:maybe string?]]
   [:link_preview/description [:maybe string?]]
   [:link_preview/media_type [:maybe string?]]
   [:link_preview/images [:vector
                          [:map
                           [:uri uri?]
                           [:link_preview/width {:optional true} int?]
                           [:link_preview/height {:optional true} int?]]]]
   [:link_preview/videos [:vector
                          [:map
                           [:link_preview/uri uri?]
                           [:link_preview/width {:optional true} int?]
                           [:link_preview/height {:optional true} int?]]]]
   [:link_preview/favicons [:set uri?]]])

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
  (let [uri (URI/create url)
        response (http/get url {:throw-exceptions false})]
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