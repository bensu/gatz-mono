import { Alert, Platform } from "react-native";
import Constants from "expo-constants";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// import * as CRDT from "@gatz/crdt";
import * as CRDT from "../../vendor/shared/npm-package";

import { ImagePickerAsset } from "expo-image-picker";
import { AnalyticsEvents, AnalyticsWrapper } from "../sdk/posthog";

import * as T from "./types";

import { SessionContextType } from "../context/SessionProvider";

import {
  assertNever,
  byCreatedAtDesc,
  byDiscussionCreatedAt,
  byLatestActivityTs,
} from "../util";
import { LinkPreviewData, SUUID } from "./types";

const { expoConfig } = Constants;

const PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL || "chat.gatz://";

const PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

const hostUri = expoConfig?.hostUri;

const inProduction = process.env.EXPO_PUBLIC_ENV_NAME === "production";
const inExpo = expoConfig && hostUri; // TODO: maybe this needs something different for prod
const inBrowser = Platform.OS === "web";

const BROWSER_INFO: T.BrowserInfo = {
  mobile: Platform.OS !== "web",
  os: Platform.OS as "ios" | "android" | "web",
};

// const expoConfig = "exp://192.168.1.4:8081/" // this is an example value

// export const BASE_URL = "http://192.168.4.4:8080";
export const BASE_URL = inBrowser
  ? inProduction
    ? PUBLIC_API_URL
    : "http://localhost:8080"
  : inExpo
    ? `http://${hostUri.split(`:`)[0]}:8080`
    : PUBLIC_API_URL;

// export const BASE_URL = PUBLIC_API_URL;

type CreateDiscussionOpts = {
  selected_users: T.User["id"][];
  text?: string;
  media_ids?: T.Media["id"][];
  group_id?: T.Group["id"];
  to_all_contacts: boolean;
  originally_from?: {
    did: T.Discussion["id"];
    mid: T.Message["id"];
  };
  link_previews?: SUUID[];
  location_id?: T.Location["id"];
  to_all_friends_of_friends: boolean;
};

export class OpenClient {
  axiosInstance: AxiosInstance;
  baseURL: string = BASE_URL;
  constructor() {
    this.axiosInstance = this.newAxiosClient();
  }
  newAxiosClient() {
    const options = {
      timeout: 10000,
      withCredentials: false, // making sure cookies are not sent
      warmUp: false,
      recoverStateOnReconnect: true,
    };
    return axios.create(options);
  }

  async get<RequestType, ResponseType>(
    url: string,
    data: RequestType,
    options: AxiosRequestConfig = {},
  ): Promise<ResponseType> {
    const response = await this.axiosInstance.get(url, {
      ...options,
      params: data,
    });
    if (response.status !== 200) {
      throw response;
    }
    return response.data as ResponseType;
  }

  async post<RequestType, ResponseType>(
    url: string,
    data: RequestType,
    options: AxiosRequestConfig = {},
  ): Promise<ResponseType> {
    const response = await this.axiosInstance.post(url, data, options);
    if (response.status !== 200) {
      throw response;
    }
    return response.data as ResponseType;
  }

  async getManifest() {
    return await this.get<{}, T.AppManifest>(
      this.baseURL + "/api/manifest",
      {},
    );
  }

  async verifyPhone(phone_number: string): Promise<T.VerifyPhoneAPIResponse> {
    return await this.post<{ phone_number: string }, T.VerifyPhoneAPIResponse>(
      this.baseURL + "/api/verify/start",
      { phone_number },
    );
  }

  async verifyCode(
    phone_number: string,
    code: string,
  ): Promise<T.VerifyPhoneAPIResponse> {
    return await this.post<
      { phone_number: string; code: string },
      T.VerifyPhoneAPIResponse
    >(this.baseURL + "/api/verify/code", { phone_number, code });
  }

  async checkUsername(username: string): Promise<T.CheckUsernameAPIResponse> {
    return await this.post<{ username: string }, T.CheckUsernameAPIResponse>(
      this.baseURL + "/api/user/check-username",
      { username },
    );
  }

