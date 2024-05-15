(ns sdk.posthog
  (:import [com.posthog.java PostHog]
           [java.util HashMap]))

;; Given that we are in sdk.posthog, this should only operate on PostHog but 
;; working directly on the Biff ctx is easier

;; https://posthog.com/docs/product-analytics/installation?tab=Java
;; PostHog posthog = new PostHog.Builder(POSTHOG_API_KEY).host(POSTHOG_HOST).build();
;; 
;; // run commands
;;   
;; posthog.shutdown();  // send the last events in queue

(defn use-posthog [ctx]
  (let [^String api-key (:posthog/api_key ctx)
        ^String host (:posthog/host ctx)
        ^PostHog posthog (.build
                          (.host (com.posthog.java.PostHog$Builder. api-key)
                                 host))]
    (assert (instance? PostHog posthog))
    (-> ctx
        (assoc :biff/posthog posthog)
        (update :biff/stop conj (fn [] (.shutdown posthog))))))

(def events
  #{"user.sign_in" "user.sign_up"
    "notifications.disable" "notifications.add_push_token" "notifications.update"
    "discussion.archive" "discussion.subscribe" "discussion.unsubscribe"
    "discussion.read" "discussion.new" "discussion.mark_seen"
    "message.new" "message.delete" "message.react" "message.undo_react" "message.edit"
    "media.new"})

;; posthog.capture (
;;   "distinct_id_of_the_user", 
;;   "user_signed_up", 
;;   new HashMap<String, Object> () {{put ("login_type", "email");
;; }});

(defn capture!
  ([ctx event-name]
   (capture! ctx ^String event-name {}))
  ([{:keys [auth/user-id] :as ctx} event-name opts]
   (when (:posthog/enabled? ctx)
     (when-let [^PostHog posthog (:biff/posthog ctx)]
       (println "emitting event" event-name "with opts" opts)
       (try
         (assert (contains? events event-name))
         (if (empty? opts)
           (.capture posthog (str user-id) event-name)
         ;; The opts need all to be strings. uuids get auto converted
         ;; TODO: the keywords are showing up as strings with ":" prepended
           (let [^HashMap hash-opts (HashMap. opts)]
             (.capture posthog (str user-id) event-name hash-opts)))
         (catch Throwable t
           (println "failed at capturing events" t)))))))