(ns gatz.schema
  (:require [malli.core :as m]
            [malli.util :as mu]
            [crdt.core :as crdt]))

(def UserId :uuid)
(def MediaId :uuid)
(def MessageId :uuid)
(def DiscussionId :uuid)
(def EvtId :uuid)
(def ClientId :uuid)

(def PushToken
  [:map
   [:push/token string?]
   [:push/created_at inst?]
   [:push/service [:enum :push/expo]]])

(def PushTokens
  [:map
   [:push/expo PushToken]])

(def NotificationPreferencesCRDT
  [:map
   [:settings.notification/overall
    (crdt/lww-schema crdt/hlc-schema boolean?)]
   [:settings.notification/activity
    (crdt/lww-schema crdt/hlc-schema
                     [:enum :settings.notification/daily :settings.notification/none])]
   [:settings.notification/subscribe_on_comment
    (crdt/lww-schema crdt/hlc-schema boolean?)]
   [:settings.notification/suggestions_from_gatz
    (crdt/lww-schema crdt/hlc-schema boolean?)]
   ;; These below are unused:
   ;; [:settings.notification/comments_to_own_post boolean?]
   ;; [:settings.notification/reactions_to_own_post boolean?]
   ;; [:settings.notification/replies_to_comment boolean?]
   ;; [:settings.notification/reactions_to_comment boolean?]
   ;; [:settings.notification/at_mentions boolean?]
   ])


