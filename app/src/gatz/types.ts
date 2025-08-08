export type APIResponse = {};

export type APIErrorResponse = {
  error: string;
  message: string;
};

export type SUUID = string;
export type SULID = string;
export type SDate = string;

export type NotificationSettings = {
  overall: boolean;
  activity: "daily" | "none";
  subscribe_on_comment: boolean;
  suggestions_from_gatz: boolean;

  // comments_to_own_post: boolean;
  // reactions_to_own_post: boolean;
  // replies_to_comment: boolean;
  // reactions_to_comment: boolean;
  // at_mentions: boolean;
};

export type AppManifest = {
  app: {
    min_version: string;
    upgrade_message?: string;
    install_links: { ios: string; android: string };
    blocked_version?: string;
  };
};

export type UserProfile = {
  full_name: string | null;
  urls?: {
    website: string | null;
    twitter: string | null;
  };
};

export type LocationSettings = {
  enabled: boolean;
};

export type UserSettings = {
  notifications: NotificationSettings;
  location: LocationSettings;
};

export type Location = {
  id: SUUID,
  name: string,
}

export type NewLocationResponse = {
  location: Location,
  in_common: {
    friends: Contact["id"][],
    friends_of_friends: Contact["id"][],
  }
}

export type User = {
  id: SUUID;
  name: string;
  clock: HLC;
  avatar: string;
  phone_number: string;
  created_at: SDate;
  updated_at: SDate;
  is_test?: boolean;
  is_admin?: boolean;
  push_tokens?: { expo: PushToken };
  settings?: UserSettings;
  profile?: UserProfile;
};

type PushToken = {
  type: "expo";
  created_at: SDate;
  push_token: string;
};

export type HLC = {
  counter: number;
  node: SUUID;
  ts: SDate;
};

export interface CRDT {
  id: string;
  clock: HLC;
}

export type Mention = {
  id: SULID;
  to_uid: User["id"];
  by_uid: User["id"];
  mid: Message["id"];
  did: Discussion["id"];
  ts: SDate;
};

type MemberMode = "open" | "closed" | "friends_of_friends";

export const isOpen = (member_mode: MemberMode) =>
  member_mode === "open" || member_mode === "friends_of_friends";

export type Discussion = {
  id: SUUID;
  clock: HLC;
  muted: boolean;
  type: "discussion";
  name?: string;
  created_by: User["id"];
  group_id?: Group["id"];
  created_at: SDate;
  updated_at: SDate;
  seen_at?: Record<User["id"], string>;
  archived_uids: User["id"][];
  last_message_read?: Record<User["id"], Message["id"]>;
  first_message: Message["id"];
  latest_message: Message["id"];
  latest_activity_ts: SDate;
  members: User["id"][];
  subscribers: User["id"][];
  active_members: User["id"][];
  originally_from?: { did: Discussion["id"]; mid: Message["id"] };
  mentions?: Record<User["id"], Mention[]>;
  member_mode: MemberMode;
  public_mode: "public" | "hidden";
  open_until?: SDate;
  location_id?: Location["id"];
  location?: Location;
};

export type MessageEdits = {
  text: string;
  edited_at: SDate;
};

type ReactionStr = string;

export type Message = {
  id: SUUID;
  clock: HLC;
  did: Discussion["id"];
  user_id: User["id"];
  text: string;
  media: Media[];
  reply_to?: Message["id"];
  edits: MessageEdits[];
  reactions: Record<User["id"], Record<ReactionStr, SDate>>;
  posted_as_discussion?: Discussion["id"][];
  mentions: Record<User["id"], Mention>;
  flagged_uids?: User["id"][];
  link_previews?: LinkPreviewData[];
  created_at: SDate;
  updated_at: SDate;
  deleted_at?: SDate;
};

// Message type with previous and next message references for UI rendering
export interface OverlappedMessage extends Message {
  previousMessage?: Message;
  nextMessage?: Message;
}

export type BaseMedia = {
  id: SUUID;
  user_id: User["id"];
  message_id?: Message["id"];
  url: string;
  // if you call this type it will conflict with the database type
  kind: "img" | "vid" | "aud";
  mime: string;
  size: number;
  created_at: SDate;
};

