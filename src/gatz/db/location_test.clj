(ns gatz.db.location-test
  (:require [clojure.test :refer :all]
            [clojure.data.csv :as csv]
            [clojure.java.io :as io]
            [gatz.db.location :as location]))

(def ios-location-params
  {:location
   {:geocode {:timezone "America/New_York",
              :name "912 Euclid Ave", :city "Miami Beach", :streetNumber "912", :street "Euclid Ave", :region "FL", :isoCountryCode "US", :subregion "Miami-Dade County", :postalCode "33139", :country "United States", :district "Flamingo/Lummus"},
    :coords {:speed -1, :accuracy 9.325018494930474,
             :longitude -80.13539058392104,
             :latitude 25.779686681100475,
             :altitude 1.9367790603383135,
             :altitudeAccuracy 30,
             :heading -1},
    :timestamp 1.742577047766304E12}})

(def android-location-params
  {:location
   {:geocode {:timezone nil, :name "912", :city "Miami Beach", :streetNumber "912", :street "Euclid Avenue", :region "Florida", :isoCountryCode "US", :subregion "Miami-Dade County", :postalCode "33139", :formattedAddress "912 Euclid Ave, Miami Beach, FL 33139, USA", :country "United States", :district nil},
    :coords {:speed 0, :accuracy 100,
             :longitude -80.1352363,
             :latitude 25.7796939,
             :altitude -25.299999237060547, :altitudeAccuracy 32.26689910888672, :heading 0},
    :mocked false, :timestamp 1742577315288}})


(def miami-location
  {:location/lng -80.19366
   :location/lat 25.77427
   :location/name "Miami"
   :location/id "US/MIA"})

(deftest test-params->location
  (testing "iOS location params returns Miami location"
    (let [expected miami-location
          result (location/params->location (get-in ios-location-params [:location]))]
      (is (= expected result))))

  (testing "Android location params returns Miami location"
    (let [expected miami-location
          result (location/params->location (:location android-location-params))]
      (is (= expected result))))

  (testing "empty location params returns nil"
    (let [params {:location {}}]
      (is (nil? (location/params->location (:location params))))))

  (testing "Gulf of America returns nil"
    (let [params {:location {:coords {:latitude 25.306715
                                      :longitude -90.063595}}}]
      (is (nil? (location/params->location (:location params)))))))


;; ====================================================================================
;; Monument

(defn load-monument-data []
  (with-open [reader (io/reader (io/resource "location/test_monuments.csv"))]
    (->> (rest (csv/read-csv reader))
         (mapv (fn [[id name _monument latitude longitude]]
                 {:id id
                  :city name
                  :lat (Double/parseDouble latitude)
                  :lon (Double/parseDouble longitude)})))))

(deftest test-find-monument
  (testing "The monument is found in its expected city"
    (doseq [monument (load-monument-data)]
      (let [location (some-> (location/find-metro-region (:lat monument) (:lon monument))
                             (location/metro->location))]
        (is (= (:id monument) (:location/id location))
            (str "Monument " (:id monument) " not found in " (:location/name location)))))))