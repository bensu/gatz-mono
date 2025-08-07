(ns gatz.expo.core
  (:require [crdt.core :as crdt]
            [crdt.ulid]
            [cljs.reader :as reader]))

;; Export core CRDT constructors
(defn ^:export new-lww [clock value]
  (crdt/->LWW clock value))

(defn ^:export new-min-wins [value]
  (crdt/min-wins value))

(defn ^:export new-max-wins [value]
  (crdt/max-wins value))

(defn ^:export new-grow-only-set [values]
  (crdt/gos (js->clj values)))

(defn ^:export new-lww-set [clock values]
  (crdt/lww-set clock (js->clj values)))

;; Export core CRDT operations
(defn ^:export merge-crdts [a b]
  (crdt/-merge a b))

(defn ^:export apply-delta [crdt delta]
  (crdt/-apply-delta crdt delta))

(defn ^:export get-value [crdt]
  (clj->js (crdt/-value crdt)))

;; Export clock utilities
(defn ^:export new-hlc [node-id]
  (crdt/new-hlc node-id (js/Date.)))

;; Helper for reading CRDT literals from strings
(defn ^:export read-crdt [edn-str]
  (reader/read-string edn-str))

;; Example usage from JavaScript:
;; 
;; import { newHlc, newLww, getValue, mergeCrdts } from './cljs-out/gatz.expo.core';
;; 
;; const nodeId = '123e4567-e89b-12d3-a456-426614174000';
;; const clock = new_hlc(nodeId);
;; const lww1 = new_lww(clock, "value1");
;; const lww2 = new_lww(clock, "value2");
;; const merged = merge_crdts(lww1, lww2);
;; console.log(get_value(merged)); // "value2"

;; ============================================================
;; HTTP

(defn ->out [user]
  (clj->js (crdt/-value user)))


(defn ^:export read-edn [edn-str]
  (reader/read-string edn-str))

(defn get! [base-url token url]
  (.then
   (.then (js/fetch (str base-url url)
                    #js {:headers #js {"Authorization" token
                                       "Accept" "application/edn"
                                       "Content-Type" "application/edn"}})
          (fn [response]
            (.text response)))
   read-edn))

(defn post! [base-url token url data]
  (.then
   (.then (js/fetch (str base-url url)
                    #js {:headers #js {"Authorization" token
                                       "Accept" "application/edn"
                                       "Content-Type" "application/edn"}
                         :method "POST"
                         :body (pr-str data)})
          (fn [response]
            (.text response)))
   read-edn))


(defn get-user! [base-url token]
  (.then (get! base-url token "/api/me/crdt")
         (fn [response]
           (:user response))))

(defn send-user-action! [base-url token action]
  (.then (post! base-url token "/api/me/crdt" {:action action})
         (fn [response]
           (:user response))))

;; ============================================================
;; User CRDT

(defprotocol ISyncEngine
  (-tick [_])
  (-merge-to-me [_ delta])
  (-sync-user [_])
  (-subscribe-to-me [_ listener-name callback])
  (-unsubscribe-from-me [_ listener-name])
  (-handle-ws-edn [_ edn]))

(defprotocol IClient
  (-get-user [client])
  (-send-user-action! [client action]))

(defmulti handle-evt! (fn [_sync evt] (:event/type evt)))

(defmethod handle-evt! :gatz.crdt.user/delta
  [sync evt]
  (let [action (:event/data evt)
        delta  (:delta action)]
    (-merge-to-me sync delta)))

(deftype SyncEngine [base-url token user-id user-atom]
  IClient
  (-get-user [_]
    (get-user! base-url token))
  (-send-user-action! [_ action]
    (send-user-action! base-url token action))

  ISyncEngine
  (-tick [_]
    (crdt/new-hlc user-id))
  (-sync-user [_]
    (.then (get-user! base-url token)
           (fn [user]
             (swap! user-atom (fn [old]
                                (if old
                                  (crdt/-apply-delta old user)
                                  user))))))

  (-merge-to-me [this delta]
    (if-let [_user @user-atom]
      (swap! user-atom (fn [old]
                         (if old
                           (try
                             (crdt/-apply-delta old delta)
                             (catch js/Error e
                               old))
                           delta)))
      ;; if there is nothing in the atom there, we should either
      ;; fetch the complete object or buffer the delta
      ;; until we need it
      ;; TODO: handle failure cases
      (.then (-sync-user this)
             (fn []
               (-merge-to-me this delta)))))
  (-subscribe-to-me [this listener-name callback]
    (assert (fn? callback) "callback must be a function")
    (add-watch user-atom listener-name (fn [_ _ old new]
                                         (when-not (= old new)
                                           (callback new))))
    (if-let [user @user-atom]
      (js/Promise.resolve user)
      (-sync-user this)))
  (-unsubscribe-from-me [_ listener-name]
    (remove-watch user-atom listener-name))
  (-handle-ws-edn [this edn]
    (handle-evt! this edn)))