export type ImageMedia = BaseMedia & { kind: "img"; }

export type VideoMedia = BaseMedia & { kind: "vid"; }

export type AudioMedia = BaseMedia & { kind: "aud"; }

export type Media = ImageMedia | VideoMedia | AudioMedia;

// ======================================================================
// Invite Link

type BaseInviteLink = {
  id: SULID;
  code: string;
  expires_at: SDate;
  created_by: User["id"];
  created_at: SDate;
  used_at?: SDate;
  used_by?: User["id"];
};
export type GroupInviteLink = BaseInviteLink & {
  type: "group";
  group_id: Group["id"];
};

export type ContactInviteLink = BaseInviteLink & {
  type: "contact";
  contact_id: Contact["id"];
};

export type CrewInviteLink = BaseInviteLink & {
  type: "crew";
};

export type InviteLink = GroupInviteLink | ContactInviteLink | CrewInviteLink;

export type InviteLinkResponse =
  | {
    type: "group";
    invite_link: GroupInviteLink;
    group: Group;
    invited_by: Contact;
    in_common: {
      contact_ids: Contact["id"][];
      contacts: Contact[];
    };
  }
  | {
    type: "contact";
    invite_link: ContactInviteLink;
    contact: Contact;
    invited_by: Contact;
    in_common: {
      contact_ids: Contact["id"][];
      contacts: Contact[];
    };
  }
  | {
    type: "crew";
    invite_link: CrewInviteLink;
    invited_by: Contact;
    members: Contact[];
    group?: Group;
  };

export type ShareableInviteLink = {
  id: string;
  url: string;
  code: string;
};

// ======================================================================
// Group

export type GroupSettings = { 
  mode: "crew" | null; 
  member_mode: "open" | "closed" | "friends_of_friends" 
};

export type Group = {
  id: SULID;
  created_at: SDate;
  created_by: User["id"];
  updated_at: SDate;
  name: string;
  description?: string;
  avatar?: string;
  owner: User["id"];
  admins: User["id"][];
  members: User["id"][];
  joined_at: Record<User["id"], SDate>;
  archived_uids: User["id"][];
  settings: GroupSettings;
  is_public: boolean;
};

export type GroupsResponse = {
  groups: Group[];
  public_groups: Group[];
};

export type GroupResponse = {
  group: Group;
  all_contacts: Contact[];
  in_common: {
    contact_ids: Contact["id"][];
  };
};

export type GroupActionType =
  | "update-attrs"
  | "remove-member"
  | "leave"
  | "add-member"
  | "add-admin"
  | "remove-admin"
  | "archive"
  | "unarchive"
  | "transfer-ownership";

type UpdateAttrs = { name?: string; description?: string; avatar?: string };
type AddMember = { members: Contact["id"][] };
type RemoveMember = AddMember;
type AddAdmin = { admins: Contact["id"][] };
type RemoveAdmin = AddAdmin;
type TransferOwnership = { owner: User["id"] };
type Leave = {};
type ArchiveDelta = {};
type UnArchiveDelta = {};

export type GroupDelta =
  | AddMember
  | RemoveMember
  | AddAdmin
  | RemoveAdmin
  | UpdateAttrs
  | Leave
  | ArchiveDelta
  | UnArchiveDelta
  | TransferOwnership;

// ======================================================================
// Contacts

// Keep in sync with src/gatz/db/contacts.clj
//
// (def contact-request-state
//   #{:contact_request/none
//     :contact_request/viewer_awaits_response
//     :contact_request/response_pending_from_viewer
//     :contact_request/viewer_ignored_response
//     :contact_request/accepted})

export type ContactRequestState =
  | "none"
  | "viewer_awaits_response"
  | "response_pending_from_viewer"
  | "viewer_ignored_response"
  | "accepted";

export type Contact = {
  id: SUUID;
  name: string;
  avatar: string | null;
  profile?: UserProfile;
};

export type ContactRequest = {
  id: SUUID;
  from: User["id"];
  state: ContactRequestState;
  created_at: SDate;
};

export type ContactRequestResponse = {
  contact_request: ContactRequest;
  in_common: {
    contacts: Contact["id"][];
    groups: Group["id"][];
  };
};

