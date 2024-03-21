(ns gatz.schema
  (:require [malli.core :as m]))

(def push-token
  [:map
   [:push/token string?]
   [:push/created_at inst?]
   [:push/service [:enum :push/expo]]])

(def push-tokens
  [:map
   [:push/expo push-token]])


(def notification-preferences
  [:map
   [:settings.notification/overall boolean?]
   [:settings.notification/activity
    [:enum :settings.notification/daily :settings.notification/none]]
   [:settings.notification/subscribe_on_comment boolean?]
   [:settings.notification/suggestions_from_gatz boolean?]
   ;; These below are unused:
   ;; [:settings.notification/comments_to_own_post boolean?]
   ;; [:settings.notification/reactions_to_own_post boolean?]
   ;; [:settings.notification/replies_to_comment boolean?]
   ;; [:settings.notification/reactions_to_comment boolean?]
   ;; [:settings.notification/at_mentions boolean?]
   ])

(def notification-keys (set (map first (rest notification-preferences))))

(def user
  [:map
   [:xt/id :user/id]
   [:db/type [:enum :gatz/user]]
   [:user/name string?]
   [:user/created_at inst?]
   [:user/updated_at inst?]
   [:user/phone_number string?]
   [:user/push_tokens [:maybe push-tokens]]
   [:user/avatar [:maybe string?]]
   [:user/settings
    [:map
     [:settings/notifications notification-preferences]]]
   ;; :user/image is replaced by :user/avatar
   ;; [:user/image [:maybe string?]]
   [:user/is_test [:maybe boolean?]]
   [:user/is_admin [:maybe boolean?]]
   [:user/last_active inst?]])

(def discussion
  [:map
   [:xt/id :discussion/id]
   [:db/type [:enum :gatz/discussion]]
   [:discussion/did :discussion/id]
   [:discussion/name [:maybe string?]]
   [:discussion/created_by :user/id]
   [:discussion/created_at inst?]
   [:discussion/updated_at inst?]
   [:discussion/members [:set :user/id]]
   [:discussion/subscribers [:set :user/id]]
   [:discussion/first_message [:maybe :message/id]]
   [:discussion/latest_message [:maybe :message/id]]
   [:discussion/seen_at [:map-of :user/id inst?]]
   [:discussion/last_message_read [:map-of :user/id :message/id]]
   [:discussion/archived_at [:map-of :user/id inst?]]])

(def media
  [:map
   [:xt/id :media/id]
   [:db/type [:enum :gatz/media]]
   [:media/user_id :user/id]
   ;; we don't have the message when creating the media
   ;; this is added later
   [:media/message_id [:maybe :message/id]]
   [:media/kind [:enum :media/img :media/vid :media/aud]]
   [:media/url string?]
  ;;  [:media/mime string?]
   [:media/width [:maybe int?]]
   [:media/height [:maybe int?]]
   [:media/size [:maybe int?]]
   [:media/created_at inst?]])

(def message-edits
  [:map
   [:message/text string?]
   [:message/edited_at inst?]])

(def message-reaction
  [:map
   [:reaction/emoji string?]
   [:reaction/created_at inst?]
   [:reaction/did :discussion/id]
   [:reaction/to_mid :message/id]
   [:reaction/by_uid :user/id]])

(def event
  [:map
   [:evt/id :evt/id]
   [:evt/uid :user/id]
   [:evt/did :discussion/id]
   [:evt/mid [:maybe :message/id]]
   [:evt/ts  inst?]
   [:evt/type [:enum :evt.message/add-reaction]]
   [:evt/data [:map
               [:reaction message-reaction]]]])

(def message
  [:map
   [:xt/id :message/id]
   [:db/type [:enum :gatz/message]]
   [:message/did :discussion/id]
   [:message/user_id :user/id]
   [:message/text string?]
   ;; when sending to the client, these should be nested
   [:message/media [:maybe [:vector :gatz/media]]]
   [:message/reply_to [:maybe :message/id]]
   [:message/edits [:vector message-edits]]
   [:message/reactions [:map-of :user/id [:map-of string? inst?]]]
   [:message/created_at inst?]
   [:message/updated_at inst?]])

(def schema
  {:discussion/id :uuid
   :user/id :uuid
   :message/id :uuid
   :media/id :uuid
   :evt/id :uuid
   :gatz/evt event
   :gatz/user user
   :gatz/discussion discussion
   :gatz/reaction message-reaction
   :gatz/media media
   :gatz/message message
   :gatz/push push-token})

(def plugin {:schema schema})