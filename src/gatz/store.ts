import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce } from "lodash";

import * as Notifications from "expo-notifications";

import * as zustand from "zustand";
import * as zustandMiddleware from "zustand/middleware";

import { Discussion, LinkPreviewData, Media, Message } from "./types";
import * as T from "./types";
import { filterToUndefined } from "../util";
import { addLoadedPreviews, addLoadingPreviews, LinkPreviewState, removeLinkPreview, UrlToLinkPreviewState } from "../vendor/react-native-link-preview/LinkPreview";

export type SocketState =
  | { strategy: "OPEN" }
  | {
    strategy: "CONNECTING";
    disconnectedAt: Date;
    delay: number;
    counter: number;
  };

export const useSocketStore = zustand.create<{
  socketState: SocketState;
  handleConnection: () => void;
  handleFailure: ({ delay }: { delay: number }) => void;
  handleInterval: () => void;
}>((set) => ({
  socketState: {
    strategy: "CONNECTING",
    disconnectedAt: new Date(),
    delay: 0,
    counter: 0,
  },
  handleConnection: () =>
    set((state) => ({ ...state, socketState: { strategy: "OPEN" } })),
  handleFailure: ({ delay }: { delay: number }) => {
    set((state) => {
      if (state.socketState.strategy === "CONNECTING") {
        return {
          socketState: {
            ...state.socketState,
            delay,
            counter: delay,
          },
        };
      } else {
        return {
          socketState: {
            strategy: "CONNECTING",
            disconnectedAt: new Date(),
            delay,
            counter: delay,
          },
        };
      }
    });
  },
  handleInterval: () =>
    set((state) => {
      if (state.socketState.strategy === "CONNECTING") {
        const currentCounter = state.socketState.counter;
        return {
          ...state,
          socketState: {
            ...state.socketState,
            counter: currentCounter <= 0 ? 0 : currentCounter - 1000,
          },
        };
      } else {
        return state;
      }
    }),
}));

const SAVE_EVERY_MS = 1000;

class DebugStore implements zustandMiddleware.StateStorage {
  constructor(store: zustandMiddleware.StateStorage) {
    this.store = store;
  }

  store: zustandMiddleware.StateStorage;

  getItem(name: string): string | null | Promise<string | null> {
    return this.store.getItem(name);
  }

  setItem(name: string, value: string): void {
    this.store.setItem(name, value);
  }

  removeItem = (name: string) => {
    return this.store.removeItem(name);
  };
}

type PostDraftState = {
  draft: string;
  setDraft: (draft: string) => void;
  location: T.Location | undefined;
  setLocation: (location: T.Location) => void;
  medias?: Media[];
  addMedias: (medias: Media[]) => void;
  removeMedia: (mediaId: Media["id"]) => void;
  clearDraft: () => void;
  linkPreviews: UrlToLinkPreviewState;
  setLinkPreviews: (linkPreviews: UrlToLinkPreviewState) => void;
  addLoadingPreviews: (newUrls: string[]) => void;
  addLoadedPreviews: (previews: LinkPreviewData[]) => void;
  removeLinkPreview: (url: string) => void;
};


export const MAX_MEDIA_COUNT = 10;

export const useDraftStore = zustand.create<PostDraftState>()(
  zustandMiddleware.persist(
    (set, _get) => ({
      draft: "",
      medias: undefined as Media[] | undefined,
      location: undefined,
      setLocation: (location: T.Location) => set({ location }),
      linkPreviews: {},
      setDraft: (draft: string) => set({ draft }),
      addMedias: (medias: Media[]) =>
        set((state) => {
          const newMedias = [...(state.medias || []), ...medias];
          return {
            medias: newMedias.length > MAX_MEDIA_COUNT
              ? newMedias.slice(0, MAX_MEDIA_COUNT)
              : newMedias,
          };
        }),
      removeMedia: (mediaId: Media["id"]) =>
        set((state) => {
          const newMedias = state.medias?.filter((m) => m.id !== mediaId);
          return { medias: newMedias.length === 0 ? undefined : newMedias };
        }),
      setLinkPreviews: (linkPreviews: UrlToLinkPreviewState) => set({ linkPreviews }),
      addLoadingPreviews: (newUrls: string[]) => set((state) => addLoadingPreviews(state.linkPreviews, newUrls)),
      addLoadedPreviews: (previews: LinkPreviewData[]) => set((state) => addLoadedPreviews(state.linkPreviews, previews)),
      removeLinkPreview: (url: string) => set((state) => removeLinkPreview(state.linkPreviews, url)),
      clearDraft: () => set({ draft: "", medias: undefined, linkPreviews: {} }),
    }),
    {
      name: "gatz/draft-post",
      storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
    },
  ),
);