export type ContactResponse = {
  contact: Contact;
  contact_request_state: ContactRequestState;
  their_contacts?: Contact[];
  settings: { posts_hidden: boolean };
  in_common: { contacts: Contact[] };
};

export type ContactsAPIResponse = APIErrorResponse & {
  user: User;
  contacts: Contact[];
  friends_of_friends: Contact[];
  contact_requests: PendingContactRequest[];
  group?: Group;
};

export type ContactRequestAction = {
  to: User["id"];
  action: ContactRequestActionType;
};

export type ContactRequestActionType =
  | "requested"
  | "accepted"
  | "ignored"
  | "removed";

// ======================================================================
// Events

export type NewDiscussionData = DiscussionResponse & { item: ShallowFeedItem };

export type SocketEvent =
  | {
    type: "connected";
    data: { connection_id: SUUID; created_at: SDate; user_id: User["id"] };
  }
  | {
    type: "new_discussion";
    data: NewDiscussionData;
  }
  | {
    type: "new_feed_item";
    data: {
      feed_item: FeedItem;
      contacts: Contact[];
      groups: Group[];
    };
  }
  | {
    type: "new_message";
    data: { message: Message; discussion: Discussion };
  }
  | {
    type: "message_edited";
    data: {
      mid: Message["id"];
      did: Discussion["id"];
      message: Message;
      discussion: Discussion;
    };
  }
  | {
    type: "delete_message";
    data: { did: Discussion["id"]; mid: Message["id"] };
  };

// ======================================================================
// API Responses

export type SignUpError =
  | "username_taken"
  | "invalid_username"
  | "phone_taken"
  | "signup_disabled";

export type SignUpAPIResponse = APIResponse &
  (
    | {
      type: "sign_up";
      user: User;
      token: string;
      is_admin?: boolean;
      is_test?: boolean;
    }
    | {
      type: "error";
      error: SignUpError;
      message?: string;
    }
  );

export type SignInError = "invalid_username" | "user_not_found";

export type SignInAPIResponse = APIResponse &
  (
    | { type: "sign_in"; user: User; token: string }
    | { type: "error"; error: SignInError }
  );

export type SocialSignInError = 
  | "invalid_token" 
  | "token_expired" 
  | "signup_disabled"
  | "google_id_taken"
  | "apple_id_taken";

export type AppleSignInAPIResponse = APIResponse &
  (
    | { type: "sign_up"; user: User; token: string }
    | { type: "sign_in"; user: User; token: string }
    | { requires_signup: true; apple_id: string; email?: string; full_name?: string }
    | { type: "error"; error: SocialSignInError; message?: string }
  );

export type GoogleSignInAPIResponse = APIResponse &
  (
    | { type: "sign_up"; user: User; token: string }
    | { type: "sign_in"; user: User; token: string }
    | { type: "error"; error: SocialSignInError; message?: string }
  );

export type UserAPIResponse = APIResponse & {
  user: User;
};

export type PendingContactRequest = {
  id: SUUID;
  contact: Contact;
};

export type FeatureFlags = {
  post_to_friends_of_friends: boolean;
  global_invites_enabled: boolean;
};

export type FeatureFlag = keyof FeatureFlags;

export type MigrationStatus = {
  required: boolean;
  auth_method: "sms" | "apple" | "google" | "email" | "hybrid";
  show_migration_screen: boolean;
  completed_at: string | null;
};

export type MeAPIResponse = APIResponse & {
  user: User;
  contacts: Contact[];
  groups: Group[];
  contact_requests: PendingContactRequest[];
  flags: { values: FeatureFlags };
  migration?: MigrationStatus;
};

export type LinkAppleAPIResponse = APIResponse & {
  status: "linked" | "already_linked";
  user: User;
};

export type LinkGoogleAPIResponse = APIResponse & {
  status: "linked" | "already_linked";
  user: User;
};

export type XTDBTx = {
  id: number;
  ts: SDate;
};

export type DiscussionResponse = {
  discussion: Discussion;
  messages: Message[];
  users: Contact[];
  group?: Group;
};

