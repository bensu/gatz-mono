(ns gatz.db
  (:require [com.biffweb :as biff :refer [q]]
            [malli.transform :as mt]))

;; ====================================================================== 
;; User

(def default-img "http://www.gravatar.com/avatar")

(def test-user-id #uuid "6bcfc9a9-2fed-4aa2-a28f-9c099a6abaee")

;; TODO: validate unique usernames
(defn create-user! [ctx {:keys [username]}]
  (let [now (java.util.Date.)
        user-id (random-uuid)
        user {:db/doc-type :user
              :xt/id user-id
              :created_at now
              :updated_at now
              :name username
              :banned false
              :role "admin"
              :online true
              :last_active now
              :image default-img}]
    (biff/submit-tx ctx [user])
    user))

(defn user-by-id [db user-id]
  {:pre [(uuid? user-id)]}
  (first
   (q db
      '{:find (pull user [*])
        :in [user-id]
        :where [[user :xt/id user-id]]}
      user-id)))

;; ====================================================================== 
;; Channel

(def default-membership
  (let [now (java.util.Date.)]
    {:channel_role "channel_member"
     :banned false
     :shadow_banned false
     :notifications_muted false
     :created_at now
     :updated_at now}))

(defn channel-by-id [db channel-id]
  ;; (def -ctx ctx)
  (let [channel (first (q db '{:find (pull ch [*])
                               :in [channel-id]
                               :where [[ch :xt/id channel-id]]}
                          channel-id))
        _ (assert channel)
        messages (q db '{:find (pull msg [*])
                         :in [channel-id]
                         :where [[msg :channel_id channel-id]]}
                    channel-id)
        membership (assoc default-membership
                          :user test-user-id
                          :channel_id channel-id)]
    {:read []
     :channel channel
     :watcher_count 0
     :membership membership
     :messages messages
     :pinned_messages []
     :members []}))

(defn channels-by-user-id [db user-id]
  (let [ch-ids (q db '{:find [ch]
                       :in [user-id]
                       :where [[ch :user user-id]]}
                  user-id)]
    (set (map first ch-ids))))

(def default-channel-name "channel test")

(def default-automod-thresholds
  {:explicit {:block 0.0 :flag 0.0}
   :spam {:block 0.0 :flag 0.0}
   :toxic {:block 0.0 :flag 0.0}})

(def default-channel-config
  {:connect_events false
   :mutes true
   :typing_events false
   :automod_behavior "flag"
   :max_message_length 4096
   :custom_events false
   :automod "AI"
   :read_events false
   :search false
   :commands []
   :replies true
   :quotes true
   :uploads false
   :reminders false
   :automod_thresholds default-automod-thresholds
   :blocklist_behavior "flag"
   :mark_messages_pending true
   :url_enrichment false
   :reactions false
   :push_notifications false
   :message_retention "forever"})

(def default-capabilities
  ["connect-events","delete-own-message","flag-message","freeze-channel","mute-channel","pin-message","quote-message","read-events","search-messages","send-links","send-message","send-reaction","send-reply","send-typing-events","set-channel-cooldown","skip-slow-mode","typing-events","update-any-message","update-own-message","upload-file"])

(defn create-channel! [ctx {:keys [name user_id]}]
  (let [now (java.util.Date.)
        user-id (or (some-> user_id mt/-string->uuid)
                    test-user-id)
        channel-id (random-uuid)
        name (or name (str default-channel-name " " (rand-int 1000)))
        ch-type "messaging"
        channel {:db/doc-type :channel
                 :xt/id channel-id
                 :cid channel-id ;; (str ch-type ":" channel-id)
                 :name name

                 :created_at now
                 :updated_at now
                 :last_message_at now

                 :type ch-type
                 :config (assoc default-channel-config
                                :name name
                                :updated_at now
                                :created_at now)
                 :member_count 1
                 :disabled false
                 :frozen false
                 :hidden false
                 :created_by user-id}]
    (biff/submit-tx ctx [channel])
    channel))


;; ====================================================================== 
;; Messages

(defn create-message!
  [{:keys [auth/user-id] :as ctx}
   {:keys [text id channel_id]}]

  {:pre [(string? text)]}

  (let [now (java.util.Date.)
        msg-id (or (some-> id mt/-string->uuid)
                   (random-uuid))
        ch-id (mt/-string->uuid channel_id)
        msg {:db/doc-type :message
             :xt/id msg-id
             :cid ch-id
             :created_at now
             :updated_at now
             :type "regular"
             :channel_id ch-id
             :user_id user-id
             :mentioned_users []

             :text text
             :html (str "<p>" text "</p>")

             :pinned false
             :pinned_by nil
             :pin_expires nil
             :pinned_at nil

             :shadowed false
             :silent false

             :own_reactions []
             :reaction_counts {}
             :reaction_scores {}

             :attachments []}]
    (biff/submit-tx ctx [msg])
    msg))

;; validate message



