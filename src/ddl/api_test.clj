(ns ddl.api-test
  (:require [clojure.data.json :as json]
            [clojure.test :as t :refer [deftest testing is]]
            [ddl.api :as ddl.api]))

(def -pixel-chrome-browser-info
  {:viewportHeight 1902,
   :colorDepth 24,
   :devicePixelRatio 2.625,
   :screenHeight 915,
   :screenWidth 412,
   :userAgent
   "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
   :language "en-US",
   :timezoneOffset -540,
   :viewportWidth 1000,
   :platform "Linux armv81"})

(def -iphone-safari-browser-info
  {:viewportHeight 663,
   :colorDepth 24,
   :devicePixelRatio 3,
   :screenHeight 844,
   :screenWidth 390,
   :userAgent
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
   :language "en-US",
   :timezoneOffset 240,
   :viewportWidth 390,
   :platform "iPhone"})

(def -iphone-chrome-browser-info
  {:viewportHeight 669,
   :colorDepth 24,
   :devicePixelRatio 3,
   :screenHeight 844,
   :screenWidth 390,
   :userAgent
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.6533.77 Mobile/15E148 Safari/604.1",
   :language "en-US",
   :timezoneOffset 240,
   :viewportWidth 390,
   :platform "iPhone"})

(deftest browser-matchers
  (testing "we extract the information we expect from browser info"
    (is
     (= #:ddl{:locale "en-US",
              :screen-width 390,
              :screen-height 844,
              :timezone-offset 240,
              :mobile? true,
              :os :ddl/ios}
        (ddl.api/browser->matcher -iphone-safari-browser-info)
        (ddl.api/browser->matcher -iphone-chrome-browser-info)))

    (is
     (= #:ddl{:locale "en-US",
              :screen-width 412,
              :screen-height 915,
              :timezone-offset 540,
              :mobile? true,
              :os :ddl/android}
        (ddl.api/browser->matcher -pixel-chrome-browser-info)))))

(def -pixel-device-info
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
     :regionCode "US",
     :currencyCode "USD",
     :languageTag "en-US"}],
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
(def -iphone-device-info
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
   :os "ios"})

(deftest device-matchers
  (testing "we extract the information we expect from the device"
    (is (= #:ddl{:locale "en-US",
                 :screen-width 411.42857142857144, ;; XXX: how can this be?
                 :screen-height 840,
                 :timezone-offset 540,
                 :mobile? true,
                 :os :ddl/android}
           (ddl.api/device->matcher -pixel-device-info)))
    (is (= #:ddl{:locale "en-US",
                 :screen-width 390,
                 :screen-height 844,
                 :timezone-offset 240,
                 :mobile? true,
                 :os :ddl/ios}
           (ddl.api/device->matcher -iphone-device-info)))))

(deftest matchers
  (testing "we can match across browser and device"
    (is (ddl.api/match? (ddl.api/device->matcher -iphone-device-info)
                        (ddl.api/browser->matcher -iphone-chrome-browser-info)))
    (is (ddl.api/match? (ddl.api/device->matcher -iphone-device-info)
                        (ddl.api/browser->matcher -iphone-chrome-browser-info)))
    (is (ddl.api/match? (ddl.api/device->matcher -pixel-device-info)
                        (ddl.api/browser->matcher -pixel-chrome-browser-info)))))

;; =============================================================================
;; Tests

(def -ios-browser-params
  {:viewportHeight 663,
   :colorDepth 24,
   :devicePixelRatio 3,
   :screenHeight 844,
   :screenWidth 390,
   :userAgent
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
   :language "en-US",
   :timezoneOffset 240,
   :viewportWidth 390,
   :platform "iPhone"})

(def -iphone-device-params
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
   :os "ios"})

(def -osx-browser-params
  {:viewportHeight 743,
   :colorDepth 30,
   :devicePixelRatio 2.5,
   :screenHeight 1117,
   :screenWidth 1728,
   :userAgent
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
   :language "en-US",
   :timezoneOffset 240,
   :viewportWidth 486,
   :platform "MacIntel"})

