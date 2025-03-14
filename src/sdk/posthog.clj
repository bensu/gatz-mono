(ns sdk.posthog
  (:require [clojure.data.json :as json]
            [clojure.tools.logging :as log]
            [medley.core :refer [map-vals]])
  (:import [com.posthog.java PostHog]
           [java.text SimpleDateFormat]
           [java.util HashMap Date]))

(defn- fmt-date [^Date d]
  (.format (SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ss.SSSZ") d))

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
                          (-> (com.posthog.java.PostHog$Builder. api-key)
                              (.host host)))]
    (assert (instance? PostHog posthog))
    (-> ctx
        (assoc :biff/posthog posthog)
        (update :biff/stop conj (fn [] (.shutdown posthog))))))

(def events
  #{"user.sign_in" "user.sign_up" "user.delete_account" "user.block" "user.update_urls" "user.update_profile"
    "notifications.disable" "notifications.add_push_token" "notifications.update"
    "discussion.archive" "discussion.subscribe" "discussion.unsubscribe"
    "discussion.read" "discussion.new" "discussion.mark_seen"
    "discussion.feed" "discussion.active" "discussion.old_feed"
    "feed_items.mark_seen"
    "message.new" "message.delete" "message.react" "message.undo_react" "message.edit" "message.flag"
    "media.new"
    "contact.viewed" "contact.requested" "contact.accepted" "contact.ignored" "contact.removed"
    "group.viewed" "group.created" "group.archive" "group.unarchive"
    "group.transfer_ownership" "group.add_admins" "group.remove_admins" "group.leave"
    "group.updated_attrs" "group.remove_members" "group.add_members"
    "group.updated_avatar"
    "invite_link.new" "invite_link.viewed" "invite_link.joined"
    "search.term"
    "notifications.activity" "notifications.comment" "notifications.reaction"
    "notifications.failed" "notifications.succeeded"})

;; posthog.identify("user123", new Properties()
;;     .set("email", "user@example.com")
;;     .set("name", "John Doe"));

(defn identify!
  [ctx {:keys [xt/id user/created_at user/is_test] :as user}]
  (when-let [^PostHog posthog (:biff/posthog ctx)]
    (let [^HashMap hash-opts (HashMap. {"name" (:user/name user)
                                        "is_test" is_test
                                        "created_at" (fmt-date created_at)})]
      (try
        (when (:posthog/enabled? ctx)
          (.identify posthog (str id) hash-opts)
          (log/info "identified user" (select-keys user [:user/name :xt/id])))
        (catch Throwable t
          (log/error "Failed to identify user" (str user))
          (log/error t))))))

;; posthog.capture (
;;   "distinct_id_of_the_user", 
;;   "user_signed_up", 
;;   new HashMap<String, Object> () {{put ("login_type", "email");
;; }});

(defn capture!
  "Send an event to Posthog. It requires a user-id"

  ([ctx event-name]
   (capture! ctx event-name {}))

  ([{:keys [auth/user-id biff/posthog] :as ctx}
    ^String event-name
    opts]

   {:pre [(uuid? user-id)]}

   (let [^PostHog posthog posthog]
     (try
       (assert (contains? events event-name))
       (when (:posthog/enabled? ctx)
         (if (empty? opts)
           (.capture posthog (str user-id) event-name)
           (let [^HashMap hash-opts (HashMap. (map-vals str (json/read-str (json/write-str opts))))]
             (.capture posthog (str user-id) event-name hash-opts)))
         (log/info "captured event " event-name))
       (catch Throwable t
         (log/error "failed at capturing event")
         (log/error t))))))
