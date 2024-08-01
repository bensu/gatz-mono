(ns ddl.api
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [java-time.api :as jt]
            [clojure.test :as t :refer [deftest testing is]]
            [clojure.tools.logging :as log])
  (:import [eu.bitwalker.useragentutils UserAgent OperatingSystem]
           [java.time ZoneId ZonedDateTime]
           [java.util Date]))

;; ======================================================================
;; User Agent helpers
;;
(defn mobile? [ua]
  (= "Mobile" (:device-type ua)))

;; :osVersion "17.5.1",
;;
(defn extract-ios-version [ua]
  (let [os (.getOperatingSystem ua)]
    (when (.equals (.getGroup os) OperatingSystem/IOS)
      (let [os-name (.getName os)]
        os-name
        #_(when-let [version (second (re-find #"iOS (\d+_\d+(_\d+)?)" os-name))]
            (str/replace version "_" "."))))))

(defn parse-user-agent
  "Extract what we are going to use from the user-agent

  {:ddl/mobile? boolean?
   :ddl/os [:enum :ddl/ios :ddl/android nil]}
  "
  [user-agent-string]
  (let [ua (UserAgent/parseUserAgentString user-agent-string)
        os (-> ua .getOperatingSystem)
        os-group (.getGroup os)
        device-type (-> ua .getOperatingSystem .getDeviceType .getName)]
    {:ddl/mobile? (= "Mobile" device-type)
     :ddl/os (cond
               (or
                (.equals os-group OperatingSystem/IOS)
            ;; (.equals os-group OperatingSystem/IOS11_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS10_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS9_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS8_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS8_4_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS8_3_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS8_2_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS8_1_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS7_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS6_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS5_IPHONE)
            ;; (.equals os-group OperatingSystem/IOS4_IPHONE)
                )
               :ddl/ios

               (or
                (.equals os-group OperatingSystem/ANDROID)
                (.equals os-group OperatingSystem/ANDROID8)
                (.equals os-group OperatingSystem/ANDROID7)
                (.equals os-group OperatingSystem/ANDROID6)
                (.equals os-group OperatingSystem/ANDROID5))
               :ddl/android

               :else nil)}))

(defn browser->matcher
  "Returns what we are going to match on based on the browser info"
  [browser-info]
  (let [ua-matchers (parse-user-agent (:userAgent browser-info))]
    {:ddl/locale (:language browser-info)
     :ddl/screen-width (:screenWidth browser-info)
     :ddl/screen-height (:screenHeight browser-info)
     :ddl/timezone-offset (some-> (:timezoneOffset browser-info) abs)
     :ddl/mobile? (:ddl/mobile? ua-matchers)
     :ddl/os (:ddl/os ua-matchers)}))

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

(comment

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

  (assert
   (= #:ddl{:locale "en-US",
            :screen-width 390,
            :screen-height 844,
            :timezone-offset 240,
            :mobile? true,
            :os :ddl/ios}
      (browser->matcher -iphone-safari-browser-info)
      (browser->matcher -iphone-chrome-browser-info)))

  (assert
   (= #:ddl{:locale "en-US",
            :screen-width 412,
            :screen-height 915,
            :timezone-offset 540,
            :mobile? true,
            :os :ddl/android}
      (browser->matcher -pixel-chrome-browser-info)))

  {:browser_info -iphone-safari-browser-info
   :url "chat.gatz://invite-link/01J3XMFGQRA5ATZ3PHW42Z9R7N"})

(defn timezone-to-offset [timezone-name]
  (try
    (let [zone (ZoneId/of timezone-name)
          now (ZonedDateTime/now zone)
          offset (.getTotalSeconds (.getOffset now))]
      (abs (/ offset 60)))  ; Convert seconds to minutes
    (catch Exception e
      (println "Error: Invalid timezone name")
      nil)))

(defn device->matcher
  "Returns what we are going to match on based on the app device info"
  [device-info]
  (let []
    {:ddl/locale (get-in device-info [:locale 0 :languageTag])
     :ddl/screen-width (:screenWidth device-info)
     :ddl/screen-height (:screenHeight device-info)
     :ddl/timezone-offset (some-> (get-in device-info [:timezone 0 :timeZone])
                                  timezone-to-offset)
     :ddl/mobile? true
     :ddl/os (case (:os device-info)
               "android" :ddl/android
               "ios" :ddl/ios
               nil)}))

(comment

  (do
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

    (assert
     (= #:ddl{:locale "en-US",
              :screen-width 411.42857142857144, ;; XXX: how can this be?
              :screen-height 840,
              :timezone-offset 540,
              :mobile? true,
              :os :ddl/android}
        (device->matcher -pixel-device-info)))

    (assert
     (= #:ddl{:locale "en-US",
              :screen-width 390,
              :screen-height 844,
              :timezone-offset 240,
              :mobile? true,
              :os :ddl/ios}
        (device->matcher -iphone-device-info)))))

;; ======================================================================
;; Matching

;; I will get a query
;; [ip, ts ], { attrs }, { maybe-attrs }
;; only if ip matches, and ts is within time
;; then try to match all attrs
;; and then, try to match any maybe-attrs
;; hmmm, this is too much. why stop?
;; distinguish between iphone models with different iOS installations
;; same locale setting

(def exact-ks [:ddl/os :ddl/timezone-offset :ddl/locale :ddl/mobile?])

;; screen height is not always trusted
(def similar-ks [:ddl/screen-width])

(def THRESHHOLD 10)

(defn similar? [a b]
  {:pre [(number? a) (number? b)]}
  (<= (Math/abs (- a b)) THRESHHOLD))

