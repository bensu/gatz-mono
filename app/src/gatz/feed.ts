import * as T from "./types";
import dayjs from "dayjs";
import { Color as GatzColor } from "./styles";

export function isSameDayJs(a: dayjs.Dayjs, b: dayjs.Dayjs): boolean {
  return a.isSame(b, "day");
}

export const isSameDay = (a: string, b: string) => {
  const d1 = new Date(a);
  const d2 = new Date(b);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export function compareDates(a: T.SDate, b: T.SDate): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

function compareDatesReverse(a: T.SDate, b: T.SDate): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export const byTsAsc = (a: { ts: T.SDate }, b: { ts: T.SDate }) =>
  compareDates(a.ts, b.ts);

export const byTsDesc = (a: { ts: T.SDate }, b: { ts: T.SDate }) =>
  compareDatesReverse(a.ts, b.ts);

export const byCreatedAtAsc = (a: { created_at: T.SDate }, b: { created_at: T.SDate }) =>
  compareDates(a.created_at, b.created_at);

export const byCreatedAtDesc = (a: { created_at: T.SDate }, b: { created_at: T.SDate }) =>
  compareDatesReverse(a.created_at, b.created_at);

export type FeedSeparator = {
  type: "separator";
  text: string;
  color: string;
  hasLine: boolean;
};

export const isSameSeparator = (a: FeedSeparator, b: FeedSeparator) => {
  if (a) {
    if (b) {
      return (
        a.text === b.text && a.color === b.color && a.hasLine === b.hasLine
      );
    } else {
      return false;
    }
  } else {
    if (b) {
      return false;
    } else {
      return true;
    }
  }
};

export const DATE_FORMAT = "ll";

export const renderDateText = (
  date: Date | string,
  locale = "en",
  dateFormat = DATE_FORMAT,
): string => {
  if (isSameDayJs(dayjs(date), dayjs(new Date()))) {
    return "Today";
  } else {
    return dayjs(date).locale(locale).format(dateFormat);
  }
};

export const dateSeparator = (date: string): FeedSeparator => {
  return {
    type: "separator",
    text: renderDateText(date),
    color: GatzColor.strongGrey,
    hasLine: false,
  };
};

export const NEW_SEPARATOR: FeedSeparator = {
  type: "separator",
  text: "New",
  color: GatzColor.active,
  hasLine: true,
};
export const SEEN_SEPARATOR: FeedSeparator = {
  type: "separator",
  text: "Seen",
  color: GatzColor.strongGrey,
  hasLine: true,
};

type FeedItemMetadata = {
  id: T.FeedItem["id"];
  ts: T.SDate;
  isSeen: boolean;
  isFirstInDate: boolean;
  separator: FeedSeparator | undefined;
};

export type MentionFeedItemPayload = {
  type: "mention";
  discussion_response: T.DiscussionResponse;
  mentions: T.Mention[];
} & FeedItemMetadata;

export type PostFeedItemPayload = {
  type: "post";
  discussion_response: T.DiscussionResponse;
} & FeedItemMetadata;

type ContactRequestFeedItemPayload = {
  type: "contact_request";
  contact_request_response: T.ContactRequestResponse;
} & FeedItemMetadata;

type FeedItemWithPayload = T.FeedItem & { type: "feed_item" } & FeedItemMetadata;

// (1) We take what we have from the backend and put in a common feed format
// FeedItem is what the feed will render

export type FeedItemWithSeparator = FeedItemPayload & {
  separator: FeedSeparator | undefined;
};

// 1b. for posts

export const seenByUser = (
  d: T.Discussion,
  userId: T.User["id"],
): T.SDate | undefined => {
  const seen_at = d.seen_at || {};
  return seen_at[userId];
};

export const isMentionSeenByUser = (
  d: T.Discussion,
  m: T.Message,
  userId: T.User["id"],
): boolean => {
  const user_seen_d_at = seenByUser(d, userId);
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
  const user_seen_d_at = seenByUser(d, userId);
  if (user_seen_d_at) {
    return d.created_at <= user_seen_d_at;
  } else {
    return false;
  }
};

export const postToAllPostsFeedItem = (
  discussion_response: T.DiscussionResponse,
  userId: T.User["id"],
): PostFeedItemPayload | MentionFeedItemPayload => {
  const { discussion } = discussion_response;

  // is this a mention or a discussion item?
  const user_mentions: T.Mention[] = (discussion.mentions || [])[userId] || [];
  if (user_mentions.length > 0) {
    const sorted_mentions = user_mentions.sort(byTsAsc);
    const last_mention = sorted_mentions[sorted_mentions.length - 1];
    const user_seen_d_at = seenByUser(discussion, userId);
    const isSeen = compareDates(last_mention.ts, user_seen_d_at) <= 0;
    return {
      type: "mention",
      id: discussion.id,
      discussion_response,
      mentions: sorted_mentions,
      ts: last_mention.ts,
      isSeen,
      isFirstInDate: false,
      separator: undefined,
    };
  } else {
    const isSeen = isCreatedSeenByUser(discussion, userId);
    return {
      type: "post",
      id: discussion.id,
      discussion_response,
      ts: discussion.created_at,
      isSeen,
      isFirstInDate: false,
      separator: undefined,
    };
  }
};

export const isLatestSeenByUser = (d: T.Discussion, userId: T.User["id"]): boolean => {
  const seen_at = d.seen_at || {};
  const user_seen_at = seen_at[userId];
  if (user_seen_at) {
    return d.latest_activity_ts <= user_seen_at;
  } else {
    return false;
  }
};

export const postToActiveChatsFeedItem = (
  discussion_response: T.DiscussionResponse,
  userId: T.User["id"],
): PostFeedItemPayload => {
  const { discussion } = discussion_response;
  const isSeen = isLatestSeenByUser(discussion, userId);
  return {
    type: "post",
    id: discussion.id,
    discussion_response,
    ts: discussion.latest_activity_ts,
    isSeen,
    isFirstInDate: false,
    separator: undefined,
  };
};

export const postToSearchChatsFeedItem = (dr: T.DiscussionResponse): PostFeedItemPayload => {
  return {
    type: "post",
    id: dr.discussion.id,
    discussion_response: dr,
    ts: dr.discussion.created_at,
    isSeen: true,
    isFirstInDate: false,
    separator: undefined,
  };
};

export const isItemLatestSeenByUser = (item: T.FeedItem, userId: T.User["id"]): boolean => {
  const seen_at = item.seen_at || {};
  const user_seen_at = seen_at[userId];
  if (user_seen_at) {
    return item.created_at <= user_seen_at;
  } else {
    return false;
  }
};

export const itemToFeedItem = (item: T.FeedItem, userId: T.User["id"]): FeedItemWithPayload => {
  return {
    ...item,
    type: "feed_item",
    ts: item.created_at,
    isSeen: isItemLatestSeenByUser(item, userId),
    isFirstInDate: false,
    separator: undefined,
  };
};

// 2. We put all the feed items in one list and sort them

export type FeedItemPayload =
  | MentionFeedItemPayload
  | PostFeedItemPayload
  | ContactRequestFeedItemPayload
  | FeedItemWithPayload;

const hiddenForUser = (userId: T.SUUID, d: T.Discussion) => {
  return Array.isArray(d.archived_uids) && d.archived_uids.includes(userId);
}

const discussionInQuery = (
  userId: T.SUUID,
  feedQuery: T.MainFeedQuery,
  dr: T.DiscussionResponse,
) => {
  const { contact_id, group_id, location_id } = feedQuery;
  const isEmpty = dr.messages.length === 0;
  if (isEmpty) {
    return false;
  }
  if (hiddenForUser(userId, dr.discussion)) {
    if (!feedQuery.hidden) {
      return false;
    }
  }

  if (contact_id) {
    return dr.discussion.created_by === contact_id;
  } else if (group_id) {
    return dr.discussion.group_id === group_id;
  } else if (location_id) {
    return dr.discussion.location_id === location_id;
  } else {
    return true;
  }
};

const hasComments = (dr: T.DiscussionResponse) =>
  dr.discussion.latest_message !== dr.discussion.first_message;

const isActiveMember = (
  userId: T.User["id"],
  dr: T.DiscussionResponse,
): boolean => {
  const activeMembers = new Set<T.User["id"]>(dr.discussion.active_members);
  return activeMembers.has(userId);
};


/**
 * Converts an array of discussion responses into sorted feed items for the active chats view.
 * 
 * This function filters discussions to show only those that:
 * 1. [active-filters-by-query] Match the current feed query (by contact_id, group_id, or location_id)
 * 2. [active-excludes-archived] Are not hidden/archived by the user (unless viewing hidden items)
 * 3. [active-requires-comments] Have at least one comment (i.e., more than just the initial post)
 * 4. [active-requires-membership] Include the current user as an active member
 * 
 * The resulting feed items are sorted by latest activity timestamp in descending order.
 * Each item includes whether it has been seen by the user based on their seen_at timestamp.
 * 
 * Invariants maintained:
 * - [active-returns-post-type] All returned items are of type PostFeedItemPayload
 * - [active-sorts-by-latest-activity] Items are always sorted by latest_activity_ts in descending order
 * - [active-requires-comments] No discussions without comments are included
 * - [active-requires-membership] No discussions where user is not an active member are included
 * - [active-marks-seen-status] Each item includes whether it has been seen by the user
 * 
 * @param userId - The ID of the current user viewing the feed
 * @param feedQuery - Query parameters to filter discussions (contact_id, group_id, location_id, hidden flag)
 * @param discussion_response - Array of discussion responses from the API
 * @returns Array of PostFeedItemPayload objects sorted by latest activity
 */
export const toSortedActiveFeedItems = (
  userId: T.User["id"],
  feedQuery: T.MainFeedQuery,
  discussion_response: T.DiscussionResponse[],
): FeedItemPayload[] => {
  return discussion_response
    .filter((dr) => discussionInQuery(userId, feedQuery, dr))
    .filter((dr) => hasComments(dr) && isActiveMember(userId, dr))
    .map((dr) => postToActiveChatsFeedItem(dr, userId))
    .sort(byTsDesc);
};

export const toSortedSearchFeedItems = (
  userId: T.User["id"],
  discussion_response: T.DiscussionResponse[],
): PostFeedItemPayload[] => {
  return discussion_response
    .map(postToSearchChatsFeedItem)
    .sort(byTsDesc);
};

const isDiscussionItem = (itemRef: T.FeedItem["ref"]): itemRef is T.HydratedDiscussion => {
  if (!itemRef || typeof itemRef !== 'object') {
    return false;
  }

  return typeof itemRef === 'object' && itemRef !== null && 'type' in itemRef && itemRef.type === "discussion";
};


const inQuery = (userId: T.SUUID, feedQuery: T.MainFeedQuery, item: T.FeedItem): boolean => {
  // Guard against invalid feedQuery
  if (!feedQuery || typeof feedQuery !== 'object') {
    return false;
  }

  const { contact_id, group_id, type, location_id } = feedQuery;

  // Guard against invalid item
  if (!item || !item.ref || typeof item.ref !== 'object') {
    return false;
  }

  if (item.dismissed_by.includes(userId)) {
    if (!feedQuery.hidden) {
      return false;
    }
  }

  if (isDiscussionItem(item.ref)) {
    const d = item.ref;
    // Guard against invalid messages array
    const isEmpty = !d.messages || !Array.isArray(d.messages) || d.messages.length === 0;
    if (isEmpty) {
      return false;
    }
    if (hiddenForUser(userId, d)) {
      if (!feedQuery.hidden) {
        return false;
      }
    }
    if (contact_id) {
      return d.created_by === contact_id;
    } else if (group_id) {
      return d.group_id === group_id;
    } else if (location_id) {
      return d.location_id === location_id;
    } else {
      return true;
    }
  } else {
    if (contact_id) {
      return item.contact === contact_id;
    } else if (group_id) {
      return item.group === group_id;
    } else if (location_id) {
      return item.location_id === location_id;
    } else {
      return true;
    }
  }
};

/**
 * Converts an array of generic feed items into sorted, deduplicated feed items with date separators.
 * 
 * This function performs several important transformations:
 * 1. [sorted-filters-by-query] Filters items based on the feed query (contact_id, group_id, location_id)
 * 2. [sorted-excludes-dismissed] Excludes dismissed items and empty discussions (unless viewing hidden items)
 * 3. [sorted-deduplication] Deduplicates items to ensure each entity (discussion, contact request, etc.) appears only once
 * 4. [sorted-maintains-order] Sorts items by creation date in descending order
 * 5. [sorted-date-separators] Adds date separators for visual grouping (marks first item of each calendar day)
 * 6. [sorted-marks-seen-status] Marks items as seen based on user's seen_at timestamp
 * 
 * Invariants maintained:
 * - [sorted-deduplication] Each unique entity ID appears at most once in the feed
 * - [sorted-maintains-order] Items are always sorted by timestamp in descending order
 * - [sorted-date-separators] Date separators are correctly placed at day boundaries
 * - [sorted-respects-hidden] Hidden/archived items respect the feedQuery.hidden flag
 * - [sorted-excludes-empty] Empty discussions (no messages) are always excluded
 * - [sorted-dedup-by-type] Deduplication maintains separate sets for each ref_type
 * - [sorted-marks-seen-status] Items are marked as seen based on user's seen_at timestamp
 * - [sorted-adds-first-in-date] First item of each calendar day has isFirstInDate flag and separator
 * 
 * @param userId - The ID of the current user viewing the feed
 * @param feedQuery - Query parameters to filter items (contact_id, group_id, location_id, hidden flag)
 * @param feedItems - Array of raw feed items from the API
 * @returns Array of FeedItemPayload objects with deduplication and date separators
 */
export const toSortedFeedItems = (
  userId: T.SUUID,
  feedQuery: T.MainFeedQuery,
  feedItems: T.FeedItem[],
): FeedItemPayload[] => {

  // Guard against null or undefined feedItems
  if (!Array.isArray(feedItems)) {
    return [];
  }

  const sortedFeedItems = feedItems
    .filter(item => inQuery(userId, feedQuery, item))
    .sort(byCreatedAtDesc);

  // We don't want to show the same entity multiple times in the feed
  const shownEntities: Record<T.FeedItem["ref_type"], Set<string>> = {
    discussion: new Set<T.Discussion["id"]>(),
    contact_request: new Set<T.ContactRequest["id"]>(),
    invite_link: new Set<T.InviteLink["id"]>(),
    contact: new Set<T.Contact["id"]>(),
    group: new Set<T.Group["id"]>(),
    user: new Set<T.User["id"]>(),
  }
  const deduplicatedFeedItems: T.FeedItem[] = [];
  for (const item of sortedFeedItems) {
    if (!item || !item.ref || !item.ref_type || typeof item.ref !== 'object' || !('id' in item.ref)) {
      continue;
    }

    const refType = item.ref_type;
    const refId = item.ref.id;
    const seenIds: Set<T.FeedItem["ref"]["id"]> = shownEntities[refType];
    if (seenIds && seenIds.has(refId)) {
      continue;
    }

    shownEntities[refType].add(refId);
    deduplicatedFeedItems.push(item);
  }

  const xs: FeedItemPayload[] = deduplicatedFeedItems
    .map(item => itemToFeedItem(item, userId))
    .sort(byTsDesc);

  let previousDate: string | undefined = undefined;
  for (var i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (!previousDate || !isSameDay(previousDate, x.ts)) {
      const separator = dateSeparator(x.ts);
      x.isFirstInDate = true;
      x.separator = separator;
    }
    previousDate = x.ts;
  }

  return xs;
};

// 3. We put the separators in the feed

// Where should the separators be shown?
// One argument is to show only one of them, once everything below it is seen
// And only if there is something above it that is new
// If everything is seen, there is an argument to not have the seen separatoro
//
// Invariant: New separator is always above the seen separator

export const assert = (x: boolean) => {
  // throw exception if x is false
  if (!x) {
    throw new Error("Assertion failed");
  }
};

export const lastNewItemIndex = (xs: FeedItemPayload[]): number | undefined => {
  var lastNewIndex: number = undefined;

  for (var i: number = 0; i < xs.length; i++) {
    const x = xs[i];
    if (!x.isSeen) {
      lastNewIndex = i;
    }
  }

  return lastNewIndex;
};

/**
 * Adds NEW/SEEN separators to a sorted feed based on read status.
 * 
 * This function adds visual separators to help users quickly identify unread content.
 * It handles three distinct cases:
 * 1. No new items: Places a SEEN separator at the top
 * 2. All new items: Places a NEW separator at the top
 * 3. Mixed new/seen items: Places NEW separator at top and SEEN separator after the last new item
 * 
 * Invariants maintained:
 * - [full-new-above-seen] NEW separator always appears above SEEN separator when both are present
 * - [full-single-new-separator] At most one NEW separator exists in the feed
 * - [full-single-seen-separator] At most one SEEN separator exists in the feed
 * - [full-preserves-order] The order of items in the array is never modified
 * - [full-preserves-items] No feed items are lost or duplicated
 * - [full-preserves-properties] All existing item properties are preserved
 * - [full-valid-indices] Separators are only added at valid array indices (assertion enforced)
 * 
 * Implementation details:
 * - [full-mutates-array] Mutates the input array by adding separator properties
 * - Uses lastNewItemIndex to find the boundary between new and seen items
 * - Asserts that separator indices are within array bounds
 * 
 * @param xs - Array of sorted feed items with isSeen status
 * @returns Array of feed items with separator properties added (same array, mutated)
 */
// This needs to add the dates to the combo
export const toFullFeed = (xs: FeedItemPayload[]): FeedItemWithSeparator[] => {
  if (xs.length === 0) {
    return [];
  }

  const lastNewIndex = lastNewItemIndex(xs);

  const out = xs as FeedItemWithSeparator[];

  // We have the following cases
  // 1. No new items, firstFewIndex is undefined, lastNewIndex is undefined
  const noNewItems = lastNewIndex === undefined;
  if (noNewItems) {
    setSeparator(out, SEEN_SEPARATOR, 0);
    return out;
  }

  // 2. All items are new, lastNewIndex is the last index
  const lastIndex = xs.length - 1;
  const allNewItems = lastNewIndex === lastIndex;
  if (allNewItems) {
    setSeparator(out, NEW_SEPARATOR, 0);
    return out;
  }

  // 3. Two subcases
  //    - There is only one new item
  //    - Some new items, firstFewIndex is defined, lastNewIndex is defined
  setSeparator(out, NEW_SEPARATOR, 0);
  setSeparator(out, SEEN_SEPARATOR, lastNewIndex + 1);
  return out;
};

const setSeparator = (xs: FeedItemWithSeparator[], separator: FeedSeparator, i: number) => {
  assert(i < xs.length);
  const x = xs[i];
  xs[i] = { ...x, separator };
};
