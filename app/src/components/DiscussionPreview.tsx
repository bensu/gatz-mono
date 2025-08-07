import React, { memo, useCallback, useMemo, useContext, useEffect, useState, } from "react";
import { StyleSheet, View, Text } from "react-native";

import { Post } from "../gifted/Post";

import { PreviewRow, getPreviewLayout, getSearchPreviewLayout } from "../gatz/ui/post_preview";
import * as T from "../gatz/types";
import { Styles as GatzStyles } from "../gatz/styles";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { crdtIsEqual } from "../util";
import { SessionContext } from "../context/SessionProvider";
import { ClientContext } from "../context/ClientProvider";
import { assertNever, byCreatedAtDesc } from "../util";
import Message from "../gifted/Message";
import { Participants } from "./Participants";
import { DiscussionContextProvider } from "../context/DiscussionContext";
import TouchableOpacityItem from "./TouchableOpacityItem";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { HangingReactions } from "./reactions";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { ActionPillContext } from "../context/ActionPillProvider";

export const LONG_PRESS_DURATION = 500;

const MissingReplies = (
  { missingReplies, users, isLast }: { missingReplies: number, users: T.Contact[], isLast: boolean }
) => {
  const colors = useThemeColors();
  return (
    <View style={[layoutStyles.andMoreMessagesContainer, { backgroundColor: colors.appBackground }]}>
      <View
        style={[
          isLast ? styles.topThreadLine : styles.threadLine,
          { backgroundColor: colors.disabledText }
        ]}
      />
      <View style={{ zIndex: 3 }}>
        <Participants size="tiny" users={users} maxParticipants={10} />
      </View>
      <Text style={[layoutStyles.andMoreText, { color: colors.greyText }]}>
        commented
      </Text>
    </View>
  );
};

const RowPreview = ({
  row,
  onPressAvatar,
  isLast,
  searchText,
}: {
  row: PreviewRow;
  onPressAvatar: (userId: T.Contact["id"]) => void;
  isLast: boolean,
  searchText?: string,
}) => {
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();
  const rowType = row.type;
  const author = useMemo(() => {
    if (rowType === "message_row" || rowType === "mention_row") {
      return db.maybeGetUserById(row.message.user_id);
    } else {
      return null;
    }
  }, [db, row]);

  switch (rowType) {
    case "missing_replies_row": {
      const uids = Array.from(row.users);
      const users = uids.map((uid) => db.getUserById(uid));
      return (
        <MissingReplies isLast={isLast} missingReplies={row.missing_replies} users={users} />
      );
    }
    case "message_row": {
      const m = row.message;
      return (
        <Message
          db={db}
          inPost
          key={m.id}
          onPressAvatar={onPressAvatar}
          currentMessage={m}
          previousMessage={m.previousMessage}
          nextMessage={m.nextMessage}
          shouldRenderDay={false}
          bubble={{ colors, searchText, withMargin: false, showFull: false }}
          colors={colors}
          author={author}
        />
      );
    }
    case "mention_row": {
      const m = row.message;
      return (
        <Message
          db={db}
          inPost
          key={m.id}
          onPressAvatar={onPressAvatar}
          currentMessage={m}
          previousMessage={m.previousMessage}
          nextMessage={m.nextMessage}
          shouldRenderDay={false}
          bubble={{ colors, searchText, withMargin: false, showFull: false }}
          colors={colors}
          author={author}
        />
      );
    }
    default: {
      assertNever(rowType);
    }
  }
};

const layoutStyles = StyleSheet.create({
  andMoreMessagesContainer: {
    position: "relative",
    display: "flex",
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    marginLeft: 6,
  },
  andMoreText: {
    justifyContent: "center",
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 4,
  },
});

// Use the OverlappedMessage type from gatz/types.ts

