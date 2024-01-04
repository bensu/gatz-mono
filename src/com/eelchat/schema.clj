(ns com.eelchat.schema)

(def full-user
  [:map
   [:id :string]
   [:role :string]
   [:banned :boolean]
   [:email {:optional true} :string]
   [:name :string]
   [:last_active {:optional true} :string]
   [:image {:optional true} :string]
   [:created_at :string]
   [:updated_at :string]

   ;; are these used?
   [:year {:optional true} :string]
   [:title {:optional true} :string]
   [:token {:optional true} :string]
   [:online :boolean]
   [:passowrd {:optional true} :string]
   [:language {:optional true} :string]
   [:profilePic {:optional true} :string]
   [:userID {:optional true} :string]
   [:streamUserToken {:optional true} :string]
   [:phoneNumber {:optional true} :string]

   ;; misc??
   [:MindMonsterPoint {:optional true} :string]
   [:introduceurl {:optional true} :string]
   [:birthdayurl {:optional true} :string]
   [:address {:optional true} :string]
   [:markettingagreeurl {:optional true} :int]
   [:CharacterName {:optional true} :string]
   [:photoURL {:optional true} :string]
   [:school {:optional true} :string]
   [:indivisualagreeurl {:optional true} :int]
   [:birthland {:optional true} :string]
   [:EventAlarm {:optional true} :boolean]
   [:value {:optional true} :string]
   [:image_url {:optional true} :string]
   [:MChatAlarm {:optional true} :boolean]
   [:nameurl {:optional true} :string]
   [:MissionDate {:optional true} :string]
   [:CharacterNickName {:optional true} :string]
   [:WallPaperAlarm {:optional true} :boolean]
   [:CharacterImage {:optional true} :string]
   [:onoff {:optional true} :int]
   [:code {:optional true} :string]
   [:areaurl {:optional true} :string]
   [:pointurl {:optional true} :string]
   [:ChallengeAlarm {:optional true} :boolean]
   [:MissionCount {:optional true} :string]
   [:plusurl {:optional true} :string]
   [:phtoneurl {:optional true} :string]
   [:ChoiceIsland {:optional true} :string]
   [:couponurl {:optional true} :string]
   [:extraData {:optional true} [:map]]
   [:ageurl {:optional true} :int]])

(def commands
  [:map
   [:args :string]
   [:description :string]
   [:name :string]
   [:set :string]])

(def automod-thresholds
  [:map
   [:explicit [:map [:block :double] [:flag :double]]]
   [:spam [:map [:block :double] [:flag :double]]]
   [:toxic [:map [:block :double] [:flag :double]]]])

(def channel-config
  [:map
   [:created_at inst?]
   [:updated_at inst?]

   [:connect_events :boolean]
   [:mutes :boolean]
   [:typing_events :boolean]
   [:name :string]
   [:automod_behavior :string]
   [:max_message_length :int]
   [:custom_events :boolean]
   [:automod :string]
   [:read_events :boolean]
   [:search :boolean]
   [:commands [:vector commands]]
   [:replies :boolean]
   [:quotes :boolean]
   [:uploads :boolean]
   [:reminders :boolean]
   [:automod_thresholds automod-thresholds]
   [:blocklist_behavior :string]
   [:mark_messages_pending :boolean]
   [:url_enrichment :boolean]
   [:reactions :boolean]
   [:push_notifications :boolean]
   [:message_retention :string]])

(def user
  [:map
   [:xt/id :uuid]
   [:updated_at inst?]
   [:created_at inst?]

   [:name :string]
   [:role :string]
   [:banned :boolean]
   [:online :boolean]
   [:last_active inst?]
   [:image :string]

   ;; [:school {:optional true} :string]
   ;; [:birthland {:optional true} :string]
   ;; [:value {:optional true} :string]
   ;; [:title {:optional true} :string]
   ;; [:year {:optional true} :string]
   ;; [:token {:optional true} :string]
   ;; [:language {:optional true} :string]
   ;; [:profilePic {:optional true} :string]
   ;; [:code {:optional true} :string]
   ;; [:userID {:optional true} :string]
   ;; [:streamUserToken {:optional true} :string]
   ;; [:phoneNumber {:optional true} :string]
   ])

(def image
  [:map
   [:fileSize {:optional true} :int]
   [:name {:optional true} :string]
   [:width {:optional true} :int]
   [:orientation {:optional true} :nil]
   [:type {:optional true} :string]
   [:duration {:optional true} [:maybe :int]]
   [:source {:optional true} :string]
   [:size {:optional true} :int]
   [:cancelled {:optional true} :boolean]
   [:extension {:optional true} :nil]
   [:filename {:optional true} :string]
   [:id {:optional true} :string]
   [:mimeType {:optional true} :string]
   [:uri :string]
   [:playableDuration {:optional true} :nil]
   [:height {:optional true} :int]])

(def giphy-frame
  [:map
   [:frames :string]
   [:width :string]
   [:size :string]
   [:url :string]
   [:height :string]])

(def giphy
  [:map
   [:original giphy-frame]
   [:fixed_width_downsampled giphy-frame]
   [:fixed_width giphy-frame]
   [:fixed_height_downsampled giphy-frame]
   [:fixed_height_still giphy-frame]
   [:fixed_width_still giphy-frame]
   [:fixed_height giphy-frame]])

