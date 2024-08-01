(ns ddl.api
  "Stores Deferred Deep Links by matching browser fingerprints with device fingerprints"
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [java-time.api :as jt]
            [clojure.tools.logging :as log])
  (:import [eu.bitwalker.useragentutils UserAgent OperatingSystem]
           [java.time ZoneId ZonedDateTime]
           [java.util Date]))

;; ======================================================================
;; User Agent helpers
;;
(defn mobile? [ua]
  (= "Mobile" (:device-type ua)))

#_(defn extract-ios-version [ua]
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
               (.equals os-group OperatingSystem/IOS)
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

;; ======================================================================
;; Matching

(def exact-ks [:ddl/os :ddl/timezone-offset :ddl/locale :ddl/mobile?])

;; We omit :ddl/screen-height because it can vary across browsers
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

;; ======================================================================
;; Storage

;; {ip {ts, url, browser-info}}
(def pending-links-schema
  [:map-of string? [:map
                    [:ts inst?]
                    [:url string?]
                    [:browser-matcher any?]]])

(defonce pending-links* (atom {}))

(defn reset-pending-link! []
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

(defn pending-links!
  "Clears the link after returning it"
  [{:keys [params] :as request}]
  (let [ip (get-client-ip request)
        url (when-let [device-matcher (some-> (:device_info params) device->matcher)]
              (when-let [pending-link (some-> ip get-link)]
                (when (match? (:browser-matcher pending-link) device-matcher)
                  (remove-link! ip)
                  (:url pending-link))))]
    {:status 200
     :headers {"content-type" "application/json"}
     :body (json/write-str {:url url})}))