const InnerMessages = ({
  discussion,
  messages,
  isActive,
  onPressAvatar,
  mentions,
  searchText,
}: {
  discussion: T.Discussion;
  messages: T.OverlappedMessage[];
  isActive: boolean;
  onPressAvatar: (userId: T.Contact["id"]) => void;
  mentions: T.Mention[];
  searchText: string;
}) => {
  const { db } = useContext(FrontendDBContext);

  const layout = searchText ? getSearchPreviewLayout(messages, searchText) : getPreviewLayout(messages, mentions || []);
  const colors = useThemeColors();

  const reactions = layout.post?.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;
  const isLonePost = layout.rows.length === 0;
  const totalRows = layout.rows.length;

  const users = useMemo(() => discussion.members.map((uid) => db.getUserById(uid)), [db, discussion.members]);

  return (
    <View style={[styles.container, { backgroundColor: colors.appBackground }]}>
      <Post
        onPressAvatar={onPressAvatar}
        currentMessage={layout.post}
        isActive={isActive}
        users={users}
        discussion={discussion}
        searchText={searchText}
      />
      {layout.rows.map((row, i: number) => {
        const isLast = i === totalRows - 1;
        if (hasReactions && !isLonePost && i === 0) {
          return (
            <View
              key={i}
              style={{ position: "relative", paddingTop: hasReactions ? 6 : 0 }}
            >
              <HangingReactions
                inDiscussionPreview
                reactions={reactions}
                outerStyle={{ top: -10, zIndex: 100 }}
              />
              <RowPreview searchText={searchText} isLast={isLast} key={i} row={row} onPressAvatar={onPressAvatar} />
            </View>
          );
        } else {
          return <RowPreview searchText={searchText} isLast={isLast} key={i} row={row} onPressAvatar={onPressAvatar} />;
        }
      })}
      {hasReactions && isLonePost && (
        <HangingReactions
          outerStyle={{ bottom: -22 }}
          reactions={reactions}
          inDiscussionPreview
        />
      )}
    </View>
  );
};

enum LongPressAction {
  ShowPost,
  HidePost,
  HidePostsFromUser,
  ShowPostsFromUser,
  Cancel,
}

const SELF = {
  options: ["Hide post", "Cancel"],
  actions: [LongPressAction.HidePost, LongPressAction.Cancel],
  cancelButtonIndex: 1,
}

const OTHER = {
  options: ["Hide post", "Hide posts from this user", "Cancel"],
  actions: [LongPressAction.HidePost, LongPressAction.HidePostsFromUser, LongPressAction.Cancel],
  cancelButtonIndex: 2,
}

const HIDDEN_SELF = {
  options: ["Show post", "Cancel"],
  actions: [LongPressAction.ShowPost, LongPressAction.Cancel],
  cancelButtonIndex: 1,
}

const HIDDEN_OTHER = {
  options: ["Show post", "Show posts from this user", "Cancel"],
  actions: [LongPressAction.ShowPost, LongPressAction.ShowPostsFromUser, LongPressAction.Cancel],
  cancelButtonIndex: 2,
}

const buttonIndexLookup = (actions: LongPressAction[], index: number): LongPressAction => {
  if (index < 0 || index >= actions.length) {
    throw new Error("Invalid button index");
  }
  return actions[index];
}

// Component
type OuterProps = {
  did: T.Discussion["id"];
  onPressAvatar: (userId: T.Contact["id"]) => void;
  onSelect: (discussionId: T.Discussion["id"]) => void;
  inSearch: boolean;
  searchText?: string;
  isSeen: boolean;
};

type InnerProps = OuterProps & {
  discussion: T.Discussion;
  messages: T.Message[] | undefined;
}

const propsAreEqual = (prev: OuterProps, next: OuterProps): boolean => {
  // - We are assuming that if the messages have changed,
  //   the Discussion's clock have changed as well.
  // - We are purposefully not checking the users

  return (
    prev.did === next.did &&
    prev.onSelect === next.onSelect &&
    prev.searchText === next.searchText
  );
};

