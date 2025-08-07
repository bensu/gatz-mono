import * as T from "../types";

export enum LayoutCase {
  PostWithHighlightedReplies = "PostWithHighlightedReplies",
}

type MessageRow = {
  type: "message_row";
  message: T.OverlappedMessage;
};
type MentionRow = {
  type: "mention_row";
  mention: T.Mention;
  message: T.OverlappedMessage;
};
type MissingRepliesRow = {
  type: "missing_replies_row";
  missing_replies: number;
  users: Set<T.User["id"]>;
};

export type PreviewRow = MessageRow | MentionRow | MissingRepliesRow;

export type PreviewLayout = {
  post: T.OverlappedMessage;
  rows: PreviewRow[];
};

const CUTOFF = 5;

const MAX_BOTTOM_MESSAGES = 2;

export const getPreviewLayout = (
  messages: T.OverlappedMessage[],
  mentions: T.Mention[],
): PreviewLayout => {
  const mid_to_mention = new Map<T.Message["id"], T.Mention>();
  for (const mention of mentions) {
    mid_to_mention.set(mention.mid, mention);
  }
  if (messages.length === 1) {
    return {
      post: messages[0],
      rows: [],
    };
  } else if (messages.length > 1 && messages.length <= CUTOFF) {
    const [post, ...replies] = messages;
    const rows = replies.map((m): PreviewRow => {
      const mention = mid_to_mention.get(m.id);
      if (mention) {
        return { type: "mention_row", mention, message: m };
      } else {
        return { type: "message_row", message: m };
      }
    });
    return {
      post,
      rows,
    };
  } else {
    // if (mentions.length > 0) {
    // are the mentions the first or last messages?
    const mentionMids = mentions.map((mention) => mention.mid);
    const midsShown = new Set<T.Message["id"]>(
      messages.slice(-MAX_BOTTOM_MESSAGES).map((m) => m.id),
    );
    midsShown.add(messages[0].id); // check in the last messages
    // helpers
    const mid_to_mention = new Map<T.Message["id"], T.Mention>();
    for (const mention of mentions) {
      mid_to_mention.set(mention.mid, mention);
    }

    const newMissingRepliesRow = (): MissingRepliesRow => {
      return {
        type: "missing_replies_row",
        missing_replies: 0,
        users: new Set<T.User["id"]>(),
      };
    };

    // we ignore the post (first message) .slice(1,...)
    // we treat the last one specially    .slice(..., -1)
    const messages_to_check = messages.slice(1, -1);

    let rows: PreviewRow[] = [];
    let currentMissingReplies = newMissingRepliesRow();
    let lastMissingReply: T.Message | null = null;

    const resetMissingReplies = () => {
      currentMissingReplies = newMissingRepliesRow();
      lastMissingReply = null;
    };
    const addMissingReply = (m: T.Message) => {
      currentMissingReplies.missing_replies =
        currentMissingReplies.missing_replies + 1;
      currentMissingReplies.users.add(m.user_id);
      lastMissingReply = m;
    };
    const popMissingReplies = () => {
      if (currentMissingReplies.missing_replies > 0) {
        // there is only one? it should be a message row
        if (currentMissingReplies.missing_replies === 1) {
          rows.push({ type: "message_row", message: lastMissingReply });
        } else {
          rows.push(currentMissingReplies);
        }
        resetMissingReplies();
      }
    };

    for (const m of messages_to_check) {
      const mention = mid_to_mention.get(m.id);
      if (mention) {
        // We found a mention
        // clear the current missing replies that we've been accumulating
        popMissingReplies();
        rows.push({
          type: "mention_row",
          mention,
          message: m,
        });
      } else {
        addMissingReply(m);
      }
    }

    popMissingReplies();

    const m = messages[messages.length - 1];
    const mention = mid_to_mention.get(m.id);
    if (mention) {
      rows.push({
        type: "mention_row",
        mention,
        message: m,
      });
    } else {
      rows.push({
        type: "message_row",
        message: messages[messages.length - 1],
      });
    }
    return { post: messages[0], rows };
  }
};

export const getSearchPreviewLayout = (
  messages: T.OverlappedMessage[],
  searchText: string,
): PreviewLayout => {
  const [post, ...replies] = messages;
  const rows: PreviewRow[] = [];

  if (messages.length === 0) {
    return { post, rows: [] };
  }

  let currentMissingReplies: MissingRepliesRow = {
    type: "missing_replies_row",
    missing_replies: 0,
    users: new Set<T.User["id"]>(),
  };

  // For search results, we want to show all messages that contain the search text
  for (const message of replies) {
    const messageText = message.text.toLowerCase();
    if (messageText.includes(searchText.toLowerCase())) {
      // If we have accumulated missing replies, add them before this matching message
      if (currentMissingReplies.missing_replies > 0) {
        rows.push(currentMissingReplies);
        currentMissingReplies = {
          type: "missing_replies_row",
          missing_replies: 0,
          users: new Set<T.User["id"]>(),
        };
      }
      rows.push({ type: "message_row", message });
    } else {
      // This message doesn't match, count it as missing
      currentMissingReplies.missing_replies += 1;
      currentMissingReplies.users.add(message.user_id);
    }
  }

  // Add any remaining missing replies at the end
  if (currentMissingReplies.missing_replies > 0) {
    rows.push(currentMissingReplies);
  }

  return { post, rows, };
};
