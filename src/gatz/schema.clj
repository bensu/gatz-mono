(ns gatz.schema
  (:require [malli.core :as m]
            [malli.util :as mu]
            [crdt.core :as crdt]))

(def ulid?
  [:fn {:error/message "must crdt.ulid/ulid"} crdt/ulid?])

(def UserId :uuid)
(def MediaId :uuid)
(def MessageId :uuid)
(def DiscussionId :uuid)
(def EvtId :uuid)
(def ClientId :uuid)
(def GroupId ulid?)

;; ======================================================================  
;; User & Contacts

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
    (crdt/lww-schema boolean?)]
   [:settings.notification/activity
    (crdt/lww-schema
     [:enum :settings.notification/daily :settings.notification/none])]
   [:settings.notification/subscribe_on_comment
    (crdt/lww-schema boolean?)]
   [:settings.notification/suggestions_from_gatz
    (crdt/lww-schema boolean?)]
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
   ;; MinWins
   [:user/deleted_at [:maybe inst?]]
   ;; LWW
   [:user/avatar [:maybe string?]]
   ;; LWW set
   [:user/blocked_uids [:set uuid?]]
   ;; {k {k LWW}}
   [:user/settings
    [:map
     [:settings/notifications NotificationPreferences]]]
   [:user/push_tokens [:maybe PushTokens]]])

(def contact-ks [:xt/id :user/name :user/avatar])

(def Contact (mu/select-keys User contact-ks))

(def ContactResponse Contact)

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
   [:user/deleted_at (crdt/min-wins-schema [:maybe inst?])]
   ;; LWW
   [:user/avatar (crdt/lww-schema [:maybe string?])]
   ;; LWW set
   [:user/blocked_uids (crdt/lww-set-schema #'UserId)]
   ;; {k {k LWW}}
   [:user/push_tokens (crdt/lww-schema [:maybe PushTokens])]
   [:user/settings
    [:map
     [:settings/notifications NotificationPreferencesCRDT]]]])