export type DiscussionAPIResponse = APIResponse & {
  latest_tx: XTDBTx;
} & ({ current: true } | (DiscussionResponse & { current: false }));

export type ShallowDiscussionResponse = {
  discussion: Discussion;
  messages: Message[];
  user_ids: SUUID[];
};

export type MentionResponse = {
  discussion: Discussion;
  messages: Message[];
  users: Contact[];
  group?: Group;
  message: Message;
  by_user: Contact;
};

export type ShallowMentionResponse = {
  discussion: Discussion;
  messages: Message[];
  message_id: Message["id"];
  by_user_id: Contact["id"];
  user_ids: SUUID[];
};

export type DiscussionsAPIResponse = APIResponse & {
  discussions: ShallowDiscussionResponse[];
  users: Contact[];
  groups: Group[];
};

export type FeedItemType =
  | "new_request"
  | "new_friend"
  | "new_friend_of_friend"
  | "new_user_invited_by_friend"
  | "added_to_group"
  | "new_post"
  | "mentioned_in_discussion";

export type HydratedContactRequest = ContactRequest & {
  in_common: {
    groups: Group["id"][];
    contacts: Contact["id"][];
  };
};

export type HydratedContact = Contact & {
  contact_request?: ContactRequest["id"];
  invited_by?: Contact["id"];
  in_common: {
    groups: Group["id"][];
    contacts: Contact["id"][];
  };
};

export type HydratedGroup = Group & {
  added_by: Contact["id"];
  in_common: { contacts: Contact["id"][] };
};

export type HydratedDiscussion = Discussion & { messages: Message[] };

export type HydratedInviteLink = InviteLink & {
  contact: Contact;
  in_common: {
    contacts: Contact["id"][];
    groups: Group["id"][];
  };
};

export type NewPostFeedItemPayload = {
  feed_type: "new_post";
  ref_type: "discussion";
  ref: HydratedDiscussion;
};

export type FeedItemPayload =
  | {
    feed_type: "new_request";
    ref_type: "contact_request";
    ref: HydratedContactRequest;
  }
  | { feed_type: "new_friend"; ref_type: "contact"; ref: HydratedContact }
  | {
    feed_type: "new_friend_of_friend";
    ref_type: "contact";
    ref: HydratedContact;
  }
  | {
    feed_type: "new_user_invited_by_friend";
    ref_type: "user";
    ref: HydratedContact;
  }
  | { feed_type: "added_to_group"; ref_type: "group"; ref: HydratedGroup }
  | {
    feed_type: "accepted_invite";
    ref_type: "invite_link";
    ref: HydratedInviteLink;
  }
  | {
    feed_type: "mentioned_in_discussion";
    ref_type: "discussion";
    ref: HydratedDiscussion;
  }
  | NewPostFeedItemPayload;

type BaseFeedItem = {
  id: SUUID;
  created_at: SDate;
  updated_at: SDate;
  uids: User["id"][];
  dismissed_by: User["id"][];
  hidden_for: User["id"][];
  contact: Contact["id"];
  group: Group["id"];
  location_id: Location["id"];
  contact_request: ContactRequest["id"];
  seen_at: Record<User["id"], SDate>;
};

export type ShallowFeedItem = BaseFeedItem & {
  ref_type: FeedItemPayload["ref_type"];
  feed_type: FeedItemPayload["feed_type"];
  ref: string;
};

export type NewPostFeedItem = BaseFeedItem & NewPostFeedItemPayload;
export type FeedItem = BaseFeedItem & FeedItemPayload;

export type FeedAPIResponse = APIResponse & {
  users: Contact[];
  groups: Group[];
  items?: FeedItem[];
};

export type DiscussionFeedAPIResponse = APIResponse & {
  discussions: ShallowDiscussionResponse[];
  users: Contact[];
  groups: Group[];
};

export type SearchAPIResponse = DiscussionFeedAPIResponse;

export type MessageAPIResponse = APIResponse & { message: Message };

// TODO: these don't match the backend
export type VerifyStatus = "pending" | "wrong_code" | "approved" | "failed";

export type VerifyPhoneAPIResponse = APIResponse & {
  phone_number: string;
  status: VerifyStatus;
  user?: User;
  token?: string;
  attemps: number;
};

