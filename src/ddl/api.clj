(ns ddl.api
  (:require [clojure.data.json :as json]))

(def test-il-url "/invite-link/01J44YYWRY2AKXWM48EC6JFNQ7")

(def locales* (atom []))

(def params
  [:map
   [:device_info any?]])

(def response
  [:map
   [:url [:maybe string?]]])

(defn pending-links! [ctx]
  (when-let [device-info (:device_info (:params ctx))]
    (swap! locales* conj device-info))
  {:status 200
   :headers {"content-type" "application/json"}
   :body (json/write-str {:url nil})})

(comment

  ;; device info from web

  {:appVersion nil,
   :timezone
   [{:timeZone "America/New_York",
     :firstWeekday nil,
     :uses24hourClock nil,
     :calendar "gregory"}],
   :locale
   [{:decimalSeparator ".",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator ",",
     :measurementSystem nil,
     :languageCode "en",
     :temperatureUnit "fahrenheit",
     :regionCode "US",
     :currencyCode nil,
     :languageTag "en-US"}
    {:decimalSeparator ",",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator ".",
     :measurementSystem nil,
     :languageCode "es",
     :temperatureUnit "celsius",
     :regionCode "AR",
     :currencyCode nil,
     :languageTag "es-AR"}
    {:decimalSeparator ",",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator ".",
     :measurementSystem nil,
     :languageCode "es",
     :temperatureUnit nil,
     :regionCode nil,
     :currencyCode nil,
     :languageTag "es"}
    {:decimalSeparator ",",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator " ",
     :measurementSystem nil,
     :languageCode "sv",
     :temperatureUnit "celsius",
     :regionCode "SE",
     :currencyCode nil,
     :languageTag "sv-SE"}
    {:decimalSeparator ",",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator " ",
     :measurementSystem nil,
     :languageCode "sv",
     :temperatureUnit nil,
     :regionCode nil,
     :currencyCode nil,
     :languageTag "sv"}
    {:decimalSeparator ".",
     :textDirection "ltr",
     :currencySymbol nil,
     :digitGroupingSeparator ",",
     :measurementSystem nil,
     :languageCode "en",
     :temperatureUnit nil,
     :regionCode nil,
     :currencyCode nil,
     :languageTag "en"}],
   :deviceId nil,
   :modelName "iPhone",
   :installationTime "1970-01-01T00:00:00.000Z",
   :brand nil,
   :screenHeight 844,
   :screenWidth 390,
   :buildVersion nil,
   :deviceType 1,
   :os "web"}

;; from ios
;;
  {:appVersion "1.0.55",
   :timezone
   [{:timeZone "America/New_York",
     :firstWeekday 1,
     :uses24hourClock true,
     :calendar "gregory"}],
   :locale
   [{:decimalSeparator ".",
     :textDirection "ltr",
     :currencySymbol "$",
     :digitGroupingSeparator ",",
     :measurementSystem "us",
     :languageCode "en",
     :temperatureUnit "celsius",
     :regionCode "US",
     :currencyCode "USD",
     :languageTag "en-US"}
    {:decimalSeparator ".",
     :textDirection "ltr",
     :currencySymbol "$",
     :digitGroupingSeparator ",",
     :measurementSystem "us",
     :languageCode "sv",
     :temperatureUnit "celsius",
     :regionCode "US",
     :currencyCode "USD",
     :languageTag "sv-US"}],
   :deviceId "0C0D4607-B255-4BCA-BEDA-8BC2638F1167",
   :modelName "iPhone 13 Pro",
   :installationTime "2024-07-31T17:53:31.746Z",
   :brand "Apple",
   :screenHeight 844,
   :screenWidth 390,
   :buildVersion "1",
   :deviceType 1,
   :osVersion "17.5.1",
   :os "ios"}

;; from the pixel
  {:appVersion "1.0.55",
   :timezone
   [{:timeZone "Asia/Tokyo",
     :firstWeekday 1,
     :uses24hourClock false,
     :calendar "gregory"}],
   :locale
   [{:decimalSeparator ".",
     :textDirection "ltr",
     :currencySymbol "$",
     :digitGroupingSeparator ",",
     :measurementSystem "metric",
     :languageCode "en",
     :temperatureUnit "celsius",
     :regionCode "CA",
     :currencyCode "CAD",
     :languageTag "en-CA"}],
   :deviceId "d48ec6e80011d660",
   :modelName "Pixel 6a",
   :installationTime "2024-07-31T17:54:05.195Z",
   :brand "google",
   :screenHeight 840,
   :screenWidth 411.42857142857144,
   :buildVersion "48",
   :deviceType 1,
   :osVersion 33,
   :os "android"})