(defn ^:export new-sync-engine [base-url token user-id]
  (SyncEngine. base-url token (uuid user-id) (atom nil)))

(defn ^:export set-full-name [sync full-name]
  (let [lww (crdt/lww (-tick sync) full-name)
        ^crdt/HLC clock (-tick sync)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/profile {:profile/full_name lww}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-profile
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn ^:export set-twitter-username [sync twitter-username]
  (let [^crdt/HLC clock (-tick sync)
        lww (crdt/lww clock twitter-username)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/profile {:profile/urls {:profile.urls/twitter lww}}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-profile
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn ^:export set-website-url [sync website-url]
  (let [^crdt/HLC clock (-tick sync)
        lww (crdt/lww clock website-url)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/profile {:profile/urls {:profile.urls/website lww}}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-profile
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn ^:export set-profile-picture [sync url]
  (let [^crdt/HLC clock (-tick sync)
        lww (crdt/lww clock url)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/avatar lww}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-avatar
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn ^:export set-location-setting [sync enabled]
  {:pre [(boolean? enabled)]}
  (let [^crdt/HLC clock (-tick sync)
        lww (crdt/lww clock enabled)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/settings {:settings/location {:settings.location/enabled lww}}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-location-settings
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn set-notification-settings [sync nts-settings]
  (let [^crdt/HLC clock (-tick sync)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/settings {:settings/notifications (crdt/->lww-map nts-settings clock)}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-notifications
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(def notifications-off
  {:settings.notification/overall false
   :settings.notification/activity :settings.notification/none
   :settings.notification/subscribe_on_comment false
   :settings.notification/suggestions_from_gatz false
   :settings.notification/friend_accepted false})

(def notifications-on
  {:settings.notification/overall true
   :settings.notification/activity :settings.notification/daily
   :settings.notification/subscribe_on_comment true
   :settings.notification/suggestions_from_gatz true
   :settings.notification/friend_accepted true})

(defn ^:export disable-notification-settings [sync]
  (set-notification-settings sync notifications-off))

(defn ^:export enable-notification-settings [sync]
  (set-notification-settings sync notifications-on))

(def notification-fields
  #{:settings.notification/overall
    :settings.notification/activity
    :settings.notification/subscribe_on_comment
    :settings.notification/suggestions_from_gatz
    :settings.notification/friend_accepted})

(defn ^:export set-notification-settings-field [sync field value]
  (let [^crdt/HLC clock (-tick sync)
        field (keyword "settings.notification" field)
        value (if (= field :settings.notification/activity)
                (keyword "settings.notification" value)
                (boolean value))
        lww (crdt/lww clock value)
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/settings {:settings/notifications {field lww}}}
        action {:gatz.crdt.user/action :gatz.crdt.user/update-notifications
                :gatz.crdt.user/delta delta}]

    (assert (contains? notification-fields field) "Invalid field")
    (if (= :settings.notification/activity field)
      (assert (contains? #{:settings.notification/daily :settings.notification/none} value))
      (assert (boolean? value)))

    (-merge-to-me sync delta)
    (-send-user-action! sync action)))

(defn ^:export register-push-token [sync token]
  {:pre [(string? token)]}

  (let [^crdt/HLC clock (-tick sync)
        expo-token {:push/service :push/expo
                    :push/token token
                    :push/created_at (js/Date.)}
        delta {:crdt/clock clock
               :user/updated_at (crdt/max-wins (.-ts clock))
               :user/push_tokens (crdt/->LWW clock {:push/expo expo-token})
               :user/settings {:settings/notifications (crdt/->lww-map notifications-on clock)}}
        action {:gatz.crdt.user/action :gatz.crdt.user/add-push-token
                :gatz.crdt.user/delta delta}]
    (-merge-to-me sync delta)
    (-send-user-action! sync action)))


(defn ^:export subscribe-to-me [sync lid callback]
  (let [cb (fn [new]
             (callback (->out new)))]
    #js {:user (.then (-subscribe-to-me sync lid cb) ->out)
         :unsubscribe (fn [] (-unsubscribe-from-me sync lid))}))

(defn ^:export handle-ws-edn [sync edn]
  (-handle-ws-edn sync edn))