const DiscussionPreviewInner = (props: InnerProps) => {
  const { discussion, messages, inSearch, searchText } = props;
  const { onSelect, onPressAvatar } = props;

  const { session: { userId }, } = useContext(SessionContext);
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();
  const { showActionSheetWithOptions } = useActionSheet();

  const did = discussion.id;

  // TODO: this is marking discussions as seen if they if haven't been scrolled all the way
  const isSeen = useMemo(() => {
    return discussion.seen_at && discussion.seen_at[userId] ? true : false;
  }, [discussion.seen_at, userId]);
  const isActive = !isSeen;

  // TODO: this is marking discussions as seen if they if haven't been scrolled all the way
  // Rendering something is not the same as having seen it.
  useEffect(() => {
    if (isActive && !inSearch) {
      gatzClient.queueMarkSeen(discussion.id);
    }
  }, [isActive]);

  const handleOnPress = useMemo(() => {
    return () => onSelect(did);
  }, [onSelect, did]);

  const overlappedMessages: T.OverlappedMessage[] = useMemo(() => {
    // Create a copy of the array first to avoid modifying the original array
    const messagesToSort = [...(messages || [])];
    const sortedMessages = messagesToSort.sort(byCreatedAtDesc);

    return sortedMessages.map((im, index) => {
      const previousMessage = index !== 0 ? sortedMessages[index - 1] : null;
      const nextMessage =
        index !== sortedMessages.length - 1 ? sortedMessages[index + 1] : null;
      // Use type assertion to satisfy TypeScript
      return {
        ...im,
        nextMessage,
        previousMessage
      } as T.OverlappedMessage;
    });
  }, [messages]);

  const mentions = discussion.mentions && discussion.mentions[userId]
  const hasMentions = Boolean(mentions && mentions.length > 0);
  const renderMentionedBy = () => {
    const uidSet = new Set(mentions.map((m) => m.by_uid));
    const users = Array.from(uidSet)
      .map((uid) => db.maybeGetUserById(uid))
      .filter(Boolean) as T.Contact[];
    if (users.length === 0) {
      return (
        <View style={styles.mentionContainer}>
          <Text style={[styles.mentionText, { color: colors.secondaryText }]}>
            You were mentioned in this chat
          </Text>
        </View>
      );
    } else if (users.length === 1) {
      const user = users[0];
      const mention = mentions[0];
      const mentionInPost = mention.mid === discussion.first_message;
      return (
        <View style={styles.mentionContainer}>
          <Text style={[styles.mentionText, { color: colors.secondaryText }]}>
            <Text style={[styles.username, { color: colors.primaryText }]}>
              {`@${user.name}`}
            </Text>{" "}
            {mentionInPost ? "mentioned you in their post" : "mentioned you in a comment"}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.mentionContainer}>
          <Text style={[styles.mentionText, { color: colors.secondaryText }]}>
            <Text style={[styles.username, { color: colors.primaryText }]}>
              {users.map((u) => `@${u.name}`).join(", ")}
            </Text>{" "}
            mentioned you in this chat
          </Text>
        </View>
      );
    }
  };

  const { appendAction } = useContext(ActionPillContext);

  // TODO: this works well for discussions, I should do that
  const onUndoHide = useCallback(async (withPill = true) => {
    const r = await gatzClient.unhideDiscussion(did);
    db.addDiscussion(r.discussion);
    if (withPill) {
      appendAction({
        id: "undo-hide-discussion/" + did,
        onPress: () => onHideDiscussion(false),
        description: "Post shown",
        actionLabel: "Undo",
      });
    }
  }, [did, gatzClient, db, appendAction]);

  const onHideDiscussion = useCallback(async (withPill = true) => {
    const r = await gatzClient.hideDiscussion(did);
    db.addDiscussion(r.discussion);
    if (withPill) {
      appendAction({
        id: "undo-hide-discussion/" + did,
        onPress: () => onUndoHide(false),
        description: "Post hidden",
        actionLabel: "Undo",
      });
    }
  }, [did, gatzClient, db, onUndoHide]);

  const onUndoHideContact = useCallback(async (withPill = true) => {
    const r = await gatzClient.unhideContact(discussion.created_by);
    onUndoHide(false);
    if (withPill) {
      appendAction({
        id: "undo-hide-contact/" + discussion.created_by,
        onPress: () => onHideContact(false),
        description: "Users posts shown",
        actionLabel: "Undo",
      });
    }
  }, [discussion.created_by, gatzClient, onUndoHide]);

  const onHideContact = useCallback(async (withPill = true) => {
    const r = await gatzClient.hideContact(discussion.created_by);
    onHideDiscussion(false);
    // TODO: also hide the discussion!
    // db.addContact(r.contact);
    if (withPill) {
      appendAction({
        id: "undo-hide-contact/" + discussion.created_by,
        onPress: () => onUndoHideContact(false),
        description: "Users posts hidden",
        actionLabel: "Undo",
      });
    }
  }, [discussion.created_by, gatzClient, onUndoHideContact]);

  const isSelf = discussion.created_by === userId;
  const isHidden = discussion.archived_uids.includes(userId);

  const handleOnLongPress = useCallback(() => {
    const { options, actions, cancelButtonIndex } = isHidden
      ? isSelf
        ? HIDDEN_SELF
        : HIDDEN_OTHER
      : isSelf
        ? SELF
        : OTHER;
    showActionSheetWithOptions({
      options,
      cancelButtonIndex
    }, (buttonIndex: number) => {
      const action = buttonIndexLookup(actions, buttonIndex);
      switch (action) {
        case LongPressAction.HidePost:
          onHideDiscussion();
          break;
        case LongPressAction.HidePostsFromUser:
          onHideContact();
          break;
        case LongPressAction.Cancel:
          break;
        case LongPressAction.ShowPost:
          onUndoHide();
          break;
        case LongPressAction.ShowPostsFromUser:
          onUndoHideContact();
          break;
        default:
          assertNever(action);
          break;
      }
    });
  }, [showActionSheetWithOptions, isSelf, isHidden, onHideDiscussion, onHideContact, onUndoHide, onUndoHideContact]);

  return (
    <DiscussionContextProvider discussion={discussion} userId={userId}>
      <View style={[styles.outerContainer, isHidden && styles.hiddenCard]}>
        <TouchableOpacityItem
          onPress={handleOnPress}
        // onLongPress={handleOnLongPress}
        // delayLongPress={LONG_PRESS_DURATION}
        >
          {hasMentions && renderMentionedBy()}
          <View
            style={[
              GatzStyles.card,
              GatzStyles.thinDropShadow,
              isActive && styles.activeCard,
              { backgroundColor: colors.appBackground },
            ]}
          >
            <View style={styles.row}>
              <InnerMessages
                searchText={searchText}
                isActive={isActive}
                messages={overlappedMessages}
                discussion={discussion}
                onPressAvatar={onPressAvatar}
                mentions={mentions}
              />
            </View>
          </View>
        </TouchableOpacityItem>
      </View>
    </DiscussionContextProvider>
  );
};