(defn match? [browser-matcher device-matcher]
  (and (= (select-keys browser-matcher exact-ks)
          (select-keys device-matcher exact-ks))
       (every? (fn [k]
                 (similar? (get browser-matcher k)
                           (get device-matcher k)))
               similar-ks)))

(comment

  (do
    (assert
     (match? (device->matcher -iphone-device-info)
             (browser->matcher -iphone-chrome-browser-info)))

    (assert
     (match? (device->matcher -iphone-device-info)
             (browser->matcher -iphone-chrome-browser-info)))

    (assert
     (match? (device->matcher -pixel-device-info)
             (browser->matcher -pixel-chrome-browser-info)))))

;; ======================================================================
;; Storage

;; {ip {ts, url, browser-info}}
(def pending-links-schema
  [:map-of string? [:map
                    [:ts inst?]
                    [:url string?]
                    [:browser-matcher any?]]])

(defonce pending-links* (atom {}))

(defn- reset-pending-link! []
  (reset! pending-links* {}))

(defn put-link! [ip url browser-matcher]
  {:pre [(string? ip) (string? url) (map? browser-matcher)]}
  (swap! pending-links* (fn [pls]
                          (assoc pls ip {:ts (Date.)
                                         :url url
                                         :browser-matcher browser-matcher}))))

(defn expired?
  ([ts] (expired? ts (jt/instant)))
  ([^Date ts now]
   {:pre [(inst? ts)] :post [(boolean? %)]}
   (let [ts-instant (jt/instant (.toInstant ts))
         one-hour-ago (jt/minus now (jt/hours 1))]
     (jt/after? one-hour-ago ts-instant))))

(defn get-link [ip]
  {:pre [(string? ip)]}
  (when-let [link (get @pending-links* ip)]
    (when-not (expired? (:ts link))
      link)))

(defn remove-link! [ip]
  {:pre [(string? ip)]}
  (swap! pending-links* (fn [pls]
                          (dissoc pls ip))))

;; ======================================================================
;; HTTP API

(defn get-client-ip [request]
  (or (get-in request [:headers "x-forwarded-for"])
      (:remote-addr request)))

(def test-il-url "/invite-link/01J44YYWRY2AKXWM48EC6JFNQ7")

(def register-params
  [:map
   [:url string?]
   [:web_info any?]])

(def register-response
  [:map
   [:success [:enum :ok]]])

(defn register-link! [{:keys [params] :as request}]
  (let [ip (get-client-ip request)
        {:keys [url browser_info]} params
        browser-matcher (some-> browser_info browser->matcher)]
    (when (and (string? ip) (string? url) (map? browser-matcher))
      (when (:ddl/mobile? browser-matcher)
        (put-link! ip url browser-matcher))))
  #_(catch Exception e
      (log/error "Failed to register ddl link")
      (log/error e))
  {:status 200
   :headers {"content-type" "application/json"}
   :body (json/write-str {:success :ok})})

(def pending-params
  [:map
   [:device_info any?]])

(def pending-response
  [:map
   [:url [:maybe string?]]])

(defn pending-links! [{:keys [params] :as request}]
  ;; TODO: get the link, check the matcher
  ;; return the link if it matches
  ;; check if the device was recently installed
  (let [ip (get-client-ip request)
        url (when-let [device-matcher (some-> (:device_info params) device->matcher)]
              (when-let [pending-link (some-> ip get-link)]
                (when (match? (:browser-matcher pending-link) device-matcher)
                  (remove-link! ip)
                  (:url pending-link))))]
    {:status 200
     :headers {"content-type" "application/json"}
     :body (json/write-str {:url url})}))

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
    (reset-pending-link!)
    (let [url "chat.gatz://invite-link/123456"
          android-url "chat.gatz://invite-link/123456"
          shared-ip "192.168.0.1"
          android-ip "192.168.2.2"]
      (testing "a desktop fails to register a link"
        (let [osx-params {:browser_info -osx-browser-params,
                          :url url}
              osx-req {:remote-addr shared-ip
                       :params osx-params}
              resp (register-link! osx-req)]
          (is (= 0 (count @pending-links*)))
          (is (nil? (get-link shared-ip)))))
      (testing "an iphone registers a link"
        (let [ios-params {:url url :browser_info -ios-browser-params}
              ios-req {:remote-addr shared-ip
                       :params ios-params}
              resp (register-link! ios-req)]
          (is (= 1 (count @pending-links*)))
          (is (some? (get-link shared-ip)))))
      (testing "an android registers a link to a different ip"
        (let [android-params {:url android-url
                              :browser_info -pixel-chrome-browser-info}
              android-req {:remote-addr android-ip
                           :params android-params}
              {:keys [body]} (register-link! android-req)]
          (is (= 2 (count @pending-links*)))
          (is (some? (get-link android-ip)))))
      (testing "the android can't find the link that doesn't belong to it"
        (let [android-params {:device_info -android-device-params}
              android-req {:remove-addr shared-ip
                           :params android-params}
              {:keys [body]} (pending-links! android-req)]
          (is (nil? (:url (json/read-str body :key-fn keyword))))))
      (testing "the iphone can't find the link that doesn't belong to it"
        (let [ios-params {:device_info -iphone-device-params}
              ios-req {:params ios-params
                       :remote-addr android-ip}
              {:keys [body]} (pending-links! ios-req)]
          (is (nil? (:url (json/read-str body :key-fn keyword))))))
      (testing "and that iphone can find it"
        (let [ios-params {:device_info -iphone-device-params}
              ios-req {:params ios-params
                       :remote-addr shared-ip}
              {:keys [body]} (pending-links! ios-req)]
          (is (= 1 (count @pending-links*)) "The links are cleared when used")
          (is (nil? (get-link shared-ip)))
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
