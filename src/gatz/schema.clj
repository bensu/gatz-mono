(ns gatz.schema
  (:require [malli.core :as m]))

(def user
  [:map
   [:xt/id :user/id]
   [:db/type [:enum :gatz/user]]
   [:user/name :string]
   [:user/created_at inst?]
   [:user/updated_at inst?]
   [:user/image [:maybe string?]]])

(def discussion
  [:map
   [:xt/id :discussion/id]
   [:db/type [:enum :gatz/discussion]]
   [:discussion/did :discussion/id]
   [:discussion/name :string]
   [:discussion/created_by :user/id]
   [:discussion/created_at inst?]
   [:discussion/updated_at inst?]
   [:discussion/members [:set :user/id]]
   [:discussion/seen_at [:map-of :user/id inst?]]
   [:discussion/archived_at [:map-of :user/id inst?]]])

(def message
  [:map
   [:xt/id :message/id]
   [:db/type [:enum :gatz/message]]
   [:message/did :discussion/id]
   [:message/text string?]
   [:message/user_id :user/id]
   [:message/created_at inst?]
   [:message/updated_at inst?]])

(def schema
  {:discussion/id :uuid
   :user/id :uuid
   :message/id :uuid
   :gatz/user user
   :gatz/discussion discussion
   :gatz/message message})

(def plugin {:schema schema})