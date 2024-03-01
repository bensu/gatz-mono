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

(def message
  [:map
   [:xt/id :message/id]
   [:db/type [:enum :gatz/message]]
   [:message/did :discussion/id]
   [:message/text string?]
   ;; when sending to the client, these should be nested
   [:message/media [:maybe [:vector :gatz/media]]]
   [:message/reply_to [:maybe :message/id]]
   [:message/user_id :user/id]
   [:message/created_at inst?]
   [:message/updated_at inst?]])

(def schema
  {:discussion/id :uuid
   :user/id :uuid
   :message/id :uuid
   :media/id :uuid
   :gatz/user user
   :gatz/discussion discussion
   :gatz/media media
   :gatz/message message
   :gatz/push push-token})

(def plugin {:schema schema})