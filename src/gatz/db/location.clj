(ns gatz.db.location)

;; TODO: check it these are real

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

(def name->lat-long
  (reduce (fn [acc [name [lat lng]]]
            (assoc acc name [lat lng]))
          {}
          metro-regions))

(defn distance-km
  "Calculate the distance between two points in kilometers using the Haversine formula"
  [[lat1 lon1] [lat2 lon2]]
  (let [r 6371  ;; Earth's radius in kilometers
        dlat (Math/toRadians (- lat2 lat1))
        dlon (Math/toRadians (- lon2 lon1))
        a (+ (* (Math/sin (/ dlat 2)) (Math/sin (/ dlat 2)))
             (* (Math/cos (Math/toRadians lat1))
                (Math/cos (Math/toRadians lat2))
                (Math/sin (/ dlon 2))
                (Math/sin (/ dlon 2))))
        c (* 2 (Math/atan2 (Math/sqrt a) (Math/sqrt (- 1 a))))]
    (* r c)))

(defn find-metro-region
  "Find the closest metro region to the given coordinates.
   Returns a map with :name, :lat, :lng, and :radius_km, or nil if no region is found."
  [lat lng]
  (let [point [lat lng]
        regions (map (fn [[name center radius]]
                       {:name name
                        :lat (first center)
                        :lng (second center)
                        :radius_km radius})
                     metro-regions)
        distances (map (fn [region]
                         (assoc region
                                :distance_km
                                (distance-km point [(:lat region) (:lng region)])))
                       regions)
        closest (apply min-key :distance_km distances)]
    (when (<= (:distance_km closest) (:radius_km closest))
      (select-keys closest [:name :lat :lng :radius_km]))))

(defn create-location
  "Create a new Location entity with the given coordinates.
   Returns nil if no metro region is found."
  [lat lng]
  (when-let [metro (find-metro-region lat lng)]
    {:location/id (:name metro)
     :location/slug (:name metro)
     :location/metro_region (:name metro)
     :location/lat (:lat metro)
     :location/lng (:lng metro)
     :location/radius_km (:radius_km metro)}))

(defn location-changed-significantly?
  "Check if the new location is significantly different from the old one.
   Returns true if:
   1. The old location is nil (first time)
   2. The new location is in a different metro region
   3. The distance between old and new is greater than the radius of either region"
  [old-loc new-loc]
  (or (nil? old-loc)
      (not= (:location/metro_region old-loc)
            (:location/metro_region new-loc))
      (> (distance-km [(:location/lat old-loc) (:location/lng old-loc)]
                      [(:location/lat new-loc) (:location/lng new-loc)])
         (max (:location/radius_km old-loc)
              (:location/radius_km new-loc)))))

;; Example of a location object from iOS

(defn params->location [location]
  (let [{:keys [latitude longitude]} (:coords location)]
    (create-location latitude longitude)))

