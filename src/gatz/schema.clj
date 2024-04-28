(ns gatz.schema
  (:require [malli.core :as m]
            [crdt.core :as crdt]))

(def UserId :uuid)
(def MediaId :uuid)
(def MessageId :uuid)
(def DiscussionId :uuid)
(def EvtId :uuid)

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
   [:xt/id #'UserId]
   [:db/type [:enum :gatz/user]]
   [:user/created_at inst?]
   [:user/is_test [:maybe boolean?]]
   [:user/is_admin [:maybe boolean?]]
   ;; MaxWins
   [:user/updated_at inst?]
   ;; LWW
   [:user/name string?]
   [:user/phone_number string?]
   [:user/avatar [:maybe string?]]
   ;; {k {k LWW}}
   [:user/settings
    [:map
     [:settings/notifications notification-preferences]]]
   [:user/push_tokens [:maybe push-tokens]]
   ;; MaxWins
   [:user/last_active inst?]])

(def discussion
  [:map
   [:xt/id #'DiscussionId]
   [:db/type [:enum :gatz/discussion]]
   [:discussion/did #'DiscussionId]
   [:discussion/name [:maybe string?]]
   [:discussion/created_by #'UserId]
   [:discussion/created_at inst?]
   [:discussion/originally_from [:maybe [:map
                                         [:did #'DiscussionId]
                                         [:mid #'MessageId]]]]
   [:discussion/first_message [:maybe #'MessageId]]
   ;; MaxWins
   [:discussion/updated_at inst?]
   ;; AddRemoveSet
   [:discussion/members [:set #'UserId]]
   ;; AddRemoveSet
   [:discussion/subscribers [:set #'UserId]]
   ;; LWW or MaxWins if mids can be ordered
   [:discussion/latest_message [:maybe #'MessageId]]
   ;; MaxWins
   [:discussion/latest_activity_ts inst?]
   ;; {user-id (->MaxWins inst?)}
   [:discussion/seen_at [:map-of #'UserId inst?]]
   ;; {user-id (->LWW mid)} or MaxWins if mids can be ordered
   [:discussion/last_message_read [:map-of #'UserId #'MessageId]]
   ;; LWW
   [:discussion/archived_at [:map-of #'UserId inst?]]
   ;; {id MessageCRDT}
   ;; [:discussion/messages [:map-of #'MessageId message-crdt]]
   ])

(def Media
  [:map
   [:xt/id #'MediaId]
   [:db/type [:enum :gatz/media]]
   [:media/user_id #'UserId]
   ;; we don't have the message when creating the media
   ;; this is added later
   [:media/message_id [:maybe #'MessageId]]
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
   [:reaction/did #'DiscussionId]
   [:reaction/to_mid #'MessageId]
   [:reaction/by_uid #'UserId]])

(def event
  [:map
   [:evt/id #'EvtId]
   [:evt/uid #'UserId]
   [:evt/did #'DiscussionId]
   [:db/type [:enum :gatz/evt]]
   [:evt/mid [:maybe #'MessageId]]
   [:evt/ts  inst?]
   [:evt/type [:enum :evt.message/add-reaction]]
   [:evt/data [:map
               [:reaction message-reaction]]]])

(def message
  [:map
    ;; final
   [:xt/id #'MessageId]
   [:db/type [:enum :gatz/message]]
   [:message/did #'DiscussionId]
   [:message/user_id #'UserId]
   [:message/reply_to [:maybe #'MessageId]]
   [:message/media [:maybe [:vector #'Media]]]
   [:message/created_at inst?]
   ;; min wins
   [:message/deleted_at [:maybe inst?]]
   ;; max wins
   [:message/updated_at inst?]
   ;; grow only set
   [:message/posted_as_discussion [:set #'DiscussionId]]
   ;; grow only set
   [:message/edits [:set message-edits]]
   ;; LWW
   [:message/text string?]
   ;; {user-id {emoji (->LWW ts?)}
   [:message/reactions
    [:map-of #'UserId [:map-of string? [:maybe inst?]]]]])

(def message-crdt
  [:map
    ;; final
   [:xt/id #'MessageId]
   [:db/type [:enum :gatz/message]]
   [:db/version [:enum 1]]
   [:crdt/clock crdt/hlc-schema]
   [:message/did #'DiscussionId]
   [:message/user_id #'UserId]
   [:message/reply_to [:maybe #'MessageId]]
   [:message/media [:maybe [:vector #'Media]]]
   [:message/created_at inst?]
   ;; min wins
   [:message/deleted_at (crdt/min-wins-schema [:maybe inst?])]
   ;; max wins
   [:message/updated_at (crdt/max-wins-schema inst?)]
   ;; grow only set
   [:message/posted_as_discussion (crdt/grow-only-set-schema #'DiscussionId)]
   ;; grow only set
   [:message/edits (crdt/grow-only-set-schema message-edits)]
   ;; LWW
   [:message/text (crdt/lww-schema crdt/hlc-schema string?)]
   ;; {user-id {emoji (->LWW ts?)}
   [:message/reactions
    [:map-of #'UserId
     [:map-of string? (crdt/lww-schema crdt/hlc-schema [:maybe inst?])]]]])

(def schema
  {:discussion/id #'DiscussionId
   :user/id #'UserId
   :message/id #'MessageId
   :media/id #'MediaId
   :evt/id :uuid
   :gatz/evt event
   :gatz/user user
   :gatz/discussion discussion
   :gatz/reaction message-reaction
   :gatz/media #'Media
   :gatz/message message
   :gatz.crdt/message message-crdt
   :gatz/push push-token})

(def plugin {:schema schema})