const DiscussionPreviewWithListener = (props: OuterProps) => {
  const { db } = useContext(FrontendDBContext);
  const { did } = props;

  const [dr, setDR] = useState<T.DiscussionResponse | undefined>(db.getDRById(did));
  useEffect(() => {
    const lid = db.listenToDR(did, setDR);
    return () => db.removeDRListener(did, lid);
  }, [db, did]);

  // If dr is undefined, fall back to the props provided discussion and messages
  if (!dr) {
    return null;
  }

  return <DiscussionPreviewInner {...props} discussion={dr.discussion} messages={dr.messages} />
}

export const DiscussionPreview = memo(DiscussionPreviewWithListener, propsAreEqual);

const styles = StyleSheet.create({
  activeCard: { ...GatzStyles.activeDropShadow },
  hiddenCard: { opacity: 0.65 },
  outerContainer: {
    position: "relative",
    flex: 1,
    marginTop: 0,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  container: {
    position: "relative",
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  row: { flex: 1 },
  threadLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 9,
    width: 2,
    zIndex: 2,
  },
  topThreadLine: {
    position: "absolute",
    top: 0,
    bottom: 10, // hides the bottom of the post
    left: 9,
    width: 2,
    zIndex: 2,
    marginBottom: 16,
  },
  username: { fontWeight: "600" },
  mentionText: {},
  mentionContainer: { marginBottom: 8, marginLeft: 6 },
});