  async signIn(username: string): Promise<T.SignInAPIResponse> {
    return await this.post<{ username: string }, T.SignInAPIResponse>(
      this.baseURL + "/api/signin",
      { username },
    );
  }

  async signUp(
    username: string,
    phone_number: string,
  ): Promise<T.SignUpAPIResponse> {
    try {
      return await this.post<
        { username: string; phone_number: string },
        T.SignUpAPIResponse
      >(this.baseURL + "/api/signup", { username, phone_number });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return error.response.data;
      } else {
        throw error;
      }
    }
  }

  async appleSignIn(
    id_token: string,
    client_id: string = "chat.gatz"
  ): Promise<T.AppleSignInAPIResponse> {
    try {
      return await this.post<
        { id_token: string; client_id: string },
        T.AppleSignInAPIResponse
      >(this.baseURL + "/api/auth/apple", { id_token, client_id });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return error.response.data;
      } else {
        throw error;
      }
    }
  }

  async googleSignIn(
    id_token: string,
    client_id: string
  ): Promise<T.GoogleSignInAPIResponse> {
    try {
      return await this.post<
        { id_token: string; client_id: string },
        T.GoogleSignInAPIResponse
      >(this.baseURL + "/api/auth/google", { id_token, client_id });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return error.response.data;
      } else {
        throw error;
      }
    }
  }

  // ======================================================================
  // Dulce Deep Links

  async removeLink(path: T.PendingLinkResponse["path"]) {
    return await this.post<
      { path: T.PendingLinkResponse["path"] },
      { status: "ok" }
    >(this.baseURL + "/api/ddl/remove", { path });
  }
  async getInitialLink(): Promise<T.PendingLinkResponse["path"] | undefined> {
    try {
      const data = await this.post<
        { browser_info: T.BrowserInfo },
        T.PendingLinkResponse
      >(this.baseURL + "/api/ddl/pending", { browser_info: BROWSER_INFO });
      if (data) {
        return data.path;
      }
    } catch (e) {
      console.error("failed to get deferred link");
      console.error(e);
    }
    return undefined;
  }
}

const isErrorStatus = (status: number) => status >= 400 && status < 600;

const isBadJWT = (response: AxiosResponse) => {
  return (
    response.status === 401 &&
    response.data.type === "error" &&
    response.data.error === "invalid_token"
  );
};

const MIGRATE_TOKEN_HEADER = "gatz-auth-migrate-token";

export class GatzClient {
  http: AxiosInstance;
  baseURL: string = BASE_URL;
  consecutiveFailures: number = 0;
  token: string;
  userId: string;
  analytics: AnalyticsWrapper;
  signOut: () => void;

  constructor(sessionContext: SessionContextType, analytics: AnalyticsWrapper) {
    const session = sessionContext.session;
    this.http = axios.create({ withCredentials: false });

    this.http.interceptors.request.use((config) => {
      config.headers = config.headers || new axios.AxiosHeaders();
      config.headers.set("Accept", "application/json");
      config.headers.set("X-App-Platform", Platform.OS);
      config.headers.set("X-App-Version", Constants.expoConfig.version);
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && isBadJWT(error.response)) {
          const f = Platform.select({
            web: () => alert("Session expired, please sign in again"),
            default: () =>
              Alert.alert(
                "Session expired",
                "Please sign in again",
                [{ text: "Ok", style: "cancel" }],
                { cancelable: true },
              ),
          });
          f();
          this.signOut();
        }
        return Promise.reject(error);
      },
    );

    // Handle maintenance mode (503)
    this.http.interceptors.response.use(
      (response) => {
        if (response.status !== 503) {
          this._closeMaintenanceModal && this._closeMaintenanceModal();
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 503) {
          this._openMaintenanceModal && this._openMaintenanceModal();
        } else if (error.response && error.response.status !== 503) {
          this._closeMaintenanceModal && this._closeMaintenanceModal();
        }
        return Promise.reject(error);
      },
    );

