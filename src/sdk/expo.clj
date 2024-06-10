(ns sdk.expo
  (:require [clj-http.client :as http]
            [clojure.data.json :as json]
            [clojure.tools.logging :as log]
            [sdk.posthog :as posthog]))

(def base-url "https://exp.host/--")

;; From https://docs.expo.dev/push-notifications/sending-notifications/

;; curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" -d '{
;;   "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
;;   "title":"hello",
;;   "body": "world"
;; }'

(defn valid-notification? [{:expo/keys [to title body]}]
  (and (string? to)
       (string? title)
       (string? body)))

(comment
  ;; example response
  {:data {:status "ok", :id "e9a83bbe-377a-45d7-a0d6-7b281c809e19"}})

(defn push-one!

  [{:keys [expo/enabled? biff/secret] :as _ctx}
   {:keys [device-token title body] :as notification}]

  {:pre [(valid-notification? notification)]}

  (when enabled?
    (let [expo-token (secret :expo/push-token)
          _ (assert expo-token "No expo token found in env")
          data {:to device-token
                :title title
                :body body}
          r (-> (str base-url "/api/v2/push/send")
                (http/post
                 {:as :json
                  :body (json/write-str data)
                  :headers {"Content-Type" "application/json"
                            "Authorization" (str "Bearer " expo-token)}}))]
      (if (= 200 (:status r))
        (:data (:body r))
        (throw (ex-info "Failed to send push notification"
                        {:status (:status r)
                         :body (:body r)}))))))

(def MAX_EXPO_NOTIFICATIONS 100)

(defn push-many!

  [{:keys [expo/enabled? biff/secret] :as ctx} notifications]

  {:pre [(< (count notifications) MAX_EXPO_NOTIFICATIONS)
         (every? valid-notification? notifications)]}

  (when enabled?
    (let [expo-token (secret :expo/push-token)
          _ (assert expo-token "No expo token found in env")
          r (-> (str base-url "/api/v2/push/send")
                (http/post
                 {:as :json
                  :body (json/write-str notifications)
                  :headers {"Content-Type" "application/json"
                            "Authorization" (str "Bearer " expo-token)}}))]
      (if (= 200 (:status r))
        (do
          (log/info (str "Sent " (count notifications) " push notifications"))
          (posthog/capture! ctx "notifications.succeeded" {:count (count notifications)})
          (:data (:body r)))
        (let [e (ex-info "Failed to send push notification"
                         {:status (:status r)
                          :body (:body r)})]
          (posthog/capture! ctx "notifications.failed" {:count (count notifications)})
          (log/error e)
          (throw e))))))