(def NotificationPreferences
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

(def notification-keys (set (map first (rest NotificationPreferences))))

(def User
  [:map
   [:xt/id #'UserId]
   [:db/type [:enum :gatz/user]]
   [:user/created_at inst?]
   [:user/is_test [:maybe boolean?]]
   [:user/is_admin [:maybe boolean?]]
   [:user/name string?]
   [:user/phone_number string?]
   ;; MaxWins
   [:user/updated_at inst?]
   [:user/last_active inst?]
   ;; LWW
   [:user/avatar [:maybe string?]]
   ;; {k {k LWW}}
   [:user/settings
    [:map
     [:settings/notifications NotificationPreferences]]]
   [:user/push_tokens [:maybe PushTokens]]])

(def UserCRDT
  [:map
   [:xt/id #'UserId]
   [:db/type [:enum :gatz/user]]
   [:db/version [:enum 1]]
   [:crdt/clock crdt/hlc-schema]
   [:user/created_at inst?]
   [:user/is_test [:maybe boolean?]]
   [:user/is_admin [:maybe boolean?]]
   [:user/name string?]
   [:user/phone_number string?]
   ;; MaxWins
   [:user/updated_at (crdt/max-wins-schema inst?)]
   [:user/last_active (crdt/max-wins-schema inst?)]
   ;; LWW
   [:user/avatar (crdt/lww-schema crdt/hlc-schema [:maybe string?])]
   ;; {k {k LWW}}
   [:user/push_tokens (crdt/lww-schema crdt/hlc-schema [:maybe PushTokens])]
   [:user/settings
    [:map
     [:settings/notifications NotificationPreferencesCRDT]]]])

(def friend-keys [:xt/id :user/name :user/avatar])

(def Friend
  (mu/select-keys User friend-keys))

(def FriendCRDT
  (mu/select-keys UserCRDT friend-keys))

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

(def MessageEdit
  [:map
   [:message/text string?]
   [:message/edited_at inst?]])

(def Message
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
   [:message/edits [:set MessageEdit]]
   ;; LWW
   [:message/text string?]
   ;; {user-id {emoji (->LWW ts?)}
   [:message/reactions
    [:map-of #'UserId [:map-of string? [:maybe inst?]]]]])

(def MessageCRDT
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
   [:message/edits (crdt/grow-only-set-schema MessageEdit)]
   ;; LWW
   [:message/text (crdt/lww-schema crdt/hlc-schema string?)]
   ;; {user-id {emoji (->LWW ts?)}
   [:message/reactions
    [:map-of #'UserId
     [:map-of string? (crdt/lww-schema crdt/hlc-schema [:maybe inst?])]]]])

(def DiscussionCRDT
  [:map
   [:xt/id #'DiscussionId]
   [:db/type [:enum :gatz/discussion]]
   [:db/version [:enum 1]]
   [:discussion/did #'DiscussionId]
   [:discussion/name [:maybe string?]]
   [:discussion/created_by #'UserId]
   [:discussion/created_at inst?]
   [:discussion/originally_from [:maybe [:map
                                         [:did #'DiscussionId]
                                         [:mid #'MessageId]]]]
   [:discussion/first_message [:maybe #'MessageId]]
   ;; LWW-set
   [:discussion/members (crdt/lww-set-schema #'UserId)]
   [:discussion/subscribers (crdt/lww-set-schema #'UserId)]
   ;; LWW or MaxWins if mids can be ordered
   [:discussion/latest_message [:maybe (crdt/lww-schema crdt/hlc-schema #'MessageId)]]
   ;; {user-id (->LWW mid)} or MaxWins if mids can be ordered
   [:discussion/last_message_read
    [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema #'MessageId)]]
   ;; MaxWins
   [:discussion/updated_at (crdt/max-wins-schema inst?)]
   [:discussion/latest_activity_ts (crdt/max-wins-schema inst?)]
   ;; {user-id (->MaxWins inst?)}
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]
    ;; LWW, maybe?
   [:discussion/archived_at [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema inst?)]]
   ;; {id MessageCRDT}
   [:discussion/messages {:optional true} [:map-of #'MessageId #'MessageCRDT]]])

(def Discussion
  [:map
   [:xt/id #'DiscussionId]
   [:db/type [:enum :gatz/discussion]]
   [:db/version [:enum 1]]
   [:crdt/clock crdt/hlc-schema]
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
   [:discussion/messages {:optional true} [:map-of #'MessageId #'MessageCRDT]]])

(def discussion-indexed-fields
  [:xt/id
   :db/type
   :db/version
   :discussion/did
   :discussion/created_at
   :discussion/updated_at
   :discussion/latest_activity_ts
   :discussion/created_by
   :discussion/members])

(def DiscussionDoc
  (-> Discussion
      (mu/select-keys discussion-indexed-fields)
      (mu/assoc :db/full-doc DiscussionCRDT)))

;; ====================================================================== 
;; Events

(def UserMarkActiveDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/last_active inst?]])

(def UserUpdateAvatar
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/avatar (crdt/lww-schema crdt/hlc-schema string?)]])

(def UserAddPushToken
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]
   [:user/push_tokens (crdt/lww-schema crdt/hlc-schema PushTokens)]])

(def UserRemovePushToken
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]
   [:user/push_tokens (crdt/lww-schema crdt/hlc-schema nil?)]])

(def UserUpdateNotifications
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
      ;; TODO: partial where all keys are optional
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]])

(def UserAction
  (mu/closed-schema
   [:or
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/mark-active]]
     [:gatz.crdt.user/delta UserMarkActiveDelta]]
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/update-avatar]]
     [:gatz.crdt.user/delta UserUpdateAvatar]]
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/add-push-token]]
     [:gatz.crdt.user/delta UserAddPushToken]]
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/remove-push-token]]
     [:gatz.crdt.user/delta UserRemovePushToken]]
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/update-notifications]]
     [:gatz.crdt.user/delta UserUpdateNotifications]]]))

(def UserEvent
  [:map
   [:xt/id #'EvtId]
   [:evt/ts inst?]
   [:db/type [:enum :gatz/evt]]
   [:evt/uid #'UserId]
   [:evt/cid [:maybe #'ClientId]]
   [:evt/type [:enum :gatz.crdt.user/delta]]
   [:evt/data [:or #'UserAction]]])

(def DeleteDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/deleted_at inst?]]))

(def AddReactionDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/reactions
     [:map-of #'UserId [:map-of string? (crdt/lww-schema crdt/hlc-schema inst?)]]]]))

(def RemoveReactionDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/reactions
     [:map-of #'UserId [:map-of string? (crdt/lww-schema crdt/hlc-schema nil?)]]]]))

(def EditMessageDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/text (crdt/lww-schema crdt/hlc-schema string?)]
    [:message/edits [:map
                     [:message/text string?]
                     [:message/edited_at inst?]]]]))

(def PostedAsDiscussionDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:discussion/updated_at inst?]
    [:discussion/posted_as_discussion #'DiscussionId]]))

(def MessageAction
  (mu/closed-schema
   [:or
    [:map
     [:message.crdt/action [:enum :message.crdt/edit]]
     [:message.crdt/delta EditMessageDelta]]
    [:map
     [:message.crdt/action [:enum :message.crdt/delete]]
     [:message.crdt/delta DeleteDelta]]
    [:map
     [:message.crdt/action [:enum :message.crdt/remove-reaction]]
     [:message.crdt/delta RemoveReactionDelta]]
    [:map
     [:message.crdt/action [:enum :message.crdt/add-reaction]]
     [:message.crdt/delta AddReactionDelta]]
    [:map
     [:message.crdt/action [:enum :message.crdt/posted-as-discussion]]
     [:message.crdt/delta #'PostedAsDiscussionDelta]]]))

(def MessageEvent
  [:map
   [:xt/id #'EvtId]
   [:evt/ts inst?]
   [:db/type [:enum :gatz/evt]]
   [:evt/uid #'UserId]
   [:evt/cid [:maybe #'ClientId]]
   [:evt/did #'DiscussionId]
   [:evt/mid #'MessageId] ;; for message events, this is required
   [:evt/type [:enum :message.crdt/delta]]
   [:evt/data [:or #'MessageAction]]])

(def ArchiveDiscussion
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/archived_at [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema inst?)]]])

(def MarkMessageRead
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/last_message_read [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema #'MessageId)]]])

(def SubscribeDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/subscribers [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema boolean?)]]])

(def MarkDiscussionAsSeenDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]])

(def AppendMessageDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/latest_message (crdt/lww-schema crdt/hlc-schema #'MessageId)]
   [:discussion/latest_activity_ts (crdt/max-wins-schema inst?)]
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]
   [:discussion/subscribers {:optional true} [:map-of #'UserId (crdt/lww-schema crdt/hlc-schema boolean?)]]
   [:discussion/updated_at inst?]])

(def DiscussionAction
  (mu/closed-schema
   [:or
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/new]]
     [:discussion.crdt/delta #'DiscussionCRDT]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/archive]]
     [:discussion.crdt/delta #'ArchiveDiscussion]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/mark-message-read]]
     [:discussion.crdt/delta #'MarkMessageRead]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/subscribe]]
     [:discussion.crdt/delta #'SubscribeDelta]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/mark-as-seen]]
     [:discussion.crdt/delta #'MarkDiscussionAsSeenDelta]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/append-message]]
     [:discussion.delta #'AppendMessageDelta]]
    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/new-message]]
     [:discussion.crdt/delta [:map
                              [:discussion/messages
                               [:map-of #'MessageId #'MessageCRDT]]]]]]))

(def DiscussionEvt
  [:map
   [:xt/id #'EvtId]
   [:evt/ts inst?]
   [:db/type [:enum :gatz/evt]]
   [:evt/uid #'UserId]
   [:evt/cid [:maybe #'ClientId]]
   [:evt/did #'DiscussionId]
   [:evt/mid [:maybe #'MessageId]]
   [:evt/type [:enum :discussion.crdt/delta]]
   [:evt/data [:or #'DiscussionAction]]])

(def MessageReaction
  [:map
   [:reaction/emoji string?]
   [:reaction/created_at inst?]
   [:reaction/did #'DiscussionId]
   [:reaction/to_mid #'MessageId]
   [:reaction/by_uid #'UserId]])

(def ReactionEvt
  [:map
   [:xt/id #'EvtId]
   [:evt/uid #'UserId]
   [:evt/did #'DiscussionId]
   [:db/type [:enum :gatz/evt]]
   [:evt/mid #'MessageId]
   [:evt/ts inst?]
   [:evt/type [:enum :evt.message/add-reaction]]
   [:evt/data [:map
               [:reaction MessageReaction]]]])

(def Event
  [:or #'DiscussionEvt #'MessageEvent #'ReactionEvt])

;; ====================================================================== 
;; Final schema

(def schema
  {:discussion/id #'DiscussionId
   :user/id #'UserId
   :message/id #'MessageId
   :media/id #'MediaId
   :evt/id :uuid
   :gatz/evt #'Event
   :gatz/user #'User
   :gatz.crdt/user #'UserCRDT
   :gatz.doc/discussion #'DiscussionDoc
   :gatz/discussion #'Discussion
   :gatz.crdt/discussion #'DiscussionCRDT
   :gatz/reaction #'MessageReaction
   :gatz/media #'Media
   :gatz/message Message
   :gatz.crdt/message #'MessageCRDT
   :gatz/push PushToken})

(def plugin {:schema schema})