    this.http.interceptors.response.use(
      (response) => {
        try {
          const migrateTo = response.headers[MIGRATE_TOKEN_HEADER];
          if (migrateTo) {
            console.log("migrating token");
            sessionContext.migrateLocalToken(this.token, migrateTo);
          }
        } catch (e) {
          console.error(e);
        }
        return response;
      },
      (error) => error,
    );
    this.userId = session.userId;
    this.token = session.token;
    this.analytics = analytics;
    this.signOut = sessionContext.signOut;
  }

  _openMaintenanceModal: () => void;
  _closeMaintenanceModal: () => void;
  hookMaintenanceModal(open: () => void, close: () => void) {
    this._openMaintenanceModal = open;
    this._closeMaintenanceModal = close;
  }

  handleResponse<T>(response: AxiosResponse<T>) {
    const data = response.data;
    if (isErrorStatus(response.status)) {
      throw response;
    }
    return data;
  }

  getToken(): string {
    return this.token;
  }

  addAuthentication(options: AxiosRequestConfig) {
    const token = this.getToken();
    if (!token) {
      throw new Error("token missing");
    }
    return {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token,
      },
    };
  }
  async get<RequestType, ResponseType>(
    url: string,
    data: RequestType,
    options: AxiosRequestConfig = {},
  ): Promise<ResponseType> {
    const opts = this.addAuthentication(options);
    const response = await this.http.get(url, { ...opts, params: data });
    if (response.status !== 200) {
      throw response;
    }
    return response.data as ResponseType;
  }

  async post<RequestType, ResponseType>(
    url: string,
    data: RequestType,
    options: AxiosRequestConfig = {},
  ): Promise<ResponseType> {
    const opts = this.addAuthentication(options);
    const response = await this.http.post(url, data, opts);
    if (response.status !== 200) {
      throw response;
    }
    return response.data as ResponseType;
  }

  notify(event_name: AnalyticsEvents) {
    this.analytics.capture(event_name);
  }

  // ======================================================================
  // API

  async markLocation(location: any) {
    return await this.post<{ location: any }, {} | T.NewLocationResponse>(
      this.baseURL + "/api/user/location",
      { location },
    );
  }

  async deleteAccount() {
    return await this.post<{}, T.SimpleAPIResponse>(
      this.baseURL + "/api/user/delete",
      {},
    );
  }

  async blockUser(contact_id: T.User["id"]) {
    return await this.post<{ contact_id: T.User["id"] }, T.SimpleAPIResponse>(
      this.baseURL + "/api/user/block",
      { contact_id },
    );
  }

  async registerPushNotificationToken(push_token: string) {
    // this.notify("notifications_register_token");
    return await this.post<
      { push_token: string },
      T.ChangePushNotificationResponse
    >(this.baseURL + "/api/user/push-token", { push_token });
  }

  async disableNotifications() {
    // this.notify("user_disable_notifications");
    return await this.post<{}, T.ChangePushNotificationResponse>(
      this.baseURL + "/api/user/disable-push",
      {},
    );
  }

  async updateNotificationSettings(
    settings: Partial<T.NotificationSettings>,
  ): Promise<{ user: T.User }> {
    return await this.post<
      { settings: Partial<T.NotificationSettings> },
      { user: T.User }
    >(this.baseURL + "/api/user/settings/notifications", { settings });
  }

  async enableNotifications(): Promise<{ user: T.User }> {
    const settings: T.NotificationSettings = {
      overall: true,
      activity: "daily",
      subscribe_on_comment: true,
      suggestions_from_gatz: true,
    };
    // this.notify("user_enable_notifications");
    return await this.post<
      { settings: Partial<T.NotificationSettings> },
      { user: T.User }
    >(this.baseURL + "/api/user/settings/notifications", { settings });
  }

  async getUser(id: T.User["id"]): Promise<T.UserAPIResponse> {
    return await this.get<{ id: T.User["id"] }, T.UserAPIResponse>(
      this.baseURL + "/api/user",
      { id },
    );
  }

  // rememver the last feed item id received for each feed type
  // TODO: change to FeedQuery, sans the last_id
  _lastIdReceived: Map<
    string, // JSON.stringify(T.FeedQuery)
    T.FeedItem["id"]
  > = new Map();

  lastIdForFeed(feedQuery: T.FeedQuery): T.FeedItem["id"] | undefined {
    const key = JSON.stringify({ ...feedQuery, last_id: undefined });
    return this._lastIdReceived.get(key);
  }

  setLastIdForFeed(feedQuery: T.FeedQuery, lastId: T.FeedItem["id"]) {
    const key = JSON.stringify({ ...feedQuery, last_id: undefined });
    this._lastIdReceived.set(key, lastId);
    console.log(this._lastIdReceived);
  }

  async getPosts(opts: T.FeedQuery) {
    const r = await this.get<T.FeedQuery, T.FeedAPIResponse>(
      this.baseURL + "/api/feed/items",
      opts,
    );

    const sortedItems = r.items.sort(byCreatedAtDesc);
    if (sortedItems.length > 0) {
      const lastId = sortedItems[0].id;
      this.setLastIdForFeed(opts, lastId);
    }
    return r;
  }

  async getActive(opts: T.FeedQuery): Promise<T.DiscussionFeedAPIResponse> {
    const r = await this.get<T.FeedQuery, T.DiscussionFeedAPIResponse>(
      this.baseURL + "/api/feed/active",
      opts,
    );

    const sortedDRs = r.discussions.sort(byLatestActivityTs);
    if (sortedDRs.length > 0) {
      const lastDid = sortedDRs[sortedDRs.length - 1].discussion.id;
      this.setLastIdForFeed(opts, lastDid);
    }
    return r;
  }
  async getSearch(opts: T.SearchQuery): Promise<T.SearchAPIResponse> {
    const r = await this.get<T.SearchQuery, T.SearchAPIResponse>(
      this.baseURL + "/api/search",
      opts,
    );

    const sortedDRs = r.discussions.sort(byDiscussionCreatedAt);
    if (sortedDRs.length > 0) {
      const lastId = sortedDRs[0].discussion.id;
      this.setLastIdForFeed(opts, lastId);
    }
    return r;
  }

  async getFeed(
    opts: T.FeedQuery,
  ): Promise<T.FeedAPIResponse | T.DiscussionFeedAPIResponse> {
    const feedType = opts.feedType;
    switch (feedType) {
      case "all_posts": {
        return this.getPosts(opts);
      }
      case "active_discussions": {
        return this.getActive(opts);
      }
      case "search": {
        return this.getSearch(opts);
      }
      default: {
        assertNever(feedType);
      }
    }
  }

  // TODO: this should be a Map
  discussionLatestTx: Record<T.Discussion["id"], number> = {};

  async getDiscussion(id: string) {
    const response = await this.get<
      { id: string; latest_tx?: number },
      T.DiscussionAPIResponse
    >(this.baseURL + "/api/discussion", {
      id,
      latest_tx: this.discussionLatestTx[id],
    });

    this.discussionLatestTx[id] = response.latest_tx.id;

    return response;
  }

  async maybeGetDiscussion(id: string) {
    const response = await this.get<
      { id: string; latest_tx?: number },
      T.DiscussionAPIResponse | { error: string }
    >(this.baseURL + "/api/discussion", {
      id,
      latest_tx: this.discussionLatestTx[id],
    });
    if ("error" in response) {
      return undefined;
    } else {
      this.discussionLatestTx[id] = response.latest_tx.id;
      return response;
    }
  }

  async createDiscussion(opts: CreateDiscussionOpts) {
    console.log("createDiscussion", opts);
    return await this.post<CreateDiscussionOpts, T.DiscussionResponse>(
      this.baseURL + "/api/discussions",
      opts,
    );
  }

  async markSeen(did: T.Discussion["id"]) {
    return await this.post<
      { did: T.Discussion["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/mark-seen", { did });
  }

  async markDiscussionsAsSeen(dids: T.Discussion["id"][]) {
    return await this.post<{ dids: T.Discussion["id"][] }, { status: "ok" }>(
      this.baseURL + "/api/discussion/mark-many-seen",
      { dids: dids },
    );
  }

  _markSeenTimeout = undefined;
  _markSeenQueue: Set<T.Discussion["id"]> = new Set();

  queueMarkSeen(did: T.Discussion["id"]) {
    this._markSeenQueue.add(did);
    if (this._markSeenTimeout !== undefined) {
      clearTimeout(this._markSeenTimeout);
    }
    this._markSeenTimeout = setTimeout(async () => {
      const dids = Array.from(this._markSeenQueue);
      this._markSeenTimeout = undefined;
      await this.markDiscussionsAsSeen(dids);
      // clean up what was processed in this iteration
      const newSet = this._markSeenQueue;
      dids.forEach((did) => newSet.delete(did));
    }, 1000);
  }

  _markItemsSeenTimeout = undefined;
  _markItemsSeenQueue: Set<T.FeedItem["id"]> = new Set();

  queueMarkItemsSeen(itemId: T.FeedItem["id"]) {
    this._markItemsSeenQueue.add(itemId);
    if (this._markItemsSeenTimeout !== undefined) {
      clearTimeout(this._markItemsSeenTimeout);
    }
    this._markItemsSeenTimeout = setTimeout(async () => {
      const itemIds = Array.from(this._markItemsSeenQueue);
      this._markItemsSeenTimeout = undefined;
      await this.markItemsAsSeen(itemIds);
      // clean up what was processed in this iteration
      const newSet = this._markItemsSeenQueue;
      itemIds.forEach((itemId) => newSet.delete(itemId));
    }, 1000);
  }

  async markItemsAsSeen(itemIds: T.FeedItem["id"][]) {
    return await this.post<{ ids: T.FeedItem["id"][] }, { status: "ok" }>(
      this.baseURL + "/api/feed/mark-seen",
      { ids: itemIds },
    );
  }

  async markMessageSeen(did: T.Discussion["id"], mid: T.Message["id"]) {
    return await this.post<
      { did: T.Discussion["id"]; mid: T.Message["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/mark-message-seen", { did, mid });
  }

  async hideDiscussion(did: T.Discussion["id"]) {
    return await this.post<
      { did: T.Discussion["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/archive", { did });
  }

  async unhideDiscussion(did: T.Discussion["id"]) {
    return await this.post<
      { did: T.Discussion["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/unarchive", { did });
  }

  async hideContact(contact_id: T.User["id"]) {
    return await this.post<
      { contact_id: T.Contact["id"] },
      { status: "success" }
    >(this.baseURL + "/api/contact/hide", { contact_id });
  }

  async unhideContact(contact_id: T.User["id"]) {
    return await this.post<
      { contact_id: T.Contact["id"] },
      { status: "success" }
    >(this.baseURL + "/api/contact/unhide", { contact_id });
  }

  async subscribeToDiscussion(did: T.Discussion["id"]) {
    return await this.post<
      { did: T.Discussion["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/subscribe", { did });
  }

  async unsubscribeFromDiscussion(did: T.Discussion["id"]) {
    return await this.post<
      { did: T.Discussion["id"] },
      { discussion: T.Discussion }
    >(this.baseURL + "/api/discussion/unsubscribe", { did });
  }

  async flagMessage(did: T.Discussion["id"], mid: T.Message["id"]) {
    return await this.post<
      { did: T.Discussion["id"]; mid: T.Message["id"] },
      { message: T.Message }
    >(this.baseURL + "/api/message/flag", { did, mid });
  }

  async postMessage(
    did: string,
    message_id: string,
    text: string,
    media_ids?: T.Media["id"][],
    reply_to?: T.Message["id"],
    link_previews?: SUUID[],
  ) {
    return await this.post<
      {
        discussion_id: string;
        id: string;
        text: string;
        media_ids?: T.Media["id"][];
        reply_to?: T.Message["id"];
        link_previews?: SUUID[];
      },
      T.MessageAPIResponse
    >(this.baseURL + "/api/message", {
      discussion_id: did,
      id: message_id,
      text,
      media_ids,
      reply_to,
      link_previews,
    });
  }

  async editMessage(did: string, message_id: string, text: string) {
    return await this.post<
      { discussion_id: string; id: string; text: string },
      T.MessageAPIResponse
    >(this.baseURL + "/api/message/edit", {
      discussion_id: did,
      id: message_id,
      text,
    });
  }

  async reactToMessage(
    did: T.Discussion["id"],
    mid: T.Message["id"],
    reaction: string,
  ) {
    return await this.post<
      { did: string; mid: string; reaction: string },
      T.MessageAPIResponse
    >(this.baseURL + "/api/message/react", { did, mid, reaction });
  }
  async undoReaction(
    did: T.Discussion["id"],
    mid: T.Message["id"],
    reaction: string,
  ) {
    return await this.post<
      { did: string; mid: string; reaction: string },
      T.MessageAPIResponse
    >(this.baseURL + "/api/message/undo-react", { did, mid, reaction });
  }

  async deleteMessage(did: T.Discussion["id"], mid: T.Message["id"]) {
    return await this.post<
      { id: T.Message["id"]; did: T.Discussion["id"] },
      T.SimpleAPIResponse
    >(this.baseURL + "/api/message/delete", { id: mid, did });
  }

  async getMe() {
    return await this.get<{}, T.MeAPIResponse>(this.baseURL + "/api/me", {});
  }

  async getInviteScreen() {
    return await this.get<{}, T.InviteScreenAPIResponse>(
      this.baseURL + "/api/invite-link/screen",
      {},
    );
  }

  // Files

  async getPresignedUrl(folder: "avatars" | "media") {
    return await this.post<
      { folder: "avatars" | "media" },
      { id: string; presigned_url: string; url: string }
    >(this.baseURL + "/api/file/presign", { folder });
  }

  async updateProfilePicture(file_url: string) {
    // this.notify("user_update_profile_picture");
    return await this.post<{ file_url: string }, T.UserAPIResponse>(
      this.baseURL + "/api/user/avatar",
      { file_url },
    );
  }

  async updateUserProfile(profile: Partial<T.UserProfile>) {
    return await this.post<Partial<T.UserProfile>, T.UserAPIResponse>(
      this.baseURL + "/api/user/settings/profile",
      profile,
    );
  }

  async newMedia(id: string, file_url: string, asset: ImagePickerAsset) {
    const kind = asset.type === "video" ? "vid" : "img";
    return await this.post<
      {
        id: string;
        file_url: string;
        kind: string;
        height: number;
        width: number;
        size: number;
      },
      T.MediaAPIResponse
    >(this.baseURL + "/api/media", {
      id,
      file_url,
      kind,
      height: asset.height,
      width: asset.width,
      size: asset.fileSize,
    });
  }

  // Groups

  async getGroup(id: T.Group["id"]) {
    return await this.get<{ id: T.Group["id"] }, T.GroupResponse>(
      this.baseURL + "/api/group",
      { id },
    );
  }

  async getUserGroups() {
    return await this.get<{}, T.GroupsResponse>(
      this.baseURL + "/api/groups",
      {},
    );
  }

  async createGroup({
    name,
    description,
    is_crew = false,
  }: {
    name: string;
    description: string;
    is_crew: boolean;
  }) {
    return await this.post<
      { name: string; description: string; is_crew: boolean },
      { group: T.Group }
    >(this.baseURL + "/api/group", { name, description, is_crew });
  }

  async makeGroupRequest(
    id: T.Group["id"],
    action: T.GroupActionType,
    delta: T.GroupDelta,
  ) {
    return await this.post<
      { id: T.Group["id"]; action: T.GroupActionType; delta: T.GroupDelta },
      { group: T.Group }
    >(this.baseURL + "/api/group/request", {
      id,
      action,
      delta,
    });
  }

  async postGroupShareLink(group_id: T.Group["id"]): Promise<{ url: string }> {
    return await this.post<{ group_id: T.Group["id"] }, { url: string }>(
      this.baseURL + "/api/group/share-link",
      { group_id },
    );
  }

  async updateGroupPicture(group_id: T.Group["id"], file_url: string) {
    return await this.post<
      { group_id: T.Group["id"]; file_url: string },
      T.GroupAPIResponse
    >(this.baseURL + "/api/group/avatar", { group_id, file_url });
  }

  // Invite Links

  async getInviteLink(id: T.InviteLink["id"]) {
    return await this.get<{ id: T.InviteLink["id"] }, T.InviteLinkResponse>(
      this.baseURL + "/api/invite-link",
      { id },
    );
  }
  async getInviteByCode(code: T.InviteLink["code"]) {
    return await this.get<{ code: T.InviteLink["code"] }, T.InviteLinkResponse>(
      this.baseURL + "/api/invite-link/code",
      { code },
    );
  }

  async joinInvite(id: T.InviteLink["id"]) {
    return await this.post<{ id: T.InviteLink["id"] }, T.InviteLinkResponse>(
      this.baseURL + "/api/invite-link/join",
      { id },
    );
  }

  // Crew
  async postCrewShareLink(): Promise<T.ShareableInviteLink> {
    return await this.post<{}, T.ShareableInviteLink>(
      this.baseURL + "/api/invite-link/crew-share-link",
      {},
    );
  }

  // Contacts

  async postContactShareLink(): Promise<T.ShareableInviteLink> {
    return await this.post<{}, T.ShareableInviteLink>(
      this.baseURL + "/api/contact/share-link",
      {},
    );
  }

  async getContact(id: T.User["id"]) {
    return await this.get<{ id: T.User["id"] }, T.ContactResponse>(
      this.baseURL + "/api/contact",
      { id },
    );
  }

  async getContacts(group_id?: T.Group["id"]) {
    return await this.get<{ group_id?: T.Group["id"] }, T.ContactsAPIResponse>(
      this.baseURL + "/api/contacts",
      { group_id },
    );
  }

  async makeContactRequest(
    to: T.User["id"],
    action: T.ContactRequestActionType,
  ) {
    return await this.post<
      { to: T.User["id"]; action: T.ContactRequestActionType },
      {
        id: T.ContactRequest["id"];
        state: T.ContactRequestState;
      } & T.APIErrorResponse
    >(this.baseURL + "/api/contact/request", { to, action });
  }

  async dismissFeedItem(id: T.FeedItem["id"]) {
    return await this.post<{ id: T.FeedItem["id"] }, { item: T.FeedItem }>(
      this.baseURL + "/api/feed/dismiss",
      { id },
    );
  }

  async restoreFeedItem(id: T.FeedItem["id"]) {
    return await this.post<{ id: T.FeedItem["id"] }, { item: T.FeedItem }>(
      this.baseURL + "/api/feed/restore",
      { id },
    );
  }

  async getLinkPreviews(urls: string[]) {
    return await this.post<{ urls: string[] }, { previews: LinkPreviewData[] }>(
      this.baseURL + "/api/link-preview",
      { urls },
    );
  }
}

// TODO: add type of WebSocket messages
const parseData = (data: string) => {
  return JSON.parse(data);
};

const parseEdnData = (data: string) => {
  return CRDT.read_edn(data);
};

const WS_INTERNAL_CLOSE_CODE = 4000;

type SocketListener = (data: T.SocketEvent) => void;
type EdnListener = (data: any) => void;

const MAX_RETRIES = 5;
const RECONNECT_DELAY = 5000;
const FINAL_DELAY = 30000;

export class GatzSocket {
  // baseURL: string = BASE_URL.replace("http", "ws");
  socket: WebSocket | undefined;
  userId: string;
  token: string;
  _retries: number = 0;
  _delay: number = RECONNECT_DELAY;
  _scheduledReconnect: boolean = false;
  _listeners: SocketListener[];
  _ednListeners: EdnListener[];
  _analytics: AnalyticsWrapper;
  _lastDisconnectionTime: Date | undefined;

  constructor(userId: string, token: string, analytics: AnalyticsWrapper) {
    this.userId = userId;
    this.token = token;
    this._listeners = [];
    this._ednListeners = [];
    this._analytics = analytics;
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  listenToMessage(listener: SocketListener): number {
    this._listeners.push(listener);
    return this._listeners.length - 1;
  }

  removeListener(id: number): void {
    this._listeners.splice(id, 1);
  }

  listenToEdn(listener: EdnListener): number {
    this._ednListeners.push(listener);
    return this._ednListeners.length - 1;
  }

  removeEdnListener(id: number): void {
    this._ednListeners.splice(id, 1);
  }

  resetConnectState() {
    this._retries = 0;
    this._delay = RECONNECT_DELAY;
    this._lastDisconnectionTime = undefined;
  }

  close() {
    this.socket?.close(WS_INTERNAL_CLOSE_CODE);
    this._listeners = [];
  }

  async connect({
    onConnection,
    onFail,
  }: {
    onConnection?: () => void;
    onFail?: (arg: { delay: number }) => void;
  }) {
    const baseURL = BASE_URL.replace("http", "ws");
    const url = `${baseURL}/ws/connect?user_id=${this.userId}&token=${this.token}`;

    const connectWebSocket = () => {
      this.socket = new WebSocket(url);
      const gatzSocket = this;
      this.socket.onopen = () => {
        console.log("websocket connected");
        if (this._lastDisconnectionTime) {
          const reconnection_time = new Date();
          const timeSinceDisconnection =
            reconnection_time.getTime() - this._lastDisconnectionTime.getTime();
          this._analytics.capture("websocket.reconnected", {
            last_disconnection_time: this._lastDisconnectionTime.toISOString(),
            reconnection_time: reconnection_time.toISOString(),
            disconnect_duration: timeSinceDisconnection,
            retries_needed: this._retries,
          });
        } else {
          this._analytics.capture("websocket.connected");
        }
        this.resetConnectState();
        if (onConnection) {
          onConnection();
        }
      };
      this.socket.onclose = (event: CloseEvent) => {
        console.log("websocket closed", event);
        this._analytics.capture("websocket.disconnected", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this._lastDisconnectionTime = new Date();
        if (event.code === WS_INTERNAL_CLOSE_CODE) {
          console.log("websocket closed by internal code", event);
          return;
        }
        // Retry connection after a delay
        scheduleReconnect(this._delay);
        onFail && onFail({ delay: this._delay });
      };
      this.socket.onerror = (event: ErrorEvent) => {
        this._analytics.capture("websocket.error", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
        this._lastDisconnectionTime = new Date();
        // Retry connection after a delay
        scheduleReconnect(this._delay);
        onFail && onFail({ delay: this._delay });
      };
      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = parseEdnData(event.data);
          gatzSocket._ednListeners.forEach((listener) => {
            try {
              listener(data);
            } catch (e) {
              console.error("error in edn listener", e);
            }
          });
        } catch (e) {
          try {
            const data = parseData(event.data);

            console.log("websocket message data", data);
            gatzSocket._listeners.forEach((listener) => {
              try {
                listener(data);
              } catch (e) {
                console.error("error in listener", e);
              }
            });
          } catch (e) {
            console.warn("error parsing data", e);
          }
        }
      };
    };

    const scheduleReconnect = (delay: number) => {
      if (!this._scheduledReconnect) {
        this._scheduledReconnect = true;
        setTimeout(() => {
          this._scheduledReconnect = false;
          tryConnect();
        }, delay);
      }
    };

    const tryConnect = () => {
      if (this._retries < MAX_RETRIES) {
        this._retries = this._retries + 1;
        try {
          connectWebSocket();
        } catch (e) {
          // Retry connection after a delay
          console.log("failed to connect to websocket");
          console.error(e);
          scheduleReconnect(this._delay);
          onFail && onFail({ delay: this._delay });
        }
      } else {
        this._retries = 0;
        this._delay = FINAL_DELAY;
        scheduleReconnect(this._delay);
        onFail && onFail({ delay: this._delay });
      }
    };

    console.log("connecting to websocket", url);
    tryConnect();
  }
}
