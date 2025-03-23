(ns gatz.db.location
  (:require [clojure.data.csv :as csv]
            [clojure.java.io :as io]
            [clojure.string :as str])
  (:import [org.locationtech.spatial4j.shape.impl PointImpl]
           [org.locationtech.spatial4j.context SpatialContext]
           [org.locationtech.spatial4j.distance DistanceUtils]
           [com.github.davidmoten.rtree RTree Entry Entries]
           [com.github.davidmoten.rtree.geometry Geometries Point]
           [rx Observable]
           [java.util Iterator]))

;; Major metro regions with their approximate centers and radii
;; Format: [name [lat lng] radius_km]
(def metro-regions
  [["New York City" [40.7128 -74.0060] 50]
   ["Los Angeles" [34.0522 -118.2437] 60]
   ["Chicago" [41.8781 -87.6298] 45]
   ["Houston" [29.7604 -95.3698] 50]
   ["Phoenix" [33.4484 -112.0740] 40]
   ["Miami" [25.7617 -80.1918] 50]
   ["Philadelphia" [39.9526 -75.1652] 40]
   ["San Antonio" [29.4241 -98.4936] 40]
   ["San Diego" [32.7157 -117.1611] 40]
   ["Dallas" [32.7767 -96.7970] 45]
   ["San Jose" [37.3382 -121.8863] 40]
   ["Atlanta" [33.7490 -84.3880] 45]
   ["Boston" [42.3601 -71.0589] 40]
   ["San Francisco" [37.7749 -122.4194] 40]
   ["Detroit" [42.3314 -83.0458] 40]
   ["Seattle" [47.6062 -122.3321] 40]
   ["Minneapolis" [44.9778 -93.2650] 40]
   ["Denver" [39.7392 -104.9903] 40]
   ["Portland" [45.5155 -122.6789] 40]
   ["Las Vegas" [36.1699 -115.1398] 40]
   ["Austin" [30.2672 -97.7431] 40]
   ["Nashville" [36.1627 -86.7816] 40]
   ["New Orleans" [29.9511 -90.0715] 40]
   ["Cleveland" [41.4993 -81.6944] 40]
   ["Pittsburgh" [40.4406 -79.9959] 40]
   ["Cincinnati" [39.1031 -84.5120] 40]
   ["Kansas City" [39.0997 -94.5786] 40]
   ["St. Louis" [38.6270 -90.1994] 40]
   ["Indianapolis" [39.7684 -86.1581] 40]
   ["Columbus" [39.9612 -82.9988] 40]
   ["Charlotte" [35.2271 -80.8431] 40]
   ["Tampa" [27.9506 -82.4572] 40]
   ["Orlando" [28.5383 -81.3792] 40]
   ["San Francisco Bay Area" [37.7749 -122.4194] 60]
   ["Greater Los Angeles" [34.0522 -118.2437] 80]
   ["Greater Chicago" [41.8781 -87.6298] 70]
   ["Greater Houston" [29.7604 -95.3698] 70]
   ["Greater Dallas-Fort Worth" [32.7767 -96.7970] 70]
   ["Greater Washington DC" [38.9072 -77.0369] 50]
   ["Greater Boston" [42.3601 -71.0589] 50]
   ["Greater Atlanta" [33.7490 -84.3880] 60]
   ["Greater Seattle" [47.6062 -122.3321] 50]
   ["Greater Denver" [39.7392 -104.9903] 50]
   ["Greater Portland" [45.5155 -122.6789] 50]
   ["Greater Las Vegas" [36.1699 -115.1398] 50]
   ["Greater Austin" [30.2672 -97.7431] 50]
   ["Greater Nashville" [36.1627 -86.7816] 50]
   ["Greater New Orleans" [29.9511 -90.0715] 50]
   ["Greater Cleveland" [41.4993 -81.6944] 50]
   ["Greater Pittsburgh" [40.4406 -79.9959] 50]
   ["Greater Cincinnati" [39.1031 -84.5120] 50]
   ["Greater Kansas City" [39.0997 -94.5786] 50]
   ["Greater St. Louis" [38.6270 -90.1994] 50]
   ["Greater Indianapolis" [39.7684 -86.1581] 50]
   ["Greater Columbus" [39.9612 -82.9988] 50]
   ["Greater Charlotte" [35.2271 -80.8431] 50]
   ["Greater Tampa" [27.9506 -82.4572] 50]
   ["Greater Orlando" [28.5383 -81.3792] 50]])

;; ====================================================================================
;; Create db with the UNLOCODE data

;; id,metro_region,lat,long
;; AD/ALV,Andorra la Vella,42.5,1.5166667

(def csv-schema
  [:map
   [:id string?]
   [:metro_region string?]
   [:lat float?]
   [:long float?]])