(def -android-device-params
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

(deftest link-matching
  (testing "if two people share an ip but not a device, they don't match"
    (ddl.api/reset-pending-link!)
    (let [url "chat.gatz://invite-link/123456"
          android-url "chat.gatz://invite-link/123456"
          shared-ip "192.168.0.1"
          android-ip "192.168.2.2"]
      (testing "a desktop fails to register a link"
        (let [osx-params {:browser_info -osx-browser-params,
                          :url url}
              osx-req {:remote-addr shared-ip
                       :params osx-params}
              resp (ddl.api/register-link! osx-req)]
          (is (= 0 (count @ddl.api/pending-links*)))
          (is (nil? (ddl.api/get-link shared-ip)))))
      (testing "an iphone registers a link"
        (let [ios-params {:url url :browser_info -ios-browser-params}
              ios-req {:remote-addr shared-ip
                       :params ios-params}
              resp (ddl.api/register-link! ios-req)]
          (is (= 1 (count @ddl.api/pending-links*)))
          (is (some? (ddl.api/get-link shared-ip)))))
      (testing "an android registers a link to a different ip"
        (let [android-params {:url android-url
                              :browser_info -pixel-chrome-browser-info}
              android-req {:remote-addr android-ip
                           :params android-params}
              {:keys [body]} (ddl.api/register-link! android-req)]
          (is (= 2 (count @ddl.api/pending-links*)))
          (is (some? (ddl.api/get-link android-ip)))))
      (testing "the android can't find the link that doesn't belong to it"
        (let [android-params {:device_info -android-device-params}
              android-req {:remove-addr shared-ip
                           :params android-params}
              {:keys [body]} (ddl.api/pending-links! android-req)]
          (is (nil? (:url (json/read-str body :key-fn keyword))))))
      (testing "the iphone can't find the link that doesn't belong to it"
        (let [ios-params {:device_info -iphone-device-params}
              ios-req {:params ios-params
                       :remote-addr android-ip}
              {:keys [body]} (ddl.api/pending-links! ios-req)]
          (is (nil? (:url (json/read-str body :key-fn keyword))))))
      (testing "and that iphone can find it"
        (let [ios-params {:device_info -iphone-device-params}
              ios-req {:params ios-params
                       :remote-addr shared-ip}
              {:keys [body]} (ddl.api/pending-links! ios-req)]
          (is (= 1 (count @ddl.api/pending-links*)) "The links are cleared when used")
          (is (nil? (ddl.api/get-link shared-ip)))
          (is (= url (:url (json/read-str body :key-fn keyword)))))))))

(comment

  ;; device info from the site from the desktop
  {:browser_info
   {:viewportHeight 743,
    :colorDepth 30,
    :devicePixelRatio 2.5,
    :screenHeight 1117,
    :screenWidth 1728,
    :userAgent
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    :language "en-US",
    :timezoneOffset 240,
    :viewportWidth 486,
    :platform "MacIntel"},
   :url "chat.gatz://invite-link/undefined"}

  ;; ios chrome browser
  {:viewportHeight 669,
   :colorDepth 24,
   :devicePixelRatio 3,
   :screenHeight 844,
   :screenWidth 390,
   :userAgent
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.6533.77 Mobile/15E148 Safari/604.1",
   :language "en-US",
   :timezoneOffset 240,
   :viewportWidth 390,
   :platform "iPhone"}

;; ios safari browser
  {:browser_info
   {:viewportHeight 663,
    :colorDepth 24,
    :devicePixelRatio 3,
    :screenHeight 844,
    :screenWidth 390,
    :userAgent
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    :language "en-US",
    :timezoneOffset 240,
    :viewportWidth 390,
    :platform "iPhone"},
   :url "chat.gatz://invite-link/01J3XMFGQRA5ATZ3PHW42Z9R7N"}

  :osVersion "17.5.1",
  :screenHeight 844,
  :screenWidth 390,

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
  )
