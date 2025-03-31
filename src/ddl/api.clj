(ns ddl.api
  "Stores Deferred Deep Links by matching browser fingerprints with device fingerprints"
  (:require [clojure.data.json :as json]
            [gatz.settings :as gatz.settings]
            [clojure.tools.logging :as log]
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

(defn post-pending-links [{:keys [params] :as request}]
  (def -pending-links @pending-links*)
  (def -request request)
  (log/info "matching pending links")
  (log/info "params" params)
  (log/info "pending links" -pending-links)
  (log/info "ip found" (get-client-ip request))
  (log/info "x-forwarded-for" (get-in request [:headers "x-forwarded-for"]))
  (log/info "remote-addr" (:remote-addr request))
  (let [ip (get-client-ip request)
        req-browser-info (parse-browser-info (:browser_info params))
        path (when-let [pending-link (some-> ip get-link)]
               (when (match? (:browser_info pending-link) req-browser-info)
                 (:path pending-link)))]
    (log/info "path" path)
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

