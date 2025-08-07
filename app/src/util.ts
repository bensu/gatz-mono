import dayjs from "dayjs";
import { Alert, Platform } from "react-native";
import * as T from "./gatz/types";

import { isEqual } from "lodash";

export const isMobile = (): boolean => {
  if (Platform.OS === "web") {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase(),
    );
  }
  return Platform.OS === "android" || Platform.OS === "ios";
};

export const hasMouse = (): boolean => {
  return !isMobile();
};

export const renderParticipants = (users: T.User[]): string => {
  switch (users.length) {
    case 0:
      return "no one";
    case 1:
      return `${users[0].name}`;
    case 2:
      return `${users[0].name} and ${users[1].name}`;
    case 3:
      return `${users[0].name}, ${users[1].name}, and ${users[2].name}`;
    default:
      return `${users[0].name}, ${users[1].name}, and ${users.length - 2} others`;
  }
};

interface CreatedAt {
  createdAt: string | Date;
}

interface Created_At {
  created_at: string | Date;
}

export const byCreatedAt = (a: CreatedAt | Created_At, b: CreatedAt | Created_At) => {
  const aDate = 'createdAt' in a ? a.createdAt : a.created_at;
  const bDate = 'createdAt' in b ? b.createdAt : b.created_at;
  return aDate < bDate ? 1 : -1;
};

export const byCreatedAtDesc = (a: CreatedAt | Created_At, b: CreatedAt | Created_At) => -1 * byCreatedAt(a, b);

export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

export const setToggle = <T>(set: Set<T>, item: T) => {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
};

// This prioritizes the newer message over the latter ones
export const appendMessages = (
  current: T.Message[],
  newMessages: T.Message[],
): T.Message[] => {
  let seen = new Set<T.Message["id"]>();
  return [...(newMessages || []), ...(current || [])]
    .filter((m: T.Message) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        return true;
      }
      return false;
    })
    .sort(byCreatedAtDesc);

};

export const removeMessage = (
  current: T.Message[],
  messageId: T.Message["id"],
): T.Message[] => {
  return current.filter((m: T.Message) => m.id !== messageId);
};

export const isMentionSeenByUser = (
  d: T.Discussion,
  m: T.Message,
  userId: T.User["id"],
): boolean => {
  const seen_at = d.seen_at || {};
  const user_seen_d_at = seen_at[userId];
  if (user_seen_d_at) {
    return m.created_at <= user_seen_d_at;
  } else {
    return false;
  }
};

export const isCreatedSeenByUser = (
  d: T.Discussion,
  userId: T.User["id"],
): boolean => {
  const seen_at = d.seen_at || {};
  const user_seen_at = seen_at[userId];
  if (user_seen_at) {
    return d.created_at <= user_seen_at;
  } else {
    return false;
  }
};

export const isLatestSeenByUser = (
  d: T.Discussion,
  userId: T.User["id"],
): boolean => {
  const seen_at = d.seen_at || {};
  const user_seen_at = seen_at[userId];
  if (user_seen_at) {
    return d.latest_activity_ts <= user_seen_at;
  } else {
    return false;
  }
};

const byUpdatedAtDesc = (
  a: { discussion: T.Discussion },
  b: { discussion: T.Discussion },
) => {
  return a.discussion.updated_at < b.discussion.updated_at ? 1 : -1;
};

export const byDiscussionCreatedAt = (
  a: { discussion: T.Discussion },
  b: { discussion: T.Discussion },
) => {
  return a.discussion.created_at < b.discussion.created_at ? -1 : 1;
};

export const byDiscussionCreatedAtDesc = (
  a: { discussion: T.Discussion },
  b: { discussion: T.Discussion },
) => {
  return a.discussion.created_at < b.discussion.created_at ? 1 : -1;
};

export const byLatestActivityTs = (
  a: { discussion: T.Discussion },
  b: { discussion: T.Discussion },
) => {
  return a.discussion.latest_activity_ts < b.discussion.latest_activity_ts
    ? 1
    : -1;
};

export const isSameDay = (a: string, b: string) => {
  const d1 = new Date(a);
  const d2 = new Date(b);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const crdtIsEqual = (a: T.CRDT, b: T.CRDT) => {
  if (a && b) {
    return a.id === b.id && isEqual(a.clock, b.clock);
  } else if (a && !b) {
    return false;
  } else if (!a && b) {
    return false;
  } else if (!a && !b) {
    return true;
  } else {
    return false;
  }
};

export const lastMidReadByUser = (
  discussion: T.Discussion,
  userId: T.User["id"],
): T.Message["id"] | undefined => {
  const lastMessageReadByUser = discussion?.last_message_read || {};
  return lastMessageReadByUser[userId];
};

export const shouldShowLastSeen = (
  mid: T.Message["id"] | undefined,
  discussion: T.Discussion,
  userId: T.User["id"],
): boolean => {
  const lastSeenMid = lastMidReadByUser(discussion, userId);
  const isLastSeenTheLastMessage =
    lastSeenMid && lastSeenMid === discussion?.latest_message;
  return mid && !isLastSeenTheLastMessage && lastSeenMid && lastSeenMid === mid;
};

interface M {
  user_id: T.User["id"];
}

export const messagesToUserIds = (ms: M[]): Set<T.User["id"]> => {
  const userIds = new Set<T.User["id"]>();
  ms.forEach((m) => userIds.add(m.user_id));
  return userIds;
};

export const isStillOpen = (d: T.Discussion) => {
  if (T.isOpen(d.member_mode)) {
    const now = dayjs();
    const isOpenExpired = d.open_until && dayjs(d.open_until).isBefore(now);
    return !isOpenExpired;
  } else {
    return false;
  }
};

export const filterToUndefined = <T>(f: (t: T) => boolean, xs: T[]): T[] | undefined => {
  const out = xs.filter(f);
  if (out.length === 0) {
    return undefined;
  } else {
    return out;
  }
};
// Helper function to get user id from either type
// This supports both T.User (id) and legacy User (_id) formats
export const getUserId = (user?: { id?: string; _id?: string; }): string | undefined => {
  if (!user) return undefined;
  return user.id || user._id; // Prefer id over _id
};

export const union = <T>(a: Set<T>, b: Set<T>): Set<T> => {
  // Use spread operator since Set doesn't have a union method
  return new Set([...a, ...b]);
};

export const multiPlatformAlert = (message: string, description?: string) => {
  if (Platform.OS === "web") {
    alert(description ? `${message}\n${description}` : message);
  } else {
    Alert.alert(message, description);
  }
};