type ReplyDraft = {
  text: string;
  medias?: Media[];
  replyTo?: Message["id"];
  editingId?: Message["id"];
  linkPreviews?: UrlToLinkPreviewState;
};

type FunctionSwap = ((f: (prevState: UrlToLinkPreviewState) => UrlToLinkPreviewState) => void);

type ReplyDraftState =
  | (ReplyDraft & {
    setReplyText: (text: string) => void;
    removeReplyMedia: (mediaId: Media["id"]) => void;
    addReplyMedias: (medias: Media[]) => void;
    setReplyMedias: (media: Media[] | undefined) => void;
    setReplyLinkPreviews: FunctionSwap;
    setReplyTo: (replyTo: Message["id"]) => void;
    setEditingId: (editingId: Message["id"], text: string) => void;
    clearReplyDraft: () => void;
  })
  | undefined;

export type ReplyDraftStore = ReturnType<typeof createDraftReplyStore>;

const EMPTY_REPLY_DRAFT: ReplyDraft = {
  text: undefined,
  medias: undefined,
  replyTo: undefined,
  editingId: undefined,
  linkPreviews: undefined,
};

export const createDraftReplyStore = (did: Discussion["id"]) => {
  return zustand.create<ReplyDraftState>()(
    zustandMiddleware.persist(
      (set, get) => ({
        ...EMPTY_REPLY_DRAFT,
        clearReplyDraft: () => set(EMPTY_REPLY_DRAFT),
        setReplyTo: (replyTo: Message["id"]) =>
          set({ replyTo, editingId: undefined }),
        setReplyText: (text: string) => set({ text }),
        removeReplyMedia: (mediaId: Media["id"]) => {
          set((state) => ({
            medias: filterToUndefined((m) => m.id !== mediaId, state.medias),
          }));
        },
        addReplyMedias: (medias: Media[]) => {
          set((state) => {
            const newMedias = [...(state.medias || []), ...medias];
            return {
              medias: newMedias.length > MAX_MEDIA_COUNT
                ? newMedias.slice(0, MAX_MEDIA_COUNT)
                : newMedias,
            };
          });
        },
        setReplyMedias: (medias: Media[] | undefined) => set({ medias }),
        setEditingId: (editingId: Message["id"], text: string) =>
          set({ text, editingId, replyTo: undefined }),
        setReplyLinkPreviews: (f: (prevState: UrlToLinkPreviewState) => UrlToLinkPreviewState) => {
          const prevState = get().linkPreviews;
          const newState = f(prevState);
          set({ linkPreviews: newState });
        }
      }),
      {
        name: "gatz/draft-replies/" + did,
        storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
      },
    ),
  );
};

type MessageSuggestionsState = {
  youShouldPostWasDismissed?: boolean;
};

