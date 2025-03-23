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

;; To add a new metro, add it to this CSV and check that 
;; it has a corresponding entry in the UNLOCODE CSV
(defn load-selected-metro-ids []
  (with-open [reader (io/reader (io/resource "location/selected_metros.csv"))]
    (set (map first (rest (csv/read-csv reader))))))

(def selected-metro-ids (load-selected-metro-ids))

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

;; TODO: Filter only the large metro regions so that there are fewer matches
;; and it is always the same ones
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
            ;; We only keep the selected metros
            (if (contains? selected-metro-ids (.id metro))
              (recur (.add tree entry)
                     (assoc! id->metro (.id metro) metro)
                     (rest rows))
              (recur tree id->metro (rest rows))))
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

(def spatial-index
  (build-spatial-index (io/resource "location/metro_regions.csv")))

(defn find-metro-region
  "Find the metro region that contains the given coordinates"
  [^double lat ^double lon]
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

;; ====================================================================================
;; API

(defn metro->location [^Metro metro]
  {:location/id (:id metro)
   :location/name (:name metro)
   :location/lat (:lat metro)
   :location/lng (:lon metro)})

(defn params->location [location]
  (let [{:keys [latitude longitude]} (:coords location)]
    (some-> (find-metro-region latitude longitude)
            metro->location)))

(defn by-id [location-id]
  (get (:id->metro spatial-index) location-id))