(def UserActivity
  [:map
   [:xt/id :uuid] ;; unused 
   [:db/type [:enum :gatz/user_activity]]
   [:db/version [:enum 1]]
   [:user_activity/user_id #'UserId]
   [:user_activity/last_active inst?]])

(def friend-keys [:xt/id :user/name :user/avatar])

(def Friend
  (mu/select-keys User friend-keys))

(def FriendCRDT
  (mu/select-keys UserCRDT friend-keys))

(def ContactRequestId :uuid)

(def ContactViewedState
  [:enum
   :contact_request/self
   :contact_request/none
   :contact_request/viewer_awaits_response
   :contact_request/response_pending_from_viewer
   :contact_request/viewer_ignored_response
   :contact_request/accepted])

(def ContactRequestState
  [:enum
   :contact_request/requested
   :contact_request/accepted
   :contact_request/ignored
   :contact_request/removed])

(def ContactRequest
  [:map
   [:xt/id uuid?]
   [:db/type [:enum :gatz/contact_request]]
   [:db/version [:enum 1]]
   [:contact_request/from UserId]
   [:contact_request/to UserId]
   [:contact_request/created_at inst?]
   [:contact_request/updated_at inst?]
   [:contact_request/state ContactRequestState]
   [:contact_request/log [:vec
                          [:map
                           [:contact_request/decided_at inst?]
                           [:contact_request/by_user UserId]
                           [:contact_request/from_state ContactRequestState]
                           [:contact_request/to_state ContactRequestState]]]]])

(def UserContacts
  [:map
   [:xt/id :uuid] ;; never used
   [:db/type [:enum :gatz/contacts]]
   [:contacts/user_id #'UserId] ;; acts as main key
   [:contacts/created_at inst?]
   [:contacts/updated_at inst?]
   [:contacts/ids [:set #'UserId]]])


(def InviteLink
  [:map
   [:xt/id ulid?]
   [:db/type [:enum :gatz/invite_link]]
   [:db/version [:enum 1]]
   [:invite_link/type [:enum :invite_link/group :invite_link/contact]]
   [:invite_link/group_id [:maybe #'GroupId]]
   [:invite_link/contact_id [:maybe #'UserId]]
   [:invite_link/expires_at inst?]
   [:invite_link/created_by #'UserId]
   [:invite_link/created_at inst?]
   [:invite_link/used_at [:maybe inst?]]
   [:invite_link/used_by [:maybe #'UserId]]])


;; ====================================================================== 
;; Groups

(def DiscussionMemberMode
  [:enum
   :discussion.member_mode/open
   :discussion.member_mode/closed])

(def Group
  [:map
   [:xt/id #'GroupId]
   [:db/type [:enum :gatz/group]]
   [:db/version [:enum 1]]
   [:group/created_at inst?]
   [:group/created_by #'UserId]

   [:group/updated_at inst?]
   [:group/name string?]
   [:group/description [:maybe string?]]
   [:group/avatar [:maybe string?]]

   [:group/settings [:map
                     [:discussion/member_mode DiscussionMemberMode]]]

   [:group/owner #'UserId]
   [:group/admins [:set #'UserId]]
   [:group/members [:set #'UserId]]
   [:group/archived_uids [:set #'UserId]]

   ;; When did somebody join a group?
   [:group/joined_at [:map-of #'UserId inst?]]])

#_(def GroupRequestState
    [:enum
     :group_request/requested
     :group_request/accepted
     :group_request/ignored
     :group_request/removed])

#_(def GroupRequestLog
    [:map
     [:group_request/ts inst?]
     [:group_request/by_user UserId]
     [:group_request/from_state GroupRequestState]
     [:group_request/to_state GroupRequestState]])

#_(def GroupRequest
    [:map
     [:xt/id :uuid] ;; probably unused
     [:db/type [:enum :gatz/group_request]]
     [:group_request/from #'UserId]
     [:group_request/to #'UserId]
     [:group_request/to_group #'GroupId]
     [:group_request/created_at inst?]
     [:group_request/updated_at inst?]
     [:group_request/state GroupRequestState]
     [:group_request/log [:vec GroupRequestLog]]])


;; ====================================================================== 
;; Message & Media

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
   [:message/text (crdt/lww-schema string?)]
   ;; {user-id {emoji (->LWW ts?)}
   [:message/reactions
    [:map-of #'UserId
     [:map-of string? (crdt/lww-schema [:maybe inst?])]]]])

(def DiscussionCRDT
  [:map
   [:xt/id #'DiscussionId]
   [:db/type [:enum :gatz/discussion]]
   [:db/version [:enum 3]]
   [:discussion/did #'DiscussionId]
   [:discussion/name [:maybe string?]]
   [:discussion/created_by #'UserId]
   [:discussion/created_at inst?]
   [:discussion/group_id {:optional true} [:maybe #'GroupId]]
   [:discussion/originally_from [:maybe [:map
                                         [:did #'DiscussionId]
                                         [:mid #'MessageId]]]]
   [:discussion/first_message [:maybe #'MessageId]]
   [:discussion/member_mode DiscussionMemberMode]
   [:discussion/open_until [:maybe inst?]]
   ;; LWW-set
   [:discussion/members (crdt/lww-set-schema #'UserId)]
   [:discussion/subscribers (crdt/lww-set-schema #'UserId)]
   [:discussion/active_members (crdt/grow-only-set-schema #'UserId)]
   ;; LWW or MaxWins if mids can be ordered
   [:discussion/latest_message [:maybe (crdt/lww-schema #'MessageId)]]
   ;; {user-id (->LWW mid)} or MaxWins if mids can be ordered
   [:discussion/last_message_read
    [:map-of #'UserId (crdt/lww-schema #'MessageId)]]
   ;; MaxWins
   [:discussion/updated_at (crdt/max-wins-schema inst?)]
   [:discussion/latest_activity_ts (crdt/max-wins-schema inst?)]
   ;; {user-id (->MaxWins inst?)}
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]
    ;; LWW, maybe?
   [:discussion/archived_uids (crdt/lww-set-schema #'UserId)]

   ;; {id MessageCRDT}
   [:discussion/messages {:optional true} [:map-of #'MessageId #'MessageCRDT]]])

(def Discussion
  [:map
   [:xt/id #'DiscussionId]
   [:db/type [:enum :gatz/discussion]]
   [:db/version [:enum 3]]
   [:crdt/clock crdt/hlc-schema]
   [:discussion/did #'DiscussionId]
   [:discussion/name [:maybe string?]]
   [:discussion/created_by #'UserId]
   [:discussion/created_at inst?]
   [:discussion/group_id {:optional true} [:maybe #'GroupId]]
   [:discussion/originally_from [:maybe [:map
                                         [:did #'DiscussionId]
                                         [:mid #'MessageId]]]]
   [:discussion/first_message [:maybe #'MessageId]]
   [:discussion/member_mode DiscussionMemberMode]
   [:discussion/open_until [:maybe inst?]] ;; only set when member_mode is open
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
   [:discussion/archived_uids [:set #'UserId]]
   ;; {id MessageCRDT}
   [:discussion/messages {:optional true} [:map-of #'MessageId #'MessageCRDT]]])

(def discussion-indexed-fields
  [:xt/id
   :db/type
   :db/version
   :discussion/did
   :discussion/created_at
   :discussion/updated_at
   :discussion/member_mode
   :discussion/open_until
   :discussion/latest_activity_ts
   :discussion/created_by
   :discussion/first_message
   :discussion/group_id
   :discussion/latest_message
   :discussion/active_members
   :discussion/archived_uids
   :discussion/members])

(def DiscussionDoc
  (-> Discussion
      (mu/select-keys discussion-indexed-fields)
      (mu/assoc :db/full-doc DiscussionCRDT)))

;; ====================================================================== 
;; Events

(def UserUpdateAvatar
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/avatar (crdt/lww-schema string?)]])

(def UserAddPushToken
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]
   [:user/push_tokens (crdt/lww-schema PushTokens)]])

(def UserRemovePushToken
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]
   [:user/push_tokens (crdt/lww-schema nil?)]])

(def UserUpdateNotifications
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/settings
    [:map
      ;; TODO: partial where all keys are optional
     [:settings/notifications (mu/optional-keys NotificationPreferencesCRDT)]]]])

(def UserMarkDeleted
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/deleted_at inst?]])

(def UserBlocksAnotherUser
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:user/updated_at inst?]
   [:user/blocked_uids (crdt/lww-set-delta-schema #'UserId)]])

(def UserAction
  (mu/closed-schema
   [:or
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/block-another-user]]
     [:gatz.crdt.user/delta UserBlocksAnotherUser]]
    [:map
     [:gatz.crdt.user/action [:enum :gatz.crdt.user/mark-deleted]]
     [:gatz.crdt.user/delta UserMarkDeleted]]
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
     [:map-of #'UserId [:map-of string? (crdt/lww-schema inst?)]]]]))

(def RemoveReactionDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/reactions
     [:map-of #'UserId [:map-of string? (crdt/lww-schema nil?)]]]]))

(def EditMessageDelta
  (mu/closed-schema
   [:map
    [:crdt/clock crdt/hlc-schema]
    [:message/updated_at inst?]
    [:message/text (crdt/lww-schema string?)]
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
     ;; TOO: Should this make you active_member of the discussion?
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
   [:discussion/archived_uids (crdt/lww-set-delta-schema #'UserId)]])

(def UnarchiveDiscussion ArchiveDiscussion)

(def MarkMessageRead
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/last_message_read [:map-of #'UserId (crdt/lww-schema #'MessageId)]]])

(def SubscribeDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/subscribers [:map-of #'UserId (crdt/lww-schema boolean?)]]])

(def MarkDiscussionAsSeenDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]])

(def AppendMessageDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/latest_message (crdt/lww-schema #'MessageId)]
   [:discussion/latest_activity_ts (crdt/max-wins-schema inst?)]
   [:discussion/seen_at [:map-of #'UserId (crdt/max-wins-schema inst?)]]
   [:discussion/subscribers {:optional true} [:map-of #'UserId (crdt/lww-schema boolean?)]]
   [:discussion/active_members #'UserId]
   [:discussion/updated_at inst?]])

(def AddMembersDelta
  [:map
   [:crdt/clock crdt/hlc-schema]
   [:discussion/updated_at inst?]
   [:discussion/members (crdt/lww-set-delta-schema #'UserId)]])

;; I need a way for tagged unions to give me better error messages
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
     [:discussion.crdt/action [:enum :discussion.crdt/unarchive]]
     [:discussion.crdt/delta #'UnarchiveDiscussion]]

    [:map
     [:discussion.crdt/action [:enum :discussion.crdt/add-members]]
     [:discussion.crdt/delta #'AddMembersDelta]]

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
     [:discussion.crdt/delta #'AppendMessageDelta]]
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
   :gatz/user_activity #'UserActivity
   :gatz/contacts #'UserContacts
   :gatz/group #'Group
   :gatz/invite_link #'InviteLink
   :gatz.doc/discussion #'DiscussionDoc
   :gatz/discussion #'Discussion
   :gatz.crdt/discussion #'DiscussionCRDT
   :gatz/reaction #'MessageReaction
   :gatz/media #'Media
   :gatz/message Message
   :gatz.crdt/message #'MessageCRDT
   :gatz/push PushToken})

(def plugin {:schema schema})