export type MesageSuggestionsStore = MessageSuggestionsState & {
  dismissYouShouldPost: () => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

const EMPTY_MESSAGE_SUGGESTIONS: MessageSuggestionsState = {
  youShouldPostWasDismissed: undefined,
};

export const messageSuggestionStore = (mid: Message["id"]) => {
  return zustand.create<MesageSuggestionsStore>()(
    zustandMiddleware.persist(
      (set) => ({
        ...EMPTY_MESSAGE_SUGGESTIONS,
        dismissYouShouldPost: () => set({ youShouldPostWasDismissed: true }),
        isLoading: true,
        setIsLoading: (isLoading: boolean) => set({ isLoading }),
      }),
      {
        name: "gatz/message-suggestions/" + mid,
        storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => state.setIsLoading(false),
      },
    ),
  );
};

type NotificationId = Notifications.NotificationRequest["identifier"];

export type PendingNotificationsStore = {
  nts: Record<T.Discussion["id"], NotificationId[]>;
  activityNts: NotificationId[];
  getActivityNotifications: () => NotificationId[];
  addActivityNotification: (nid: NotificationId) => void;
  clearActivityNotifications: () => void;
  getDiscussionNotifications: (did: T.Discussion["id"]) => NotificationId[];
  addDiscussionNotification: (
    did: T.Discussion["id"],
    nid: NotificationId,
  ) => void;
  clearDiscussion: (did: T.Discussion["id"]) => void;
};

export const useNotificationStore = zustand.create<PendingNotificationsStore>()(
  zustandMiddleware.persist(
    (set, get) => ({
      nts: {},
      activityNts: [],
      getActivityNotifications: () => get().activityNts,
      addActivityNotification: (nid: NotificationId) =>
        set((state) => {
          state.activityNts.push(nid);
          return state;
        }),
      clearActivityNotifications: () =>
        set((state) => {
          state.activityNts = [];
          return state;
        }),
      getDiscussionNotifications: (did: T.Discussion["id"]) => {
        const nts = get().nts || {};
        return nts[did] || [];
      },
      addDiscussionNotification: (
        did: T.Discussion["id"],
        nid: NotificationId,
      ) => {
        set((state) => {
          state.nts = state.nts || {};
          const discussionNotifications = state.nts[did] || [];
          discussionNotifications.push(nid);
          state.nts[did] = discussionNotifications;
          return state;
        });
      },
      clearDiscussion: (did: T.Discussion["id"]) => {
        set((state) => {
          const nts = state.nts || {};
          delete nts[did];
          state.nts = nts;
          return state;
        });
      },
    }),
    {
      name: "gatz/pending-notifications",
      storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
    },
  ),
);

export type FrequentEmojiStore = {
  emojis: Record<string, number>;
  incrementEmoji: (emoji: string) => void;
  getTopEmojis: (count: number) => string[];
};

const DEFAULT_REACTION_EMOJIS = [
  "❤️",
  "👍",
  "👎",
  "😂",
  "😮",
  "😢",
  "🔥",
  "➕",
  "❓",
  "❗",
  "💎",
  "🎯",
  "💯",
  "👌",
  "👋",
  "😍",
];

const TOP_EMOJIS_COUNT = 50;

export const frequentEmojiStore = zustand.create<FrequentEmojiStore>()(
  zustandMiddleware.persist(
    (set, get) => ({
      emojis: DEFAULT_REACTION_EMOJIS.reduce((acc, emoji) => {
        acc[emoji] = 0;
        return acc;
      }, {} as Record<string, number>),
      incrementEmoji: (emoji: string) => set((state) => {
        state.emojis[emoji] = (state.emojis[emoji] || 0) + 1;
        // keep a fixed number of top emojis
        const sortedEmojis = Object.entries(state.emojis).sort((a, b) => b[1] - a[1]);
        return {
          emojis: sortedEmojis.slice(0, TOP_EMOJIS_COUNT).reduce((acc, [emoji, count]) => {
            acc[emoji] = count;
            return acc;
          }, {} as Record<string, number>),
        };
      }),
      getTopEmojis: (count: number): string[] => {
        const emojis = Object.entries(get().emojis);
        const sortedEmojis = emojis.sort((a, b) => b[1] - a[1]);
        return sortedEmojis.slice(0, count).map(([emoji]) => emoji);
      },
    }),
    {
      name: "gatz/frequent-emojis/",
      storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
    },
  ),
);

type LocationLogEntry = { ts: number; };

type LocationStore = {
  last_location: LocationLogEntry | undefined;
  addLocation: () => void;
  clearLocationLog: () => void;
}

export const useLocationStore = zustand.create<LocationStore>()(
  zustandMiddleware.persist(
    (set) => ({
      last_location: undefined,
      addLocation: () => set((state) => {
        const newEntry: LocationLogEntry = { ts: Date.now() };
        return { last_location: newEntry };
      }),
      clearLocationLog: () => set({ last_location: undefined }),
    }),
    {
      name: "gatz/location",
      storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Re-export the failed messages store
export { useFailedMessagesStore, type FailedMessage, type FailedMessagesState } from "./store/failedMessagesStore";