(defn parse-coordinates
  "Convert DDMMN DDDMME format to decimal degrees"
  [coord-str]
  (when (and coord-str (not= coord-str ""))
    (try
      (let [[lat-str lon-str] (str/split coord-str #" ")
            lat-deg (Integer/parseInt (subs lat-str 0 2))
            lat-min (Integer/parseInt (subs lat-str 2 4))
            lat-dir (subs lat-str 4 5)
            lon-deg (Integer/parseInt (subs lon-str 0 3))
            lon-min (Integer/parseInt (subs lon-str 3 5))
            lon-dir (subs lon-str 5 6)
            lat-decimal (float (+ lat-deg (/ lat-min 60.0)))
            lon-decimal (float (+ lon-deg (/ lon-min 60.0)))
            lat-final (if (= lat-dir "S") (- lat-decimal) lat-decimal)
            lon-final (if (= lon-dir "W") (- lon-decimal) lon-decimal)]
        [lat-final lon-final])
      (catch Exception _e
        (println "Error parsing coordinates:" coord-str)
        [nil nil]))))

(defn transform-data
  "Transform UN/LOCODE CSV to id,metro_region,lat,long format"
  [input-file writer]
  (with-open [reader (io/reader input-file)]
    (doseq [[country-code location-code location-name _ coordinates] (csv/read-csv reader)]
      (let [id (str country-code "/" location-code)
            [lat lon] (parse-coordinates coordinates)]
        (when (and lat lon)
          (csv/write-csv writer [[id location-name (str lat) (str lon)]]))))))

;; Execute the transformation
(comment

  (with-open [writer (io/writer (io/file "resources/location/metro_regions.csv"))]

    (csv/write-csv writer [["id" "metro_region" "lat" "long"]])

    (let [input-file (io/file "resources/location/unlocode/2024-2_UNLOCODE_CodeListPart1.csv")]
      (println "Transforming" input-file "to" writer)
      (transform-data input-file writer)
      (println "Transformation complete. Output written to" writer))
    (let [input-file (io/file "resources/location/unlocode/2024-2_UNLOCODE_CodeListPart2.csv")]
      (println "Transforming" input-file "to" writer)
      (transform-data input-file writer)
      (println "Transformation complete. Output written to" writer))
    (let [input-file (io/file "resources/location/unlocode/2024-2_UNLOCODE_CodeListPart3.csv")]
      (println "Transforming" input-file "to" writer)
      (transform-data input-file writer)
      (println "Transformation complete. Output written to" writer))))


;; ====================================================================================
;; Create spatial index

(defrecord Metro [^String id ^String name ^double lat ^double lon])

(defn parse-metro-row [row]
  (let [[id metro-name lat-str lon-str] row]
    (Metro. id metro-name (Double/parseDouble lat-str) (Double/parseDouble lon-str))))

(defn build-spatial-index
  "Build a spatial index using Spatial4j and RTree for metro regions"
  [csv-file]
  (let [context (SpatialContext/GEO)
        base-tree (.create (.maxChildren (RTree/star) 10))]  ; Start with empty RTree
    (with-open [reader (io/reader csv-file)]
      (loop [tree base-tree
             id->metro (transient {})
             rows (rest (csv/read-csv reader))]
        (if-let [row (first rows)]
          (let [^Metro metro (parse-metro-row row)
                lon (.lon metro)
                lat (.lat metro)
                ^Point point (Geometries/point lon lat)
                ^Entry entry (Entries/entry metro point)]
            (recur (.add tree entry)
                   (assoc! id->metro (.id metro) metro)
                   (rest rows)))
          {:context context
           :rtree tree
           :id->metro (persistent! id->metro)})))))

(defn entry->distance
  [^SpatialContext context ^Point query-point ^Entry entry]
  (let [^Metro metro (.value entry)
        metro-point (PointImpl. (:lon metro) (:lat metro) context)
        dist (.distance (.getDistCalc context)
                        metro-point
                        query-point)]
    (assoc metro :distance-km (* dist DistanceUtils/DEG_TO_KM))))

(def default-radius-km 100.0)

(defn find-metro-region
  "Find the metro region that contains the given coordinates"
  [spatial-index ^double lat ^double lon]
  (let [^SpatialContext context (:context spatial-index)
        ^double radius-km default-radius-km
        ^RTree rtree (:rtree spatial-index)
        ^Point point (Geometries/point lon lat)
        radius-deg (/ radius-km 111.0)
        ;; Query the RTree for potential matches
        ^Observable results-observable (.search rtree point radius-deg)
        ;; metros (iterator-seq (.iterator matches))
        ^Iterator it (.getIterator (.toBlocking results-observable))
        ^Point query-point (PointImpl. lon lat context)]
    ;; Calculate distances and return the closest match
    (->> (iterator-seq it)
         (map (partial entry->distance context query-point))
         (sort-by :distance-km)
         (first))))

(def spatial-index
  (build-spatial-index (io/resource "location/metro_regions.csv")))

;; ====================================================================================
;; API

(defn metro->location [^Metro metro]
  {:location/id (:id metro)
   :location/name (:name metro)
   :location/lat (:lat metro)
   :location/lng (:lon metro)})

(defn params->location [location]
  (let [{:keys [latitude longitude]} (:coords location)]
    (some-> (find-metro-region spatial-index latitude longitude)
            metro->location)))

(defn by-id [location-id]
  (get (:id->metro spatial-index) location-id))

