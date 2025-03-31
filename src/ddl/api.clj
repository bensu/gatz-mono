(ns ddl.api
  "Stores Deferred Deep Links by matching browser fingerprints with device fingerprints"
  (:require [clojure.data.json :as json]
            [gatz.settings :as gatz.settings]
            [malli.core :as m]
            [java-time.api :as jt])
  (:import [eu.bitwalker.useragentutils UserAgent OperatingSystem]
           [java.time ZoneId ZonedDateTime]
           [java.util Date]))

(defn redirect-to [url]
  {:status 302
   :headers {"Location" url}})

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

(def basic-browser-matcher
  [:map
   [:ddl/mobile? boolean?]
   [:ddl/os [:enum :ddl/ios :ddl/android :ddl/web nil]]])

(defn- android? [os-group]
  (or (.equals os-group OperatingSystem/ANDROID)
      (.equals os-group OperatingSystem/ANDROID8)
      (.equals os-group OperatingSystem/ANDROID7)
      (.equals os-group OperatingSystem/ANDROID6)
      (.equals os-group OperatingSystem/ANDROID5)))

(defn- ios? [os-group]
  (.equals os-group OperatingSystem/IOS))

(defn parse-user-agent
  "Extract what we are going to use from the user-agent

  {:ddl/mobile? boolean?
   :ddl/os [:enum :ddl/ios :ddl/android nil]}
  "
  [user-agent-string]
  (let [ua (UserAgent/parseUserAgentString user-agent-string)
        os (-> ua .getOperatingSystem)
        os-group (.getGroup os)
        device-type (-> ua .getOperatingSystem .getDeviceType .getName)
        mobile? (= "Mobile" device-type)]
    {:ddl/mobile? mobile?
     :ddl/os (cond
               (ios? os-group)     :ddl/ios
               (android? os-group) :ddl/android
               (not mobile?)       :ddl/web)}))

(defn match?
  "When it is as simple as :ddl/mobile :ddl/os, a direct comparisson is enough"
  [browser-matcher device-matcher]
  (= browser-matcher device-matcher))

;; ======================================================================
;; Storage

;; {ip {ts, url, browser-info}}
(def pending-links-schema
  [:map-of string? [:map
                    [:ts inst?]
                    [:path string?]
                    [:browser_info basic-browser-matcher]]])

(defonce pending-links* (atom {}))

(defn reset-pending-link! []
  (reset! pending-links* {}))

(defn put-link! [ip path browser-info]
  {:pre [(string? ip) (string? path) (map? browser-info)]}
  (swap! pending-links* (fn [pls]
                          (assoc pls ip {:ts (Date.)
                                         :path path
                                         :browser_info browser-info}))))

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

(def pending-response
  [:map
   [:path [:maybe string?]]])

(defn parse-browser-info [{:keys [mobile os] :as _browser-info}]
  (cond-> {}
    (boolean? mobile) (assoc :ddl/mobile? mobile)
    (string? os)      (assoc :ddl/os (keyword "ddl" os))))

(defn post-pending-links
  "Clears the link after returning it"
  [{:keys [params] :as request}]
  (let [ip (get-client-ip request)
        req-browser-info (parse-browser-info (:browser_info params))
        path (when-let [pending-link (some-> ip get-link)]
               (when (match? (:browser_info pending-link) req-browser-info)
                 (:path pending-link)))]
    {:status 200
     :headers {"content-type" "application/json"}
     :body (if path
             (json/write-str {:path path})
             (json/write-str {}))}))

(defn remove-pending-link! [request]
  (let [ip (get-client-ip request)]
    (remove-link! ip))
  {:status 200
   :headers {"content-type" "application/json"}
   :body (json/write-str {:success :ok})})

(def google-play-form-url "https://forms.gle/NHmyTPPXDM88ZTn88")

(defn make-path [code]
  (format "/invite/%s" code))

(defn register-and-redirect! [{:keys [gatz.app/host path-params] :as request}]
  (let [code (get path-params :code)
        ip (get-client-ip request)
        user-agent (get-in request [:headers "user-agent"])
        browser-matcher (parse-user-agent user-agent)
        path (make-path code)]

    (when (and (string? ip) (string? path) (map? browser-matcher))
      (put-link! ip path browser-matcher))

    (case (:ddl/os browser-matcher)

      ;; iOS device
      :ddl/ios
      (redirect-to gatz.settings/ios-app-store-url)

      ;; Android device
      :ddl/android
      (redirect-to google-play-form-url)

      ;; Desktop or other device
      (redirect-to (str host "/invite/" code)))))

;; ======================================================================
;; Deprecated: Client side matcher
;; This proved to be too complicated

(comment
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


;; TODO: this is not a pure function because it depends on the current time zone
;; of the tester
  (defn timezone-to-offset
    ([timezone-name]
     (timezone-to-offset timezone-name (ZonedDateTime/now)))
    ([timezone-name ^ZonedDateTime reference-time]
     (try
       (let [zone (ZoneId/of timezone-name)
             time-in-zone (.withZoneSameInstant reference-time zone)
             offset (.getTotalSeconds (.getOffset time-in-zone))]
         (abs (/ offset 60)))  ; Convert seconds to minutes
       (catch Exception _e
         (println "Error: Invalid timezone name")
         nil))))


  (def ^:dynamic *reference-time* nil)


  (defn device->matcher
    "Returns what we are going to match on based on the app device info"
    [device-info]
    (let [reference-time (or *reference-time* (ZonedDateTime/now))]
      {:ddl/locale (get-in device-info [:locale 0 :languageTag])
       :ddl/screen-width (:screenWidth device-info)
       :ddl/screen-height (:screenHeight device-info)
       :ddl/timezone-offset (some-> (get-in device-info [:timezone 0 :timeZone])
                                    (timezone-to-offset reference-time))
       :ddl/mobile? true
       :ddl/os (case (:os device-info)
                 "android" :ddl/android
                 "ios" :ddl/ios
                 nil)}))



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


  (defn ^:deprecated
    register-link!
    [{:keys [params] :as request}]
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
     :body (json/write-str {:success :ok})}))

