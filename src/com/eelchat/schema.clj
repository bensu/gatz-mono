(ns com.eelchat.schema)

(def schema
  {:user/id :uuid
   :user    [:map {:closed true}
             [:xt/id          :user/id]
             [:user/email     :string]
             [:user/joined-at inst?]]

   :comm/id   :uuid
   :community [:map {:closed true}
               [:xt/id      :comm/id]
               [:comm/title :string]]

   :mem/id     :uuid
   :membership [:map {:closed true}
                [:xt/id     :mem/id]
                [:mem/user  :user/id]
                [:mem/comm  :comm/id]
                [:mem/roles [:set [:enum :admin]]]]

   :chan/id :uuid
   :channel [:map {:closed true}
             [:xt/id      :chan/id]
             [:chan/title :string]
             [:chan/comm  :comm/id]]

   :sub/id       :uuid
   :subscription [:map {:closed true}
                  [:xt/id             :sub/id]
                  [:sub/url           :string]
                  [:sub/chan          :chan/id]
                  [:sub/last-post-uri {:optional true} :string]
                  [:sub/fetched-at    {:optional true} inst?]
                  [:sub/last-modified {:optional true} :string]
                  [:sub/etag          {:optional true} :string]]

   :msg/id  :uuid
   :message [:map {:closed true}
             [:xt/id          :msg/id]
             [:msg/mem        [:or :mem/id [:enum :system]]]
             [:msg/text       :string]
             [:msg/channel    :chan/id]
             [:msg/created-at inst?]]})

(def plugin
  {:schema schema})

(def user
  [:map
   [:role :string]
   [:banned :boolean]
   [:name :string]
   [:last_active :string]
   [:value :string]
   [:updated_at :string]
   [:online :boolean]
   [:id :string]
   [:image :string]
   [:created_at :string]])

(def image
  [:map [:name :string]
   [:width :int]
   [:type :string]
   [:duration :int]
   [:source :string]
   [:id :string]
   [:uri :string]
   [:height :int]])

(def file
  [:map
   [:name :string]
   [:size :int]
   [:mimeType :string]
   [:uri :string]])

(def attachment
  [:map
   [:mime_type :string]
   [:fallback {:optional true} :string]
   [:original_height {:optional true} :int]
   [:originalImage {:optional true} image]
   [:type :string]
   [:file_size {:optional true} :int]
   [:asset_url {:optional true} :string]
   [:image_url {:optional true} :string]
   [:title {:optional true} :string]
   [:original_width {:optional true} :int]
   [:thumb_url {:optional true} :string]
   [:originalFile {:optional true} file]])

(def full-user
  [:map [:role :string]
   [:banned :boolean]
   [:school {:optional true} :string]
   [:birthland {:optional true} :string]
   [:name :string]
   [:last_active {:optional true} :string]
   [:value {:optional true} :string]
   [:title {:optional true} :string]
   [:updated_at :string]
   [:year {:optional true} :string]
   [:token {:optional true} :string]
   [:online :boolean]
   [:language {:optional true} :string]
   [:id :string]
   [:profilePic {:optional true} :string]
   [:code {:optional true} :string]
   [:userID {:optional true} :string]
   [:image :string]
   [:streamUserToken {:optional true} :string]
   [:phoneNumber {:optional true} :string]
   [:created_at :string]])

(def command
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
   [:connect_events :boolean]
   [:mutes :boolean]
   [:typing_events :boolean] [:name :string]
   [:automod_behavior :string]
   [:max_message_length :int] [:custom_events :boolean]
   [:automod :string] [:read_events :boolean]
   [:search :boolean] [:updated_at :string]
   [:commands [:vector command]]
   [:replies :boolean] [:quotes :boolean]
   [:uploads :boolean] [:reminders :boolean]
   [:automod_thresholds automod-thresholds]
   [:blocklist_behavior :string]
   [:mark_messages_pending :boolean]
   [:url_enrichment :boolean]
   [:reactions :boolean]
   [:created_at :string]
   [:push_notifications :boolean]
   [:message_retention :string]])

(def message
  [:map
   [:id :string]
   [:cid :string]
   [:type :string]
   [:created_at :string]
   [:updated_at :string]
   [:user full-user]

   [:pinned_at :nil]
   [:pinned_by :nil]
   [:pin_expires :nil]
   [:pinned :boolean]

   [:mentioned_users [:vector :any]]
   [:latest_reactions [:vector :any]]
   [:reaction_counts [:map]]
   [:reaction_scores [:map]]
   [:reply_count :int]
   [:deleted_reply_count :int]
   [:own_reactions [:vector :any]]

   [:shadowed :boolean]
   [:silent :boolean]

   [:attachments [:vector :any]]
   [:i18n [:map [:nl_text :string] [:en_text :string] [:language :string]]]
   [:html :string]
   [:text :string]])

(def channel
  [:vector
   [:or :some
    [:vector
     [:map [:role {:optional true} :string]
      [:id {:optional true} :string]
      [:cid {:optional true} :string]
      [:created_at {:optional true} :string]
      [:channel_role {:optional true} :string]
      [:banned {:optional true} :boolean]

      [:pin_expires {:optional true} :nil]
      [:pinned {:optional true} :boolean]
      [:shadowed {:optional true} :boolean]
      [:silent {:optional true} :boolean]
      [:shadow_banned {:optional true} :boolean]
      [:attachments {:optional true}
       [:vector attachment]]
      [:type {:optional true} :string]
      [:deleted_reply_count {:optional true} :int]
      [:unread_messages {:optional true} :int]
      [:own_reactions {:optional true} [:vector :any]]
      [:updated_at {:optional true} :string]
      [:quoted_message_id {:optional true} :string]
      [:notifications_muted {:optional true} :boolean]
      [:mentioned_users {:optional true}
       [:vector user]]
      [:pinned_at {:optional true} :nil]
      [:latest_reactions {:optional true} [:vector :any]]
      [:user_id {:optional true} :string]
      [:last_read {:optional true} :string]
      [:last_read_message_id {:optional true} :string]
      [:pinned_by {:optional true} :nil]
      [:reaction_counts {:optional true} [:map]]
      [:user full-user]
      [:reaction_scores {:optional true} [:map]]
      [:reply_count {:optional true} :int]
      [:quoted_message {:optional true} message]
      [:i18n {:optional true}
       [:map [:nl_text :string] [:en_text :string] [:language :string]]]
      [:html {:optional true} :string]
      [:text {:optional true} :string]]]
    [:map

     [:id {:optional true} :string]
     [:cid {:optional true} :string]
     [:type {:optional true} :string]
     [:updated_at :string]
     [:created_at :string]

     [:banned {:optional true} :boolean]
     [:channel_role {:optional true} :string]

     [:disabled {:optional true} :boolean]
     [:last_message_at {:optional true} :string]
     [:config {:optional true} channel-config]
     [:name {:optional true} :string]
     [:shadow_banned {:optional true} :boolean]
     [:member_count {:optional true} :int]
     [:truncated_at {:optional true} :string]
     [:hidden {:optional true} :boolean]
     [:own_capabilities {:optional true} [:vector :string]]
     [:notifications_muted {:optional true} :boolean]
     [:image {:optional true} :string]
     [:example {:optional true} :string]
     [:frozen {:optional true} :boolean]
     [:user {:optional true} full-user]
     [:created_by {:optional true} user]]]])