export type CheckUsernameAPIResponse = APIResponse & {
  username: string;
  available: boolean;
};

export type SimpleAPIResponse = APIResponse & {
  status: "success" | "error";
};

export type ChangePushNotificationResponse = APIResponse & {
  status: "success" | "error";
  user: User;
};

export type MediaAPIResponse = APIResponse & { media: Media };

// ======================================================================
// Push Notifications

type DiscussionPushData = {
  scope: "discussion";
  url: string;
  did: Discussion["id"];
};

type MessagePushData = {
  scope: "message";
  url: string;
  did: Discussion["id"];
  mid: Message["id"];
};

type ActivityPushData = {
  scope: "activity";
  url: string;
};

export type PushData = MessagePushData | DiscussionPushData | ActivityPushData;

// ======================================================================
// HTTP

export type FeedType = "all_posts" | "active_discussions";
export type AllFeedType = "all_posts" | "active_discussions" | "search";

export type SearchQuery = {
  type: "all";
  feedType: "search";
  term: string;
  group_id: undefined;
  contact_id: undefined;
  last_id?: FeedItem["id"];
};

export type MainFeedQuery =
  | {
    type: "all";
    feedType: FeedType;
    group_id: undefined;
    contact_id: undefined;
    location_id: undefined;
    last_id?: FeedItem["id"];
    hidden?: boolean;
  }
  | {
    type: "group";
    group_id?: Group["id"];
    contact_id: undefined;
    location_id: undefined;
    feedType: FeedType;
    last_id?: FeedItem["id"];
    hidden?: boolean;
  }
  | {
    type: "contact";
    contact_id?: User["id"];
    group_id: undefined;
    location_id: undefined;
    feedType: FeedType;
    last_id?: FeedItem["id"];
    hidden?: boolean;
  }
  | {
    type: "location";
    location_id: Location["id"];
    group_id: undefined;
    contact_id: undefined;
    feedType: FeedType;
    last_id?: FeedItem["id"];
    hidden?: boolean;
  };

export type FeedQuery = MainFeedQuery | SearchQuery;

// Invites

export type InviteLinkScreenData = {
  is_global_invites_enabled: boolean;
  can_user_invite: boolean;
  total_friends_needed: number;
  required_friends_remaining: number;
  current_number_of_friends: number;
};

export type InviteScreenAPIResponse = MeAPIResponse & {
  invite_screen: InviteLinkScreenData;
};

// Groups

export type GroupAPIResponse = APIResponse & {
  group: Group;
};

export interface LinkPreviewData {
  id: SUUID;
  uri: string;
  created_at: SDate;
  version: number;
  url: string;
  title?: string;
  type: "preview";
  site_name?: string;
  host?: string;
  description?: string;
  media_type?: string;
  images: LinkPreviewDataMedia[];
  videos: LinkPreviewDataMedia[];
  html?: string;
  favicons: string[];
}

export interface LinkPreviewDataMedia {
  uri: string;
  width?: number;
  height?: number;
}

export const PREVIEW_DATA_EXAMPLE: LinkPreviewData = {
  id: "1",
  type: "preview",
  version: 1,
  created_at: "2025-01-21T00:22:11.841Z",
  uri: "https://www.youtube.com/watch?v=l5WgAr4B8Vo",
  url: "https://www.youtube.com/watch?v=l5WgAr4B8Vo",
  title: "Stromae - Multitude, le film (Full concert)",
  description:
    "The official video of Stromae's Multitude live showDirected by Cyprien Delire and Luc Van Haver© Mosaert Label 2024Listen to the concert setlist here: https:...",
  site_name: "YouTube",
  host: "youtube.com",
  media_type: "video",
  images: [
    {
      uri: "https://i.ytimg.com/vi/l5WgAr4B8Vo/maxresdefault.jpg",
      width: 1280,
      height: 720,
    },
  ],
  videos: [],
  favicons: [
    "https://www.gstatic.com/images/branding/product/1x/youtube_24dp.png",
  ],
};

// ======================================================================
// Dulce Deep Link

export type BrowserInfo = {
  mobile: boolean;
  os: "ios" | "android" | "web";
};

export type PendingLinkResponse = { path: string };