(def file
  [:map
   [:fileSize {:optional true} :int]
   [:name {:optional true} :string]
   [:width {:optional true} :int]
   [:orientation {:optional true} :nil]
   [:type {:optional true} :string]
   [:duration {:optional true} [:maybe :some]]
   [:source {:optional true} :string]
   [:size {:optional true} :int]
   [:cancelled {:optional true} :boolean]
   [:extension {:optional true} :nil]
   [:filename {:optional true} :string]
   [:id {:optional true} :string]
   [:mimeType {:optional true} :string]
   [:uri {:optional true} :string]
   [:playableDuration {:optional true} :nil]
   [:height {:optional true} :int]])

(def attachment
  [:map
   [:mime_type {:optional true} :string]
   [:title_link {:optional true} :string]

   ;; Promise fields?
   [:_k {:optional true} :nil]
   [:_j {:optional true} :nil]
   [:_i {:optional true} :int]
   [:_h {:optional true} :int]

   [:fallback {:optional true} :string]
   [:original_height {:optional true} :int]
   [:originalImage {:optional true} image]
   [:type {:optional true} :string]
   [:duration {:optional true} :some]
   [:file_size {:optional true} :int]
   [:asset_url {:optional true} :string]
   [:image_url {:optional true} :string]
   [:title {:optional true} :string]
   [:original_width {:optional true} :int]
   [:og_scrape_url {:optional true} :string]
   [:giphy {:optional true} giphy]
   [:author_name {:optional true} :string]
   [:thumb_url {:optional true} :string]
   [:originalFile {:optional true} file]
   [:text {:optional true} :string]])

(def membership
  [:map
   [:channel_role :string]
   [:banned :boolean]
   [:shadow_banned :boolean]
   [:notifications_muted :boolean]
   ;; TODO: reference
   [:user :uuid]
   [:channel_id :uuid]
   [:created_at inst?]
   [:updated_at :string]])

(def reaction
  [:map
   [:type :string]
   [:updated_at :string]
   [:message_id :string]
   [:score :int]
   [:user_id :string]
   [:user user]
   [:created_at :string]])

;; TODO
(def voting-option
  [:map [:value :string] [:id :string]])

(def message
  [:map
   [:xt/id :uuid]
   [:cid :uuid]
   [:type :string]
   [:updated_at inst?]
   [:deleted_at {:optional true} inst?]
   [:created_at inst?]

   [:status {:optional true} :string]

   ;; content
   [:html :string]
   [:text :string]

   ;; user
   ;; TODO: reference
   [:user :uuid]
   [:channel_id :uuid]

   ;; other users
   [:readBy {:optional true} :some]
   ;; reference to user
   [:mentioned_users [:vector :uuid]]

   ;; pinned
   [:pinned_at [:maybe :string]]
   [:pin_expires :nil]
   [:pinned :boolean]
   ;; TODO: reference to user
   [:pinned_by [:maybe :uuid]]

   ;; notifications
   [:shadowed :boolean]
   [:silent :boolean]

   ;; replies
   [:reply_count :int]
   [:deleted_reply_count :int]

   ;; reactions
   [:latest_reactions [:vector reaction]]
   [:own_reactions [:vector reaction]]
   [:reaction_counts [:map-of :string :int]]


   ;; quotes and parents
   ;; This is a recursive definition
   ;;    [:quoted_message
   ;;     {:optional true} full-message]
   [:parent_id {:optional true} :string]
   [:quoted_message_id {:optional true} :string]

   ;; threads
   ;; TODO: reference to user
   [:thread_participants {:optional true} [:vector user]]

   ;; misc?
   [:dateSeparator {:optional true} :string]
   [:show_in_channel {:optional true} :boolean]
   [:groupStyles {:optional true} [:vector :string]]

   ;; files
   [:attachments [:vector attachment]]

   ;; commands?
   [:args {:optional true} :string]
   [:command_info {:optional true} [:map [:name :string]]]
   [:command {:optional true} :string]

   ;; voting?
   [:multipleChoiceVote {:optional true} :boolean]
   [:votingOptions {:optional true} [:vector voting-option]]

   ;; i18n
   [:i18n {:optional true} [:map-of :string :string]]])

(def channel
  [:map
   [:cid :uuid]
   [:disabled :boolean]
   [:frozen :boolean]
   [:xt/id :uuid]
   [:type :string]

   [:config channel-config]
   [:name {:optional true} :string]
   [:member_count :int]

   [:hidden :boolean]
   [:own_capabilities [:vector :string]]

   ;; TODO: this should be a reference user/id
   [:created_by :uuid]

   [:updated_at inst?]
   [:created_at inst?]
   [:last_message_at inst?]

   ;; [:cooldown {:optional true} :int]
   ;; [:truncated_at {:optional true} :string]
   ;; [:image {:optional true} :string]
   ;; [:example {:optional true} :some]
   ])

(def channel-read-status
  [:map
   [:unread_messages :int]
   [:last_read inst?]
   ;; TODO: reference
   [:user :uuid]
  ;; [:last_read_message_id {:optional true} :string]
   ])

(def channel-response
  [:map
   [:read [:vector channel-read-status]]
   [:channel channel]
   [:watcher_count :int]
   [:membership membership]
   [:messages [:vector message]]
   [:pinned_messages [:vector message]]
   [:members [:vector  membership]]])


(def schema
  {:user user
   :channel channel
   :message message})

(def plugin {:schema schema})
