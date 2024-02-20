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
   [:discussion/archived_at [:map-of :user/id inst?]]])

(def media
  [:map
   [:xt/id :media/id]
   [:media/user :user/id]
   ;; do I have the message/id when creating the media?
   [:media/message :message/id]
   [:media/type [:enum :media/img :media/vid :media/aud]]
   [:media/url string?]
   [:media/mime string?]
   [:media/size int?]
   [:media/created_at inst?]])

(def message
  [:map
   [:xt/id :message/id]
   [:db/type [:enum :gatz/message]]
   [:message/did :discussion/id]
   [:message/text string?]
   [:message/media [:maybe [:vector :gatz/media]]]
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