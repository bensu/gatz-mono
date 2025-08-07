import React, { useMemo, useCallback, useContext, useState } from "react";
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  FlatList,
  LayoutChangeEvent,
} from "react-native";

import Animated, { BounceIn } from "react-native-reanimated";

import EmojiModal from "./EmojiModal";
import { HoverReactionButton } from "./HoverReactionButton";

import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import { ReactiveAvatarWithName } from "../gifted/GiftedAvatar";

import { SessionContext } from "../context/SessionProvider";
import { frequentEmojiStore } from "../gatz/store";

const ReactionButton = ({
  reaction,
  onReactionSelected,
  isSelected = false,
}: {
  reaction: string;
  onReactionSelected: (reaction: string) => void;
  isSelected?: boolean;
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      style={[
        styles.reactionButton,
        isSelected && styles.reactionButtonSelected,
        { backgroundColor: isSelected ? colors.reactionsBg : colors.appBackground, borderColor: isSelected ? colors.reactionsBg : colors.appBackground },
      ]}
      onPress={() => onReactionSelected(reaction)}
    >
      <Text style={[styles.reactionButtonText, { color: colors.primaryText }]}>
        {reaction}
      </Text>
    </TouchableOpacity>
  );
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

export const ReactionPicker = ({
  userId,
  onReactionSelected,
  onUndoReaction,
  message,
}: {
  userId: T.User["id"];
  onReactionSelected: (reaction: string) => void;
  onUndoReaction: (reaction: string) => void;
  message: T.Message;
}) => {
  const colors = useThemeColors();
  const userReactions = (message?.reactions || {})[userId] || {};
  const { incrementEmoji } = frequentEmojiStore();
  const onEmojiSelected = useCallback((emoji: string) => {
    incrementEmoji(emoji);
    onReactionSelected(emoji);
  }, [incrementEmoji, onReactionSelected]);
  return (
    <EmojiModal
      onEmojiSelected={onEmojiSelected}
      colors={colors}
      reactions={userReactions}
      onUndoReaction={onUndoReaction}
    />
  );
};


export const ReactionPickerOld = ({
  userId,
  message,
  onUndoReaction,
  onReactionSelected,
}: {
  userId: T.User["id"];
  onReactionSelected: (reaction: string) => void;
  message: T.Message;
  onUndoReaction: (reaction: string) => void;
}) => {
  const colors = useThemeColors();
  const userReactions = (message?.reactions || {})[userId] || {};
  return (
    <View style={[styles.reactionPickerOuterContainer, { backgroundColor: colors.appBackground }]}>
      {DEFAULT_REACTION_EMOJIS.map((reaction: string) => {
        const userHasReacted = userReactions[reaction];
        if (userHasReacted) {
          return (
            <ReactionButton
              key={reaction}
              reaction={reaction}
              isSelected
              onReactionSelected={onUndoReaction}
            />
          );
        } else {
          return (
            <ReactionButton
              key={reaction}
              reaction={reaction}
              onReactionSelected={onReactionSelected}
            />
          );
        }
      })}
    </View>
  );
};

export type RenderReaction = {
  reaction: string;
  created_at: string;
  user_id: string;
};

const byCreatedAt = (a: RenderReaction, b: RenderReaction) => {
  return a.created_at < b.created_at ? -1 : 1;
};

export const flattenReactions = (
  reactions: T.Message["reactions"] = {},
): RenderReaction[] => {
  return Object.keys(reactions)
    .reduce((acc: RenderReaction[], user_id: T.User["id"]) => {
      const userReactions: Record<string, T.SDate> = reactions[user_id];
      return acc.concat(
        Object.keys(userReactions).map((reaction) => ({
          reaction,
          created_at: userReactions[reaction],
          user_id,
        })),
      );
    }, [])
    .sort(byCreatedAt);
};

export const SPECIAL_REACTION_THRESHOLD = 3;
// Must be kept in sync with gatz.notify
const SPECIAL_REACTIONS = new Set(["❗", "❓"]);

export const countSpecialReactions = (
  userId: T.User["id"],
  reactions: RenderReaction[],
): number => {
  return reactions
    .filter((r) => SPECIAL_REACTIONS.has(r.reaction))
    .filter((r) => r.user_id !== userId).length;
};

const reactionsByUser = (
  reactions: T.Message["reactions"] = {},
): Record<T.User["id"], RenderReaction[]> => {
  return Object.keys(reactions).reduce(
    (acc: Record<T.User["id"], RenderReaction[]>, user_id: T.User["id"]) => {
      const userReactions: Record<string, T.SDate> = reactions[user_id];
      acc[user_id] = Object.keys(userReactions).map((reaction) => ({
        reaction,
        created_at: userReactions[reaction],
        user_id,
      }));
      return acc;
    },
    {},
  );
};

export const HangingReactions = ({
  reactions,
  outerStyle,
  onDisplayReactions,
  inDiscussionPreview = false,
  isHover: externalIsHover = false,
  onReactji,
}: {
  reactions: T.Message["reactions"];
  outerStyle?: any;
  onDisplayReactions?: () => void;
  inDiscussionPreview?: boolean;
  isHover?: boolean;
  onReactji?: () => void;
}) => {
  const colors = useThemeColors();
  const { session: { userId } } = useContext(SessionContext);
  const flatReactions = useMemo(() => flattenReactions(reactions), [reactions]);
  const [prevReactions, _setPrevReactions] = useState<Set<string>>(
    new Set(flatReactions.map(r => `${r.user_id}-${r.reaction}-${r.created_at}`))
  );
  
  // Add local hover state management for web
  const [localIsHover, setLocalIsHover] = useState(false);
  const isHover = Platform.OS === 'web' ? (localIsHover || externalIsHover) : false;

  const myReactions = flatReactions.filter((r) => r.user_id === userId);
  const otherReactions = flatReactions.filter((r) => r.user_id !== userId);

  const reactionRow = useCallback((reactions: RenderReaction[]) => {
    const n = reactions.length;
    return (
      <Animated.View style={{ flexDirection: "row" }}>
        {
          reactions.map((reaction: RenderReaction, index: number) => {
            const key = `${reaction.user_id}-${reaction.reaction}-${reaction.created_at}`;
            const isNewReaction = !prevReactions.has(key);
            const isLast = index === n - 1;
            return (
              <Animated.View
                key={key}
                entering={isNewReaction ? BounceIn.duration(100).springify() : undefined}
                style={[
                  styles.hangingReaction,
                  isLast && { marginRight: 2 },
                ]}
              >
                <Text style={[styles.hangingText, { color: colors.primaryText }]}>
                  {reaction.reaction}
                </Text>
              </Animated.View>
            );
          })
        }
      </Animated.View>
    );
  }, [colors.primaryText]);

  const renderInner = useCallback(() => {
    return (
      <View 
        style={{ flexDirection: "row", zIndex: 100, overflow: 'visible', alignItems: 'center' }}
      >
        {Platform.OS === 'web' && onReactji && (
          <HoverReactionButton onPress={onReactji} visible={isHover} />
        )}
        {otherReactions.length > 0 && (
          <View
            style={[
              styles.hangingBarInnerContainer,
              {
                backgroundColor: colors.appBackground,
                borderColor: colors.rowBackground,
                overflow: 'visible',
              },
            ]} >
            {reactionRow(otherReactions)}
          </View >
        )}
        {myReactions.length > 0 && (
          <View
            style={[
              styles.hangingBarInnerContainer,
              {
                backgroundColor: colors.appBackground,
                borderColor: colors.reactionsBg,
                borderWidth: Platform.select({ web: 2, default: 1 }),
                overflow: 'visible',
              },
            ]}>
            {reactionRow(myReactions)}
          </View>
        )}
      </View>
    )
  }, [flatReactions, prevReactions, colors, reactionRow, myReactions, otherReactions, isHover, onReactji]);

  const handleMouseEnter = useCallback(() => {
    if (Platform.OS === 'web') {
      setLocalIsHover(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      setLocalIsHover(false);
    }
  }, []);

  if (flatReactions.length === 0) {
    return null;
  } else if (onDisplayReactions) {
    return (
      <TouchableOpacity
        onPress={onDisplayReactions}
        style={[styles.hangingBarOuterContainer, { padding: 6 }, outerStyle]}
        // @ts-ignore - Web-specific props
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderInner()}
      </TouchableOpacity >
    );
  } else {
    const content = renderInner();
    
    if (Platform.OS === 'web') {
      return (
        <View 
          style={[styles.hangingBarOuterContainer, outerStyle]}
          // @ts-ignore - Web-specific props
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </View>
      );
    }
    
    return (
      <View style={[styles.hangingBarOuterContainer, outerStyle]}>
        {content}
      </View>
    );
  }
};

const UserReactionsRow = ({ onUndoReaction, userId, reactions, colors }: {
  onUndoReaction?: (reaction: string) => void;
  userId: string;
  reactions: RenderReaction[];
  colors: any;
}) => {
  const [contentWidth, setContentWidth] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  const renderReaction = useCallback(({ item: { reaction } }: { item: { reaction: string } }) => {
    if (onUndoReaction) {
      return (
        <TouchableOpacity
          key={reaction}
          onPress={() => onUndoReaction(reaction)}
          style={[
            styles.undoReactionTouchable,
            { backgroundColor: colors.reactionsBg }
          ]}
        >
          <Text
            key={reaction}
            style={[
              styles.inlineReactionText,
              { color: colors.primaryText }]
            }
          >
            {reaction}
          </Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <Text
          key={reaction}
          style={[
            styles.inlineReactionText,
            { marginRight: 2, padding: 4 },
            { color: colors.primaryText }
          ]}
        >
          {reaction}
        </Text>
      );

    }
  }, [onUndoReaction, colors.reactionsBg, colors.primaryText]);

  if (!reactions || reactions.length === 0) {
    return null;
  }
  return (
    <View style={[styles.userReactionsOuter, { borderTopColor: colors.midGrey }]} key={userId}>
      <View style={{ marginRight: 8 }}>
        <ReactiveAvatarWithName size="medium" userId={userId} />
      </View>
      <View
        style={styles.inlineReactions}
        onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <FlatList<RenderReaction>
          horizontal
          style={[
            { flex: 1 },
            // we want to have the reactions be placed towards the right
            // but when we do that we ruin the scrollview for some reason
            // So, when we have a few reactions, we place it towards the right
            // and ruin the scrollview but it doesn't matter because there is nothing to scoll to
            reactions.length < 6 && { flexDirection: "row-reverse" }
          ]}
          contentContainerStyle={styles.userReactionsFlatListContainer}
          scrollEnabled={contentWidth > containerWidth}
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={setContentWidth}
          data={reactions}
          renderItem={renderReaction}
        />
      </View>
    </View>
  );
}


export const DisplayMessageReactions = ({
  message,
  onUndoReaction,
}: {
  message: T.Message;
  onUndoReaction: (reaction: string) => void;
}) => {
  const colors = useThemeColors();
  const { session: { userId } } = useContext(SessionContext);

  const byUser = reactionsByUser(message.reactions);
  const sortedUsers = Object.keys(byUser)
    .sort()
    .filter((u) => u !== userId);

  const userReactions = byUser[userId];
  return (
    <View style={[{ flex: 1, backgroundColor: colors.appBackground }]}>
      <UserReactionsRow
        onUndoReaction={onUndoReaction} userId={userId}
        reactions={userReactions} colors={colors}
      />
      {
        sortedUsers.map((user_id) => {
          const reactions = byUser[user_id];
          return (
            <UserReactionsRow
              key={user_id} userId={user_id}
              reactions={reactions} colors={colors}
            />
          )
        })
      }
    </View >
  );
};

const styles = StyleSheet.create({
  userReactionsFlatListContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  hangingBarOuterContainer: {
    position: "absolute",
    bottom: -20,
    right: 2,
    zIndex: 100,
    overflow: 'visible',
    // padding: 6,
  },
  hangingBarInnerContainer: {
    display: "flex",
    flexDirection: "row",
    borderWidth: 2,
    borderRadius: 4,
    paddingVertical: 3,
    zIndex: 100,
    overflow: 'visible',
  },
  userReactionsOuter: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  inlineReactions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  inlineReactionText: { fontSize: 32 },
  explainer: { fontSize: 12 },
  hangingText: {
    zIndex: 100,
    fontSize: 14,
  },
  hangingReaction: {
    marginLeft: 2,
    paddingHorizontal: 2,
    zIndex: 100,
    width: 20,
  },
  reactionPickerOuterContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
    columnGap: 2,
  },
  reactionButtonText: { marginHorizontal: 8, fontSize: 28 },
  reactionButton: { marginBottom: 8 },
  reactionButtonSelected: {
    borderRadius: 4,
    borderWidth: 1,
  },
  undoReactionTouchable: {
    marginRight: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

});