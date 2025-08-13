import PropTypes from "prop-types";
import React, { useContext, useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
  Platform,
  ViewStyle,
  GestureResponderEvent,
  StyleProp,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinkPreview } from "../../vendor/react-native-link-preview/LinkPreview"

import {
  TouchableOpacity,
  GestureDetector,
  Gesture,
  GestureStateChangeEvent,
  LongPressGestureHandlerEventPayload,
  PanGestureHandlerEventPayload,
  GestureUpdateEvent,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
  WithSpringConfig,
  FadeOutDown,
  FadeInUp,
  useDerivedValue,
  useAnimatedProps,
} from "react-native-reanimated";

import * as T from "../../gatz/types";
import { Color as GatzColor, Styles as GatzStyles } from "../../gatz/styles";
import { messageSuggestionStore } from "../../gatz/store";

import { crdtIsEqual, getUserId, isMobile, shouldShowLastSeen } from "../../util";

import { WrappedAvatar } from "../GiftedAvatar";
import Bubble, {
  BubbleActionProps,
  BubbleAnimationProps,
  BubbleConfigProps,
  LONG_PRESS_DURATION,
} from "../Bubble";
import { SystemMessage } from "../SystemMessage";
import { Day } from "../Day";
import { styles as MessageImageStyles, MessageMedia } from "../MessageImage";
import {
  MENU_GAP,
  MAX_BUBBLE_HEIGHT,
  calculateMinBubbleTop,
  holdMenuStyles,
  TEXT_CONTAINER_HEIGHT
} from "../FloatingMenu";
import { isSameUser } from "../utils";
import { TEST_ID } from "../Constant";

import {
  parseInviteIds,
  parseContactIds,
  parseGroupIds,
  InviteCard,
  ContactCard,
  GroupCard,
} from "../../components/InviteCard";
import { ReplyToPreview as ReplyToPreviewComponent } from "../../components/ReplyToPreview";
import {
  flattenReactions,
  countSpecialReactions,
  SPECIAL_REACTION_THRESHOLD,
  HangingReactions,
} from "../../components/reactions";
import { SuggestPosting } from "../../components/suggestions";

import { MenuItems, MenuItemProps } from "../MenuItems";
import { QuickReactions } from "../QuickEmojiReactions";
import { PortalContext, MENU_ANIMATION_DURATION } from "../../context/PortalProvider";
import { SessionContext } from "../../context/SessionProvider";
import { GiftedChatContext } from "../GiftedChatContext";
import { IGiftedChatContext } from "../GiftedChatContext";
import { useContinuedDiscussion, ContinuedToPost, ENTER_ANIMATION_MS } from "../Continued";
import { FrontendDB } from "../../context/FrontendDB";
import { HoverMenu } from "../HoverMenu";
import { areMessageStatusesEqual } from "../../components/MessageStatus";

// Define spacing constants for message layout
const MESSAGE_SPACING = {
  // Base spacing for all messages
  BASE: Platform.select({ web: 4, default: 2, }),
  // Additional spacing when messages are from different users
  DIFFERENT_USER: Platform.select({ web: 6, default: 4, }),
  // Additional spacing when message has media to clearly show ownership
  // MEDIA: Platform.select({ web: 4, default: 2, }),
  // Spacing needed for absolutely positioned reactions/edits
  REACTIONS: Platform.select({ web: 12, default: 2, }),
  // Spacing needed for absolutely positioned edits when there are no reactions
  // EDITS: Platform.select({ web: 14, default: 6, }),
  MEDIA: Platform.select({ web: 4, default: 2, }),
};

/**
 * Calculate appropriate bottom margin based on message context with additive logic
 * 
 * This handles several cases:
 * 1. Base spacing between all messages (minimal for same user)
 * 2. Additional spacing between different users' messages
 * 3. Additional spacing for messages with media
 * 4. Extra spacing for messages with reactions or edits (which are absolutely positioned)
 * 
 * @param currentMessage - The current message being rendered
 * @param nextMessage - The next message in the chat
 * @returns The calculated bottom margin in pixels
 */
const calculateMessageBottomMargin = (
  currentMessage: T.Message,
  nextMessage?: T.Message
) => {
  const { hasReactions, hasEdits, hasMedia } = usefulMessageProps(currentMessage);
  const sameUserCheck = nextMessage ? isSameUser(currentMessage, nextMessage) : false;

  let margin = MESSAGE_SPACING.BASE;

  // Add spacing between different users' messages
  if (!sameUserCheck) {
    margin += MESSAGE_SPACING.DIFFERENT_USER;
  }

  if (hasMedia) {
    margin += MESSAGE_SPACING.MEDIA;
    if (Platform.OS !== 'web' && hasReactions) {
      margin += MESSAGE_SPACING.REACTIONS;
    }
  }

  // Add spacing for reactions or edits (which are absolutely positioned)
  // We only need to add this space once, even if both are present
  if (hasReactions) {
    margin += MESSAGE_SPACING.REACTIONS;
    if (Platform.OS === 'web' && hasEdits) {
      margin -= 8;
    }
  }
  return margin;
};


type ReactionsProps = {
  onDisplayReactions?: () => void;
  reactions: T.Message["reactions"];
  outerStyle: StyleProp<ViewStyle>;
  isHover?: boolean;
  onReactji?: () => void;
}

const hangingStyles = StyleSheet.create({
  outerContainer: {
    flexDirection: "row",
    flexGrow: 0,
    alignSelf: 'flex-start',
    width: '100%', // Allow it to take full width
    overflow: 'visible' // Important for overflow to work
  },
  contentContainer: {
    flexDirection: "row",
    paddingLeft: 0, // Start aligned with the bubble
    paddingRight: 80, // Add extra space at the end to ensure content is scrollable
    overflow: 'visible',
    // paddingBottom: 14,
  },
  editedContainer: {
    position: 'absolute',
    bottom: 0,
  }
})

/**
 * Component for rendering reactions and edited indicators below media or as standalone elements.
 * 
 * This component handles the complex layout logic for positioning reactions and edited
 * indicators, adapting to whether the message contains media or just text.
 * 
 * Key functionality and invariants:
 * - [media-aware-positioning] Positions reactions based on media width when media is present
 * - [absolute-positioning] Uses absolute positioning for reactions to overlay on content
 * - [responsive-width] Calculates reaction position based on screen width and emoji count
 * - [conditional-rendering] Only renders when message has reactions, edits, or media
 * - [overflow-handling] Ensures reactions can overflow parent containers for proper display
 * 
 * When media is present:
 * - Calculates horizontal offset based on number of images and their widths
 * - Positions reactions at the bottom-right of the media grid
 * - Adjusts for screen width constraints on mobile devices
 * 
 * When no media but reactions/edits exist:
 * - Positions reactions as floating elements to the right
 * - Adds edited indicator at the bottom when edits are present
 * 
 * This pattern provides:
 * - Consistent reaction positioning across different message types
 * - Proper spacing that accounts for emoji width and count
 * - Responsive behavior that adapts to screen size
 * - Clean separation between media and reaction rendering logic
 * 
 * @param message - The message containing reactions and media data
 * @param reactionsProps - Optional props for reaction display and interaction
 * @param colors - Theme colors for styling
 * @param scrollViewRef - Reference to parent ScrollView for gesture handling
 * @returns JSX element with positioned reactions and/or edited indicator
 */
export const HangingMediaReactionsAndEdited = (
  { message, reactionsProps, colors, scrollViewRef }:
    {
      message: T.Message,
      reactionsProps?: ReactionsProps,
      colors: any, scrollViewRef?: React.RefObject<ScrollView>,
    }) => {
  // const hasMedia = message && message.media && message.media.length > 0;
  // const hasReactions = reactionsProps && reactionsProps.reactions && Object.keys(reactionsProps.reactions).length > 0;
  const { hasReactions, flatReactions, hasMedia, hasEdits } = usefulMessageProps(message);
  // [conditional-rendering] [media-aware-positioning]
  if (hasMedia) {
    const nImages = message.media.length;
    const imageWidth = MessageImageStyles.mediaContainer.width + MessageImageStyles.mediaContainer.marginRight;
    const emojiWidth = 20;
    const nReactions = flatReactions.length;
    const emojiCorrection = (nReactions * emojiWidth)
    const fromImages = nImages * imageWidth - emojiCorrection - 22;
    const screenWidth = isMobile() ? SCREEN_WIDTH : 850;
    const maxReactionsWidth = screenWidth - emojiCorrection - 60;
    // [responsive-width]
    const left = Math.min(maxReactionsWidth, fromImages);
    return (
      <View style={{ position: 'relative' }} testID={TEST_ID.MEDIA_REACTIONS}>
        <MessageMedia
          scrollViewRef={scrollViewRef}
          allMedia={message.media}
          contentContainerStyle={!reactionsProps && { paddingBottom: 0 }}
        />
        {reactionsProps && (
          <HangingReactions
            reactions={reactionsProps.reactions}
            onDisplayReactions={reactionsProps.onDisplayReactions}
            outerStyle={[{
              // [overflow-handling]
              overflow: 'visible',
              // [absolute-positioning]
              position: 'absolute',
              left: left,
              bottom: -20
            }]}
            isHover={reactionsProps.isHover}
            onReactji={reactionsProps.onReactji}
          />
        )}
        {reactionsProps && (
          <View style={hangingStyles.editedContainer}>
            <Edited currentMessage={message} colors={colors} />
          </View>
        )}
      </View>
    );
  // [conditional-rendering]
  } else if (hasReactions || hasEdits) {
    return (
      <View style={hangingStyles.outerContainer}>
        <View style={[hangingStyles.contentContainer, hasEdits && { paddingBottom: 14 }]}>
          {reactionsProps ? (
            <HangingReactions
              reactions={reactionsProps.reactions}
              onDisplayReactions={reactionsProps.onDisplayReactions}
              outerStyle={[{
                // [overflow-handling]
                overflow: 'visible',
                // [absolute-positioning]
                position: 'absolute',
                right: 80 + 4,
                // bottom: 0,
                bottom: -6
              }]}
              isHover={reactionsProps.isHover}
              onReactji={reactionsProps.onReactji}
            />
          ) : <View />
          }
          <View style={[
            hangingStyles.editedContainer,
            {
              bottom: hasReactions
                ? Platform.select({ web: 2, android: 2, ios: 2 })
                : Platform.select({ web: 2, android: 4, ios: 4 })
            },
          ]}>
            <Edited currentMessage={message} colors={colors} />
          </View>
        </View>
      </View>
    );
  }
};

/**
 * Type alias for bubble configuration props.
 * 
 * This type provides a semantic alias for BubbleConfigProps to clarify usage
 * in the Message component context.
 * 
 * Key functionality and invariants:
 * - [type-alias] Direct type alias with no modifications
 * - [bubble-configuration] Used to pass bubble styling and behavior props
 * - [component-composition] Enables bubble customization through props
 * 
 * @see BubbleConfigProps for the underlying type definition
 */
export type PropsForBubble = BubbleConfigProps;

/**
 * Interface for message action callbacks.
 * 
 * Defines all possible actions that can be performed on a message,
 * providing a consistent API for message interaction throughout the app.
 * 
 * Key functionality and invariants:
 * - [optional-callbacks] All actions are optional to support different contexts
 * - [id-based-actions] Most actions use message ID for identification
 * - [reaction-handling] Separate handlers for quick reactions vs reaction picker
 * - [moderation-support] Includes flagging functionality for content moderation
 * 
 * Action categories:
 * - Message manipulation: edit, delete
 * - Interaction: reply, reactions
 * - Navigation: display reactions, suggested posts
 * - Moderation: flag message
 * 
 * This pattern provides:
 * - Flexible action handling based on user permissions
 * - Consistent callback signatures across the app
 * - Easy extension for new action types
 * - Type-safe action dispatch
 * 
 * @property onDelete - Removes the message (owner only)
 * @property onReplyTo - Initiates reply to the message
 * @property onEdit - Opens edit mode for the message (owner only)
 * @property onReactji - Opens full reaction picker
 * @property onQuickReaction - Applies a quick reaction emoji
 * @property onDisplayReactions - Shows reaction details modal
 * @property onSuggestedPost - Creates a new post from the message
 * @property onFlagMessage - Reports the message for moderation
 */
export type MessageActionProps = {
  onDelete?(id: T.Message["id"]): void;
  onReplyTo?(id: T.Message["id"]): void;
  onEdit?(id: T.Message["id"]): void;
  onReactji?(m: T.Message): void;
  onQuickReaction?(messageId: T.Message["id"], reaction: string): void;
  onDisplayReactions?(message: T.Message): void;
  onSuggestedPost?: (messageId: T.Message["id"]) => void;
  onFlagMessage?: (messageId: T.Message["id"]) => void;
  messageRetryStatus?: Record<T.Message["id"], any>;
  onRetryMessage?: (messageId: T.Message["id"]) => void;
}

/**
 * Core props interface for the Message component.
 * 
 * Defines all data and callbacks needed to render a message with full functionality,
 * including context awareness, theming, and user interactions.
 * 
 * Key functionality and invariants:
 * - [message-context] Requires current, next, and previous messages for proper spacing
 * - [user-identification] Distinguishes between viewing user and message author
 * - [theme-aware] Requires colors object for consistent theming
 * - [database-access] Needs db instance for data lookups
 * - [render-mode] Uses inPost flag to switch between chat and discussion rendering
 * 
 * Data requirements:
 * - Message data: current, next, previous for context-aware rendering
 * - User data: both viewer (user) and message author for permissions
 * - Discussion context for "New" message indicators
 * - Database instance for contact lookups and data queries
 * 
 * Callback categories:
 * - Layout: onMessageLayout for scroll position tracking
 * - Navigation: onTapReply, navigateToDiscussion
 * - Actions: All message actions via messageActionProps
 * - User interaction: onPressAvatar for profile navigation
 * 
 * Rendering modes:
 * - Chat mode (inPost=false): Full animations, gestures, floating menus
 * - Post mode (inPost=true): Simplified view with thread lines
 * 
 * This pattern provides:
 * - Complete message rendering context
 * - Flexible action handling through composition
 * - Performance optimization through selective updates
 * - Clean separation between data and behavior
 * 
 * @property key - React key for list rendering
 * @property currentMessage - The message to render
 * @property nextMessage - Next message for spacing calculations
 * @property previousMessage - Previous message for grouping logic
 * @property discussion - Parent discussion for context
 * @property user - Current viewing user
 * @property author - Message author details
 * @property colors - Theme colors object
 * @property db - Frontend database instance
 * @property onMessageLayout - Layout change callback
 * @property onTapReply - Reply message navigation
 * @property onSuggestedPost - Create post from message
 * @property navigateToDiscussion - Navigate to discussion
 * @property bubble - Bubble customization props
 * @property messageActionProps - All message action callbacks
 * @property onPressAvatar - Avatar press handler
 * @property inPost - Render in post/discussion mode
 * @property shouldRenderDay - Show day separator
 */
// Need to remove many of these to make it easier to memo
export type MessageProps = {
  // checked properties
  key: any;
  currentMessage?: T.Message;
  nextMessage?: T.Message;
  previousMessage?: T.Message;
  discussion?: T.Discussion; // needed for --- New ---
  user: T.Contact;
  author: T.Contact | null;
  colors: any;

  db: FrontendDB;

  // callbacks
  onMessageLayout?(event: LayoutChangeEvent): void;
  onTapReply?(messageId: string): void; // navigates you up to the reply message
  onSuggestedPost?: (messageId: T.Message["id"]) => void;
  navigateToDiscussion?: (did: T.Discussion["id"]) => void;
  bubble?: PropsForBubble;
  messageActionProps?: MessageActionProps;
  onPressAvatar: (userId: T.User["id"]) => void;

  // slow changing
  inPost?: boolean; // TODO: combine shouldRenderDay with inPost
  shouldRenderDay?: boolean; // needed for inPost
}

type InnerMessageProps = MessageProps & BubbleActionProps;

const isContactEqual = (ua: T.Contact | null | undefined, ub: T.Contact | null | undefined): boolean => {
  if (ua === ub) return true;
  if (!ua || !ub) return false;
  return ua.id === ub.id && ua.name === ub.name && ua.avatar === ub.avatar;
};

const isSimilarDiscussionToUser = (
  mid: T.Message["id"] | undefined,
  userId: T.User["id"] | undefined,
  da: T.Discussion | undefined,
  db: T.Discussion | undefined,
): boolean => {
  // Handle cases where required values are undefined
  if (!mid || !userId || !da || !db) {
    // If both discussions are undefined, they're similar
    // If one is undefined and the other isn't, they're different
    return da === db;
  }
  
  // we only care about the last message read of the discussion
  return (
    shouldShowLastSeen(mid, da, userId) === shouldShowLastSeen(mid, db, userId)
  );
};

const messagePropsAreEqual = (
  prev: MessageProps,
  next: MessageProps,
): boolean => {
  // Defensive null checks for React 19 compatibility
  if (!prev || !next) {
    return prev === next;
  }
  
  // Check message retry status for current message
  const prevRetryStatus = prev.messageActionProps?.messageRetryStatus?.[prev.currentMessage?.id];
  const nextRetryStatus = next.messageActionProps?.messageRetryStatus?.[next.currentMessage?.id];
  const retryStatusEqual = areMessageStatusesEqual(prevRetryStatus, nextRetryStatus);

  return (
    isContactEqual(prev.user, next.user) &&
    isContactEqual(prev.author, next.author) &&
    prev.inPost === next.inPost &&
    prev.shouldRenderDay === next.shouldRenderDay &&
    prev.onMessageLayout === next.onMessageLayout &&
    prev.navigateToDiscussion === next.navigateToDiscussion &&
    prev.onSuggestedPost === next.onSuggestedPost &&
    prev.onTapReply === next.onTapReply &&
    prev.onPressAvatar === next.onPressAvatar &&
    prev.db === next.db &&
    prev.messageActionProps === next.messageActionProps &&
    // areBubbleSpecialPropsEqual(prev.bubble, next.bubble) &&
    crdtIsEqual(prev.currentMessage, next.currentMessage) &&
    crdtIsEqual(next.previousMessage, prev.previousMessage) &&
    crdtIsEqual(next.nextMessage, prev.nextMessage) &&
    isSimilarDiscussionToUser(
      prev.previousMessage?.id,
      prev.user?.id,
      prev.discussion,
      next.discussion,
    ) &&
    prev.colors === next.colors &&
    retryStatusEqual
  );
};

const SELF_ACTION_MENU = {
  options: ["Continue with new post", "Edit", "Delete", "Cancel"],
  cancelButtonIndex: 3,
  destructiveButtonIndex: 2,
};

const NON_CONTACT_ACTION_MENU = {
  options: ["Report", "Cancel"],
  cancelButtonIndex: 1,
  destructiveButtonIndex: 0,
};

const CONTACTS_ACTION_MENU = {
  options: ["Continue with new post", "Report", "Cancel"],
  cancelButtonIndex: 2,
  destructiveButtonIndex: 1,
};

// Helper type for message containers
interface MessageContainerProps extends InnerMessageProps, BubbleActionProps {
  bubbleRef: React.RefObject<View>;
  onLayout: () => void;
  isMenuOpen: boolean;
}

type MessageRowProps = MessageContainerProps & BubbleAnimationProps;

const MessageRowInPost: React.FC<MessageRowProps> = (props) => {
  const { currentMessage } = props;

  if (!currentMessage) {
    return null;
  }

  const isHighlighted = false; //  currentMessage.isHighlighted;

  const flatReactions = flattenReactions(currentMessage.reactions);
  const hasReactions = flatReactions.length > 0;
  const bottomSpacing = 0;

  const marginBottom = bottomSpacing / 2;
  const paddingBottom =
    marginBottom + (isHighlighted ? (hasReactions ? 12 : 4) : 0);

  return (
    <View style={{ marginBottom, paddingBottom, backgroundColor: "transparent" }}>
      <MessageInnerContainerInPost {...props} />
    </View>
  );
};


const MessageRowInChat: React.FC<MessageRowProps> = (props) => {
  const { currentMessage, nextMessage, navigateToDiscussion } = props;

  if (!currentMessage) {
    return null;
  }

  const continuedDiscussionId = currentMessage.posted_as_discussion?.[0];
  const { isLoading, originallyFrom } = useContinuedDiscussion(continuedDiscussionId);

  const hasContinuedPost = continuedDiscussionId && originallyFrom;

  // Add animation for right border
  const borderAnimation = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    if (hasContinuedPost && !isLoading) {
      borderAnimation.value = withTiming(0, { duration: ENTER_ANIMATION_MS });
    }
  }, [hasContinuedPost, isLoading]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: borderAnimation.value }],
  }));

  return (
    <View
      style={[
        GatzStyles.gutter,
        {
          marginBottom: calculateMessageBottomMargin(currentMessage, nextMessage),
          backgroundColor: "transparent",
          position: 'relative',
          overflow: 'visible'
        },
      ]}
    >
      {hasContinuedPost && !isLoading && (
        <Animated.View
          style={[styles.rightBorderAnimated, animatedBorderStyle,]}
        />
      )}
      <SuggestedActions {...props} />
      {originallyFrom && (
        <View style={{ marginRight: 2 }}>
          <ContinuedToPost
            did={continuedDiscussionId}
            continuedBy={originallyFrom.discussionUser}
            messageUserId={currentMessage.user_id}
            navigateToDiscussion={navigateToDiscussion}
          />
        </View>
      )}
      <ReplyToPreviewContainer {...props} />
      <MessageInnerContainerInChat {...props} />
    </View>
  );
};

// Helper render functions for MessageRow
const SuggestedActions: React.FC<InnerMessageProps> = (props) => {
  const { onSuggestedPost, currentMessage, author } = props;
  
  if (!currentMessage) {
    return null;
  }
  
  const mid = currentMessage.id;

  const hasAssociatedDiscussions =
    currentMessage.posted_as_discussion?.length > 0;

  if (
    !onSuggestedPost ||
    getUserId(author) !== currentMessage.user_id ||
    hasAssociatedDiscussions
  ) {
    return null;
  }

  const specialReactions = countSpecialReactions(
    getUserId(author),
    flattenReactions(currentMessage.reactions),
  );

  if (SPECIAL_REACTION_THRESHOLD <= specialReactions) {
    return (
      <SuggestPosting
        key={mid}
        message={currentMessage}
        onSuggestedPost={onSuggestedPost}
        useMessageSuggestionStore={messageSuggestionStore(mid)}
      />
    );
  }
  return null;
};

const ReplyToPreviewContainer: React.FC<InnerMessageProps> = (props) => {
  const { db, currentMessage, onTapReply, colors } = props;
  
  if (!currentMessage?.reply_to) {
    return null;
  }
  
  const replyMessage = db.getMessageById(currentMessage.did, currentMessage.reply_to);
  return (
    <TouchableOpacity
      onPress={() => onTapReply && onTapReply(currentMessage.reply_to)}
    >
      <View
        style={[
          styles.replyPreviewOuterContainer,
          { backgroundColor: colors.rowBackground },
        ]}
      >
        <ReplyToPreviewComponent message={replyMessage} />
      </View>
    </TouchableOpacity>
  );
};

/**
 * Main Message component that renders individual chat messages with full functionality.
 * 
 * This functional component serves as the primary entry point for rendering messages in the chat UI,
 * handling both regular chat messages and messages within posts/discussions.
 * 
 * Key functionality and invariants:
 * - [context-aware-rendering] Renders differently based on inPost prop (chat vs discussion view)
 * - [performance-optimization] Uses React.memo with messagePropsAreEqual for deep equality checks
 * - [action-delegation] Delegates all message actions through messageActionProps
 * - [flagged-message-filtering] Hides messages flagged by the current user
 * - [day-separator-logic] Conditionally renders day separators based on shouldRenderDay prop
 * - [layout-tracking] Notifies parent of layout changes via onMessageLayout callback
 * 
 * Rendering modes:
 * - Chat mode: Full animations, swipe-to-reply, floating action menu
 * - Post mode: Simplified rendering with thread lines and compact avatars
 * 
 * Action handling:
 * - Reply, Edit, Delete actions for message owner
 * - Report action for non-owned messages
 * - Continue with new post for eligible messages
 * - Reaction management through dedicated handlers
 * 
 * Performance considerations:
 * - Uses messagePropsAreEqual for granular prop comparison
 * - Avoids re-renders for unchanged messages or UI state
 * - Delegates heavy lifting to specialized child components
 * 
 * This pattern provides:
 * - Centralized message rendering logic
 * - Consistent action handling across the app
 * - Flexible rendering based on context
 * - Efficient updates through careful prop comparison
 * 
 * @param props - MessageProps containing message data and action handlers
 * @returns React element representing the message or null if flagged
 */
const Message: React.FC<MessageProps> = React.memo((props) => {
  const context = useContext(GiftedChatContext);
  const { currentMessage, inPost, onMessageLayout, user, db, messageActionProps } = props;

  if (!currentMessage) {
    return null;
  }

  const onReply = useCallback(() => {
    messageActionProps?.onReplyTo?.(currentMessage.id);
  }, [currentMessage.id, messageActionProps]);

  const onEdit = useCallback(() => {
    messageActionProps?.onEdit?.(currentMessage.id);
  }, [currentMessage.id, messageActionProps]);

  const onDelete = useCallback(() => {
    messageActionProps?.onDelete?.(currentMessage.id);
  }, [currentMessage.id, messageActionProps]);

  const onReactji = useCallback(() => {
    messageActionProps?.onReactji?.(currentMessage);
  }, [currentMessage, messageActionProps]);

  const onFlagMessage = useCallback(() => {
    messageActionProps?.onFlagMessage?.(currentMessage.id);
  }, [currentMessage.id, messageActionProps]);

  const onSuggestedPost = useCallback(() => {
    messageActionProps?.onSuggestedPost?.(currentMessage.id);
  }, [currentMessage.id, messageActionProps]);

  const onDisplayReactions = useCallback(() => {
    messageActionProps.onDisplayReactions(currentMessage);
  }, [currentMessage, messageActionProps]);

  const onCopyText = useCallback(() => {
    Clipboard.setString(currentMessage.text);
  }, [currentMessage.text]);

  const openBottomMenu = useCallback(() => {
    if (currentMessage && currentMessage.text) {
      const isUserOwner = getUserId(user) === currentMessage.user_id;
      const messageFromUserId = currentMessage.user_id;
      const myContacts = db.getMyContacts();
      const isMessageFromContact = messageFromUserId && myContacts.has(messageFromUserId);
      if (isUserOwner) {
        context
          .actionSheet()
          .showActionSheetWithOptions(
            SELF_ACTION_MENU,
            (buttonIndex: number) => {
              switch (buttonIndex) {
                case 0:
                  onSuggestedPost();
                  break;
                case 1:
                  onEdit();
                  break;
                case 2:
                  onDelete();
                  break;
                default:
                  break; // Cancel
              }
            },
          );
      } else if (isMessageFromContact) {
        context
          .actionSheet()
          .showActionSheetWithOptions(
            CONTACTS_ACTION_MENU,
            (buttonIndex2: number) => {
              switch (buttonIndex2) {
                case 0:
                  onSuggestedPost();
                  break;
                case 1:
                  onFlagMessage();
                  break;
                case 2:
                  break; // Cancel
                default:
                  break; // Cancel
              }
            },
          );
      } else {
        context
          .actionSheet()
          .showActionSheetWithOptions(
            NON_CONTACT_ACTION_MENU,
            (buttonIndex3: number) => {
              switch (buttonIndex3) {
                case 0:
                  onFlagMessage();
                  break;
                case 1:
                  break; // Cancel
                default:
                  break; // Cancel
              }
            },
          );
      }
    }
  }, [currentMessage, user, db, context, onSuggestedPost, onEdit, onDelete, onFlagMessage]);

  const renderDay = useCallback(() => {
    const { currentMessage, shouldRenderDay } = props;
    // [day-separator-logic]
    if (shouldRenderDay && currentMessage && currentMessage.created_at) {
      return <Day {...props} />;
    } else {
      return null;
    }
  }, [props]);

  const renderSystemMessage = useCallback(() => {
    const { onMessageLayout, ...restProps } = props;
    return (
      <SystemMessage
        currentMessage={{ ...restProps.currentMessage, system: true }}
      />
    );
  }, [props]);

  // [flagged-message-filtering]
  const isFlaggedByUser = currentMessage?.flagged_uids?.includes(getUserId(user));
  if (currentMessage && !isFlaggedByUser) {
    // @ts-ignore
    const messageRowProps: MessageRowProps = {
      ...props,
      onReply,
      onEdit,
      onDelete,
      onReactji,
      onFlagMessage,
      onSuggestedPost,
      onDisplayReactions,
      onCopyText,
      openBottomMenu,
    };

    return (
      <View
        id={currentMessage.id}
        // [layout-tracking]
        onLayout={onMessageLayout}
        style={{ backgroundColor: "transparent", overflow: 'visible' }}
      >
        {/* [context-aware-rendering] [day-separator-logic] */}
        {!inPost && renderDay()}
        {/* [context-aware-rendering] */}
        {inPost ? (
          <MessageRowInPost {...messageRowProps} />
        ) : (
          <MessageRowInChat {...messageRowProps} />
        )}
      </View>
    );
  }
  return null;
}, messagePropsAreEqual);

Message.defaultProps = {
  shouldRenderDay: true,
  currentMessage: {},
  nextMessage: {},
  previousMessage: {},
  user: {},
  onMessageLayout: undefined,
  inPost: false,
  colors: {},
};

Message.propTypes = {
  currentMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  user: PropTypes.object,
  onMessageLayout: PropTypes.func,
  bubble: PropTypes.object,
  inPost: PropTypes.bool,
  colors: PropTypes.object,
};

export default Message;

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const TRANSLATE_X_THRESHOLD = SCREEN_WIDTH * 0.15;

// Platform-specific spring animation configuration for swipe-to-reply
// Fixed for Android: Higher damping (15-20) prevents infinite bouncing, 
// overshootClamping prevents overshooting, velocity=0 prevents initial velocity issues
const SWIPE_ANIMATION_CONFIG: WithSpringConfig = Platform.select({
  android: {
    stiffness: 250,
    damping: 20,
    velocity: 0,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  default: {
    stiffness: 300,
    damping: 15,
    velocity: 0,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  }
});

const ELASTIC_RESISTANCE_FACTOR = 0.2;
const PARALLAX_BACKGROUND_RATIO = 0.25;
const ICON_SCALE_ACTIVE = 1.16;

const pullSpring = (x: number, threshold: number): number => {
  "worklet";
  if (x <= threshold) {
    return x;
  }
  const overshoot = x - threshold;
  const resistance = overshoot * ELASTIC_RESISTANCE_FACTOR;
  return threshold + resistance;
};

/**
 * Wrapper component for Message that previously handled swipe-to-reply functionality.
 * 
 * This component serves as a pass-through wrapper that maintains API compatibility
 * while the actual swipe logic has been moved into the Message component hierarchy.
 * 
 * Key functionality and invariants:
 * - [api-compatibility] Maintains the same props interface as Message component
 * - [pass-through-behavior] Forwards all props unchanged to Message component
 * - [no-additional-logic] Contains no business logic or state management
 * - [legacy-wrapper] Exists for backward compatibility with existing code
 * 
 * Historical context:
 * - Originally implemented platform-specific swipe-to-reply gesture
 * - Swipe functionality now integrated directly into AnimatedMessageInnerRowInChat
 * - Kept as a wrapper to avoid breaking changes in consuming components
 * 
 * This pattern provides:
 * - Seamless migration path for components using SwipeMessage
 * - Flexibility to reintroduce swipe-specific logic if needed
 * - Clear separation of concerns in the component hierarchy
 * 
 * @param props - Standard MessageProps passed through to Message component
 * @returns Message component with all props forwarded
 */
export const SwipeMessage: React.FC<MessageProps> = (props) => {
  // [pass-through-behavior] [api-compatibility]
  return <Message {...props} />;
};

type InnerBubbleProps = BubbleAnimationProps & {
  bubbleRef: React.RefObject<View>;
  onLayout: () => void;
  isMenuOpen: boolean;
  translateX?: any; // SharedValue<number>
}

const FEEDBACK_CONFIG: WithSpringConfig = {
  stiffness: 400,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  velocity: 0,
};

// Helper type for bubble animation props
type BubbleAnimationHelperProps = BubbleAnimationProps & {
  bubbleRef: React.RefObject<View>;
  onLayout: () => void;
  isMenuOpen: boolean;
};

// Update AnimatedBubbleHelper to include required props
const AnimatedBubbleHelper: React.FC<BubbleAnimationHelperProps> = (props) => {
  // Using any to avoid the type error for 'bubble' property
  const propsWithBubble = props as any;
  const {
    bubbleRef,
    onLayout,
    isMenuOpen,
    bubbleHeightStyle,
    bubble,
    ...bubbleRestProps
  } = propsWithBubble;

  return (
    <Bubble {...bubbleRestProps} {...bubble} bubbleHeightStyle={bubbleHeightStyle} />
  );
};

const StaticBubbleHelper = (props: InnerMessageProps & { isHover?: boolean }) => {
  // Using any to avoid the type error for 'bubble' property
  const propsWithBubble = props as any;
  const { bubble, isHover, ...bubbleRestProps } = propsWithBubble;
  return (
    <View style={{ flex: 1 }} >
      <Bubble {...bubbleRestProps} {...bubble} isHover={isHover} />
    </View >
  );
}

type MeasureResult = { width: number; height: number; pageX: number; pageY: number };

const usefulMessageProps = (currentMessage: T.Message) => {
  const flatReactions = flattenReactions(currentMessage.reactions);
  const hasReactions = flatReactions.length > 0;
  const hasEdits = currentMessage.edits?.length > 1;
  const hasText = currentMessage.text && currentMessage.text.trim().length > 0;
  const hasMedia = currentMessage.media && currentMessage.media.length > 0;

  return { hasReactions, hasEdits, flatReactions, hasText, hasMedia };
}

// This is the inner row of the message, without the avatar, which can be swiped to reply
const StaticMessageInnerRowInChat: React.FC<InnerMessageProps> = (props: InnerMessageProps) => {
  const { currentMessage, colors, } = props;
  const { hasReactions, hasEdits, hasText, hasMedia } = usefulMessageProps(currentMessage);
  const [isHover, setIsHover] = React.useState(false);

  const handleHoverIn = React.useCallback(() => {
    setIsHover(true);
  }, []);

  const handleHoverOut = React.useCallback(() => {
    setIsHover(false);
  }, []);

  const hover = Gesture.Hover()
    .onStart(handleHoverIn)
    .onEnd(handleHoverOut);

  // The edits element is not floating but the hanging reactions are.
  // So, when the edit element is there, you need less space because it makes its own space
  // But the hanging reactions don't make their own space
  const inBetweenMargin =
    hasReactions || hasEdits ? 4 : hasReactions ? 22 : hasEdits ? 6 : 2;
  // In web we want to show the full message but without the animations
  const showReactionsBelowMedia = hasReactions && hasMedia;

  // When reactions are shown with media, we need to adjust the margin between
  // the bubble and media to remove extra space that was intended for bubble reactions
  const adjustedInBetweenMargin = hasMedia ?
    2 : // When reactions are on media, we only need margin for edits
    inBetweenMargin; // Otherwise use the default margin

  return (
    <GestureDetector gesture={hover}>
      <View style={[styles.positionRelative, { flex: 1, overflow: 'visible' }]}>
        {/* Only show the bubble if there's text */}
        {hasText ? (
          <View style={{ overflow: 'visible' }}>
            <View style={[{ flex: 1, overflow: 'visible' }]}>
              <StaticBubbleHelper {...props} isHover={isHover} />
            </View>
          </View>
        ) : null}

        <View style={[
          styles.positionRelative,
          { flex: 1, marginTop: hasText ? adjustedInBetweenMargin : 0, overflow: 'visible' }
        ]}>
          {/* Create position for properly hanging reactions */}
          <View style={[
            styles.positionRelative,
            {
              alignSelf: 'flex-start',
              maxWidth: '100%',
              width: '100%', // Full width to allow overflow
              overflow: 'visible' // Allow content to overflow container
            }
          ]}>
            <HangingMediaReactionsAndEdited
              message={currentMessage}
              reactionsProps={showReactionsBelowMedia ? {
                onDisplayReactions: props.onDisplayReactions,
                reactions: currentMessage.reactions,
                outerStyle: styles.hangingReactionsContainer,
                isHover: isHover,
                onReactji: props.onReactji
              } : undefined}
              colors={colors}
            />
          </View>
          <HangingCards currentMessage={currentMessage} />
          {currentMessage.link_previews && currentMessage.link_previews.map((preview) => (
            <LinkPreview
              withBorder={false}
              withShadow={true}
              key={preview.id}
              previewData={preview}
            />
          ))}
        </View>
        {isHover && (
          <View style={{ position: "absolute", top: -12, right: 8 }}>
            <HoverMenu
              colors={colors}
              onReply={props.onReply}
              onReactji={props.onReactji}
              onCopyText={hasText ? props.onCopyText : undefined}
              openBottomMenu={props.openBottomMenu}
            />
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

// This is the inner row of the message, without the avatar, which can be swiped to reply
const AnimatedMessageInnerRowInChat: React.FC<InnerMessageProps & InnerBubbleProps> = (props: InnerMessageProps & InnerBubbleProps) => {
  const { currentMessage, colors, isMenuOpen, translateX: externalTranslateX } = props;
  // Create a ref for the ScrollView to use with gesture handler
  const scrollViewRef = useRef<ScrollView>(null);

  const { hasReactions, hasEdits } = usefulMessageProps(currentMessage);

  // The edits element is not floating but the hanging reactions are.
  // So, when the edit element is there, you need less space because it makes its own space
  // But the hanging reactions don't make their own space
  const inBetweenMargin =
    hasReactions || hasEdits ? 4 : hasReactions ? 22 : hasEdits ? 6 : 2;

  // Use external translateX if provided, otherwise create our own
  const localTranslateX = useSharedValue(0);
  const translateX = externalTranslateX || localTranslateX;
  
  // Track threshold crossing to prevent continuous scale animation
  // Fix: Only trigger scale animation once per threshold crossing, not on every frame
  const iconScale = useSharedValue(1);
  const hasThresholdBeenCrossed = useSharedValue(false);

  // Add cleanup for animations when component unmounts
  useEffect(() => {
    return () => {
      // Ensure any pending animations are canceled
      // This prevents the animation system from trying to modify
      // objects that may have been frozen or made read-only
      if (translateX && !externalTranslateX) {
        // Only cancel if we own the translateX value
        cancelAnimation(translateX);
      }
      if (iconScale) {
        cancelAnimation(iconScale);
      }
    };
  }, [translateX, externalTranslateX, iconScale]);


  const rMessageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const stableMessageStyle = useMemo(() => rMessageStyle, []);

  const replyIconContainerStyle = useAnimatedStyle(() => {
    const progress = translateX.value / TRANSLATE_X_THRESHOLD;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    
    // Progressive alpha based on swipe progress (0 to 1)
    const opacity = clampedProgress;
    
    // Check threshold crossing and trigger scale animation only once per cross
    const thresholdCrossed = translateX.value >= TRANSLATE_X_THRESHOLD;
    if (thresholdCrossed && !hasThresholdBeenCrossed.value) {
      hasThresholdBeenCrossed.value = true;
      iconScale.value = withSpring(ICON_SCALE_ACTIVE, SWIPE_ANIMATION_CONFIG);
    } else if (!thresholdCrossed && hasThresholdBeenCrossed.value) {
      hasThresholdBeenCrossed.value = false;
      iconScale.value = withSpring(1, SWIPE_ANIMATION_CONFIG);
    }
    
    return { 
      opacity,
      transform: [
        { translateX: translateX.value * PARALLAX_BACKGROUND_RATIO },
        { scale: iconScale.value }
      ]
    };
  });
  const stableReplyIconContainerStyle = useMemo(() => replyIconContainerStyle, []);

  const animatedIconProps = useAnimatedProps(() => {
    const isActive = translateX.value >= TRANSLATE_X_THRESHOLD;
    const color = isActive ? colors.textPrimary : colors.strongGrey;
    return {
      color: color,
    };
  });

  // Use a mutable plain object instead of a ref to avoid React fiber cleanup issues
  const isMountedObj = useMemo(() => ({ current: true }), []);
  useEffect(() => {
    return () => {
      if (translateX) {
        cancelAnimation(translateX);
      }
      isMountedObj.current = false;
    };
  }, [translateX]);

  // Safely call onLongPress with null check
  const safeOnLongPress = useCallback((event?: { absoluteY: number } | null) => {
    // Only call the handler if the component is mounted, handler exists, and event is not null
    if (isMountedObj.current && props.onLongPress && event !== null) {
      props.onLongPress(event);
    }
  }, [props.onLongPress]);

  // when swipe is done, reply to the message
  const safeOnReply = useCallback(() => {
    if (isMountedObj.current && props.messageActionProps.onReplyTo) {
      props.messageActionProps.onReplyTo(props.currentMessage.id);
    }
  }, [props.messageActionProps.onReplyTo, props.currentMessage.id]);

  // Create gestures using useMemo to ensure stability
  const combinedGesture = useMemo(() => {
    const longPressGesture = Gesture.LongPress()
      .onStart((e: GestureStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
        "worklet";
        // Check if we have a valid event with absoluteY before passing it
        if (e && typeof e.absoluteY === 'number') {
          // Create a simplified event to avoid circular references
          const simpleEvent = { absoluteY: e.absoluteY };
          runOnJS(safeOnLongPress)(simpleEvent);
        } else {
          // If event is invalid, don't pass it to the handler
          console.log("Invalid long press event, not calling handler");
        }
      })
      .minDuration(LONG_PRESS_DURATION);

    const panGesture = Gesture.Pan()
      .onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        "worklet";
        if (e.translationX > 0) {
          translateX.value = pullSpring(e.translationX, TRANSLATE_X_THRESHOLD);
        }
      })
      .onEnd(() => {
        "worklet";
        const shouldReply = translateX.value > TRANSLATE_X_THRESHOLD;
        
        // Reset threshold tracking and icon scale
        hasThresholdBeenCrossed.value = false;
        iconScale.value = withSpring(1, SWIPE_ANIMATION_CONFIG);
        
        // Animate back to original position
        translateX.value = withSpring(0, SWIPE_ANIMATION_CONFIG);

        // Execute reply separately to avoid potential issues with completion callbacks
        if (shouldReply) {
          runOnJS(safeOnReply)();
        }
      })
      .activeOffsetX([-5, 5])
      .failOffsetY([-5, 5]);
    // The ScrollView has native priority over the pan gesture on Android

    return Gesture.Exclusive(longPressGesture, panGesture);
  }, [safeOnLongPress, safeOnReply, translateX]);

  const propsWithBubble = props as any;
  const {
    bubbleRef,
    onLayout,
    bubbleHeightStyle,
    bubbleScaleStyle,
    bubble,
    ...bubbleRestProps
  } = propsWithBubble;

  const onBubbleLongPress = useCallback((event: GestureResponderEvent) => {
    bubbleRestProps.onLongPress(event);
  }, [bubbleRestProps.onLongPress]);

  return (
    <View style={[styles.positionRelative, { flex: 1, overflow: 'visible' }]}>
      <GestureDetector gesture={combinedGesture}>
        <View style={{ flex: 1, overflow: 'visible' }}>
          <Animated.View
            style={[stableMessageStyle, {
              flex: 1,
              marginRight: 8,
              marginBottom: calculateMessageBottomMargin(currentMessage, props.nextMessage),
              overflow: 'visible'
            }]}
          >
            <View
              ref={bubbleRef}
              onLayout={Platform.select({ android: onLayout })}
              style={[{ flex: 1, opacity: isMenuOpen ? 0 : 1, overflow: 'visible' }]}
            >
              <MessageContent
                currentMessage={currentMessage}
                colors={colors}
                bubbleHeightStyle={bubbleHeightStyle}
                bubbleScaleStyle={bubbleScaleStyle}
                isMenuOpen={isMenuOpen}
                onDisplayReactions={props.onDisplayReactions}
                scrollViewRef={scrollViewRef}
                {...props}
              />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
      <Animated.View
        style={[
          styles.animatedReplyIcon,
          styles.mirror,
          {
            backgroundColor: colors.appBackground,
            borderRadius: 20,
            padding: 4,
          },
          stableReplyIconContainerStyle,
        ]}
      >
        {React.createElement(
          Animated.createAnimatedComponent(MaterialIcons),
          {
            name: "reply",
            size: 20,
            animatedProps: animatedIconProps
          }
        )}
      </Animated.View>
    </View>
  );
}

// This contains the avatar and the inner row, which can be long tapped for the action menu
const AnimatedMessageInnerContainerInChat: React.FC<InnerMessageProps> = (props: InnerMessageProps) => {
  const { currentMessage, onPressAvatar, colors, db, author } = props;
  const { onMessageLayout, bubble, ...bubbleRestProps } = props;

  const bubbleRef = React.useRef<View>(null);
  const dimensionsRef = React.useRef<MeasureResult | null>(null);
  const measureAttempt = React.useRef(0);

  const tryMeasure = (): Promise<MeasureResult> => {
    measureAttempt.current = measureAttempt.current + 1;

    return new Promise((resolve, reject) => {
      if (measureAttempt.current > 3) {
        reject(new Error("Failed to measure bubble after 3 attempts"));
        return;
      }

      bubbleRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width && height && pageX && pageY) {
          const measurements = { width, height, pageX, pageY };
          dimensionsRef.current = measurements;
          resolve(measurements);
        } else {
          setTimeout(() => {
            tryMeasure().then(resolve).catch(reject);
          }, 60);
        }
      });
    });
  };

  // android needs a requestAnimationFrame to get the correct measurements
  const onLayout = useCallback(() => {
    measureAttempt.current = 0;
    requestAnimationFrame(async () => {
      const measurements = await tryMeasure().catch(() => null);
      dimensionsRef.current = measurements;
    });
  }, []);

  const { openPortal, closePortal } = useContext(PortalContext);

  const onReply = useCallback(() => {
    props.messageActionProps.onReplyTo?.(props.currentMessage.id);
  }, [props.messageActionProps.onReplyTo, props.currentMessage.id]);

  const onMoreReactions = useCallback(() => {
    closePortal();
    props.messageActionProps.onReactji?.(props.currentMessage);
  }, [props.messageActionProps.onReactji, props.currentMessage]);

  const onQuickReaction = useCallback((reaction: string) => {
    closePortal();
    props.messageActionProps.onQuickReaction?.(props.currentMessage.id, reaction);
  }, [props.messageActionProps.onQuickReaction, props.currentMessage.id]);

  const onEdit = useCallback(() => {
    props.messageActionProps.onEdit?.(props.currentMessage.id);
  }, [props.messageActionProps.onEdit, props.currentMessage.id]);

  const onDelete = useCallback(() => {
    props.messageActionProps.onDelete?.(props.currentMessage.id);
  }, [props.messageActionProps.onDelete, props.currentMessage.id]);

  const onCopy = useCallback(() => {
    Clipboard.setString(props.currentMessage.text);
  }, [props.currentMessage.text]);

  const onContinueWithNewPost = useCallback(() => {
    props.onSuggestedPost?.(props.currentMessage.id);
  }, [props.onSuggestedPost, props.currentMessage.id]);

  const { session: { userId } } = useContext(SessionContext);

  const messageFromUserId = currentMessage.user_id;
  const isUserOwner = messageFromUserId === userId;
  const isMessageFromContact = useMemo(() => {
    const myContacts = db.getMyContacts();
    return messageFromUserId && myContacts.has(messageFromUserId);
  }, [messageFromUserId, db]);

  const actionItems = isUserOwner ? [
    { text: 'Reply', icon: 'reply' as const, onPress: onReply },
    { text: 'Edit', icon: 'edit' as const, onPress: onEdit },
    { text: 'Copy Text', icon: 'content-copy' as const, onPress: onCopy, },
    { text: "New post from this message", icon: "arrow-forward" as const, onPress: onContinueWithNewPost, withSeparator: true },
    { text: 'Delete', icon: 'delete' as const, isDestructive: true, onPress: onDelete },
  ] : [
    { text: 'Reply', icon: 'reply' as const, onPress: onReply },
    { text: 'Copy Text', icon: 'content-copy' as const, onPress: onCopy },
    isMessageFromContact && {
      text: "New post from this message",
      icon: "arrow-forward" as const,
      onPress: onContinueWithNewPost,
    },
  ].filter(Boolean) as MenuItemProps[];

  const bubbleTop = useSharedValue(0);
  const bubblePositionStyle = useAnimatedStyle<ViewStyle>(() => {
    // Ensure the value is a valid number before using it in a style
    const topValue = isNaN(bubbleTop.value) ? 100 : bubbleTop.value;
    return { top: topValue }
  }, [bubbleTop]);

  const bubbleHeight = useSharedValue(0);
  const bubbleHeightStyle = useAnimatedStyle<ViewStyle>(() => {
    const height = isNaN(bubbleHeight.value) ? MAX_BUBBLE_HEIGHT : bubbleHeight.value;
    return { maxHeight: height }
  }, [bubbleHeight]);

  const textContainerHeight = useSharedValue(0);
  const textContainerStyle = useAnimatedStyle<ViewStyle>(() => {
    const height = isNaN(textContainerHeight.value) ? 0 : textContainerHeight.value;
    return { height: height, transform: [{ translateY: 0 }] }
  }, [textContainerHeight]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { hasReactions } = usefulMessageProps(currentMessage);

  // Create shared translateX value for swipe gesture and parallax effects
  const translateX = useSharedValue(0);
  
  // Add cleanup for animations when component unmounts
  useEffect(() => {
    return () => {
      if (translateX) {
        cancelAnimation(translateX);
      }
    };
  }, [translateX]);

  // Parallax style for avatar (background element) - 25% speed
  const avatarParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * PARALLAX_BACKGROUND_RATIO }],
  }));

  // Add new animated value for press feedback
  const pressAnimation = useSharedValue(1);

  // Create animated style for press feedback
  const bubbleScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressAnimation.value }]
  }));

  // Handle press in
  let pressTimeout = useRef<NodeJS.Timeout | null>(null);

  const onPressIn = useCallback((event: GestureResponderEvent) => {
    // Cancel any existing animations
    cancelAnimation(pressAnimation);

    // Start a subtle press feedback

    // Set a timeout to trigger the expansion animation
    pressTimeout.current = setTimeout(() => {
      pressAnimation.value = withSpring(0.98, {
        stiffness: FEEDBACK_CONFIG.stiffness,
        overshootClamping: FEEDBACK_CONFIG.overshootClamping,
        restDisplacementThreshold: FEEDBACK_CONFIG.restDisplacementThreshold,
        restSpeedThreshold: FEEDBACK_CONFIG.restSpeedThreshold,
      });
    }, 100); // Start slightly before long press triggers
  }, []);

  const onPressOut = useCallback(() => {
    // Clear the timeout to prevent animation if press is released early
    pressTimeout.current && clearTimeout(pressTimeout.current);

    // Reset the animation state
    cancelAnimation(pressAnimation);
    pressAnimation.value = withSpring(1, FEEDBACK_CONFIG);
  }, []);

  // Modify the onLongPress to reset the press animation
  const onLongPress = useCallback(async (event?: { absoluteY?: number } | null) => {
    // Skip processing if event is null
    if (!event) {
      console.log("Skipping null event in onLongPress");
      return;
    }

    // pressAnimation.value = 1;
    pressAnimation.value = withSpring(1, {
      damping: 15,
      stiffness: 400
    });

    // Use the absoluteY from the event, or default to center of screen
    const tapY = event.absoluteY || (WINDOW_HEIGHT / 2);

    measureAttempt.current = 0;
    await tryMeasure().catch(() => null);

    // if the measurements fails, then open the bottom menu as a fall back
    if (!dimensionsRef.current) {
      props.openBottomMenu();
      return;
    }

    const { height, pageY } = dimensionsRef.current;
    const { hasReactions, hasEdits, hasText, hasMedia } = usefulMessageProps(currentMessage);

    // Add extra height for media content when present
    // Each media element adds approximately the height of the media container (100px) plus margins
    const mediaExtraHeight = hasMedia ? 80 : 0;

    const shouldTruncate = height > MAX_BUBBLE_HEIGHT;
    bubbleHeight.value = height;
    bubbleHeight.value = withTiming(
      shouldTruncate ? MAX_BUBBLE_HEIGHT : height,
      { duration: MENU_ANIMATION_DURATION }
    );
    textContainerHeight.value = height - TEXT_CONTAINER_HEIGHT;
    textContainerHeight.value = withTiming(
      shouldTruncate ? MAX_BUBBLE_HEIGHT - TEXT_CONTAINER_HEIGHT : height - TEXT_CONTAINER_HEIGHT,
      { duration: MENU_ANIMATION_DURATION }
    );

    // Use adjusted height for calculating position
    const minBubbleTop = calculateMinBubbleTop(height, mediaExtraHeight);

    // Ensure we have valid numerical values before proceeding
    if (isNaN(tapY) || isNaN(minBubbleTop) || isNaN(pageY)) {
      // If any value is NaN, fall back to bottom menu
      props.openBottomMenu();
      return;
    }

    const bubbleTopY = Math.min(tapY, minBubbleTop);
    bubbleTop.value = pageY;
    bubbleTop.value = withTiming(bubbleTopY, { duration: MENU_ANIMATION_DURATION });

    setIsMenuOpen(true);

    const shadowStyle = colors.theme === "dark" ? holdMenuStyles.shadowDark : holdMenuStyles.shadow;

    openPortal(
      () => setIsMenuOpen(false),
      <Animated.View style={[
        holdMenuStyles.holdMenuAbsoluteContainer,
        bubblePositionStyle,
        // Add a fallback style for Android that will be applied if the animated style fails
        Platform.OS === 'android' ? { top: 100 } : null
      ]}>
        <View style={styles.innerContainer}>
          <View style={[styles.avatarContainer, shadowStyle]}>
            <WrappedAvatar
              size="small"
              user={author}
              onPress={() => onPressAvatar(getUserId(author))}
            />
          </View>
          <View style={[holdMenuStyles.holdMenuRelativeContainer, { gap: 0 }]}>
            <View style={[holdMenuStyles.holdMenuReactionContainer, shadowStyle]}>
              <QuickReactions
                onSelectReaction={onQuickReaction}
                onMore={onMoreReactions}
                reactions={currentMessage.reactions}
                userId={userId}
              />
            </View>
            <View style={shadowStyle}>
              {/* Use our reusable MessageContent component for consistent rendering */}
              <MessageContent
                currentMessage={currentMessage}
                colors={colors}
                bubbleHeightStyle={bubbleHeightStyle}
                bubbleScaleStyle={bubbleScaleStyle}
                textContainerStyle={textContainerStyle}
                isTruncated={shouldTruncate}
                isMenuOpen={true}
                onDisplayReactions={props.onDisplayReactions}
                showHangingCards={false}
                {...props as any}
              />
            </View>
            <View style={[shadowStyle, { marginTop: 4 }]}>
              <MenuItems onClose={closePortal} items={actionItems} />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }, [openPortal, currentMessage, colors]);

  return (
    <Animated.View
      exiting={FadeOutDown.duration(300)}
      style={[styles.innerContainer, { overflow: 'visible' }]}
    >
      <Animated.View style={[styles.avatarContainer, { opacity: isMenuOpen ? 0 : 1 }, avatarParallaxStyle]}>
        <WrappedAvatar
          size="small"
          user={author}
          onPress={() => onPressAvatar(author.id)}
        />
      </Animated.View>
      <AnimatedMessageInnerRowInChat
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        bubbleRef={bubbleRef}
        onLayout={onLayout}
        isMenuOpen={isMenuOpen}
        bubbleScaleStyle={bubbleScaleStyle}
        translateX={translateX}
        {...props as any}
      />
    </Animated.View>
  );
}

const StaticMessageInnerContainerInChat: React.FC<InnerMessageProps> = (props: InnerMessageProps) => {
  const { onPressAvatar, author } = props;
  return (
    <View style={[styles.innerContainer, { overflow: 'visible' }]}>
      <View style={styles.avatarContainer}>
        <WrappedAvatar
          size="small"
          user={author}
          onPress={() => onPressAvatar(getUserId(author))}
        />
      </View>
      <StaticMessageInnerRowInChat {...props} />
    </View>
  );
}

const MessageInnerContainerInChat = (props: InnerMessageProps) => {
  if (Platform.OS === "web" && !IS_TOUCH_DEVICE) {
    return <StaticMessageInnerContainerInChat {...props} />;
  } else {
    return <AnimatedMessageInnerContainerInChat {...props} />;
  }
}

const IS_TOUCH_DEVICE = function () {
  if (Platform.OS !== 'web') {
    return true; // Native platforms are always touch devices
  }

  // For web, check if touch is available
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - vendor prefixed property
    navigator.msMaxTouchPoints > 0
  );
}();

// This contains the avatar and the inner row but only in post, which doesn't need to be animated
const MessageInnerContainerInPost: React.FC<InnerMessageProps> = (props: InnerMessageProps) => {
  const { colors, onPressAvatar, previousMessage, nextMessage, author } = props;

  const isFirst = !previousMessage;
  const isLast = !nextMessage;

  const verticalLine = () => (
    <View
      style={[
        styles.threadLine,
        isFirst && { top: 20 },
        isLast ? { height: 6 } : { bottom: 0 },
        { backgroundColor: colors.disabledText },
      ]}
    />
  );

  return (
    <View style={styles.innerContainer}>
      {verticalLine()}
      <View
        style={[styles.avatarContainer, styles.inPostAvatarContainer,]}
      >
        {author && (
          <WrappedAvatar
            size="tiny"
            user={author}
            onPress={() => onPressAvatar(author.id)}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <StaticBubbleHelper {...props} />
      </View>
    </View>
  );
}

// Reusable message content component for both regular rendering and portal
type MessageContentProps = {
  currentMessage: T.Message,
  colors: any,
  bubbleHeightStyle?: any,
  textContainerStyle?: any,
  isTruncated?: boolean,
  bubbleScaleStyle?: any,
  isMenuOpen?: boolean,
  onDisplayReactions?: () => void,
  scrollViewRef?: React.RefObject<ScrollView>,
  showHangingCards?: boolean,
} & Partial<InnerMessageProps> & Partial<BubbleAnimationProps>;

const MessageContent = ({
  currentMessage,
  colors,
  bubbleHeightStyle,
  textContainerStyle,
  isTruncated = false,
  bubbleScaleStyle,
  isMenuOpen = false,
  showHangingCards = true,
  scrollViewRef,
  ...props
}: MessageContentProps) => {
  // Calculate all necessary properties inside the component
  const { hasReactions, hasEdits, hasText, hasMedia } = usefulMessageProps(currentMessage);
  const showReactionsBelowMedia = hasReactions && hasMedia;

  // Calculate the proper margin between message bubble and media
  const inBetweenMargin = hasReactions && hasEdits ? 4 : hasReactions ? 22 : hasEdits ? 6 : 2;
  const adjustedInBetweenMargin = hasMedia ? 2 : inBetweenMargin;

  // Determine if we're rendering in static or animated mode
  const isStatic = !bubbleScaleStyle;

  return (
    <View style={{ overflow: 'visible' }}>
      {/* Only show the bubble if there's text */}
      {hasText ? (
        <View style={{ overflow: 'visible' }}>
          <View style={[{ flex: 1, overflow: 'visible' }]}>
            {isStatic ? (
              <StaticBubbleHelper {...props as any} />
            ) : (
              <AnimatedBubbleHelper
                {...props as any}
                currentMessage={currentMessage}
                bubbleHeightStyle={bubbleHeightStyle}
                textContainerStyle={textContainerStyle}
                isTruncated={isTruncated}
                bubbleScaleStyle={bubbleScaleStyle}
                isMenuOpen={isMenuOpen}
                disableGestureHandlers={true}
              />
            )}
          </View>
        </View>
      ) : null}

      <View style={[
        styles.positionRelative,
        { flex: 1, marginTop: hasText ? adjustedInBetweenMargin : 0, overflow: 'visible' }
      ]}>
        {/* Create position for properly hanging reactions */}
        <View style={[
          styles.positionRelative,
          {
            alignSelf: 'flex-start',
            maxWidth: '100%',
            width: '100%', // Full width to allow overflow
            // Small margin for the floating menu case - parent container will add more space when needed
            overflow: 'visible' // Allow content to overflow container
          }
        ]}>
          <HangingMediaReactionsAndEdited
            colors={colors}
            message={currentMessage}
            scrollViewRef={scrollViewRef}
            reactionsProps={showReactionsBelowMedia ? {
              onDisplayReactions: props.onDisplayReactions,
              reactions: currentMessage.reactions,
              outerStyle: [styles.hangingReactionsContainer, Platform.OS === 'android' && { bottom: -16 }]
            } : undefined}
          />
        </View>
        {showHangingCards && (
          <>
            <HangingCards currentMessage={currentMessage} />
            {currentMessage.link_previews && currentMessage.link_previews.map((preview) => (
              <LinkPreview
                key={preview.url || preview.id}
                previewData={preview}
                withShadow={true}
                withBorder={false}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
};

// Helper render functions

const HangingCards = ({ currentMessage }: { currentMessage: T.Message }) => {
  const inviteIds = parseInviteIds(currentMessage.text);
  const contactIds = parseContactIds(currentMessage.text);
  const groupIds = parseGroupIds(currentMessage.text);
  return (
    <>
      {inviteIds.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {inviteIds.map((id) => (
            <View key={id} style={{ marginTop: 4 }}>
              <InviteCard key={id} inviteId={id} />
            </View>
          ))}
        </View>
      )}
      {groupIds.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {groupIds.map((id) => (
            <View key={id} style={{ marginTop: 4 }}>
              <GroupCard key={id} groupId={id} />
            </View>
          ))}
        </View>
      )}
      {contactIds.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {contactIds.map((id) => (
            <View key={id} style={{ marginTop: 4 }}>
              <ContactCard key={id} contactId={id} />
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const Edited = ({ colors, currentMessage }: { colors: any, currentMessage: T.Message }) => {
  const { hasEdits } = usefulMessageProps(currentMessage);
  // Track if the message had been edited when it was first loaded
  // We only want to animate the edit if it was not already visible
  const [hadEdits, _setHadEdits] = useState(hasEdits);

  if (!hasEdits) return null;

  return (
    <Animated.View
      entering={!hadEdits ? FadeInUp.duration(250) : null}
      style={[styles.editedContainer]}
    >
      <Text style={[styles.editedText, { color: colors.strongGrey }]}>
        Edited
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hangingReactionsContainer: {
    position: 'absolute',
    bottom: -20,
    right: 2,
    zIndex: 100
  },
  editedBelowMediaContainer: {
    position: 'absolute',
    bottom: -20,
    left: 2,
    zIndex: 99, // Lower z-index than reactions
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  animatedReplyIcon: {
    position: "absolute",
    left: 8,
    top: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1,
  },
  positionRelative: { position: "relative" },
  // invertedMargin: { marginBottom: 2 },
  rightBorder: { borderColor: GatzColor.active, borderRightWidth: 4 },
  bottomBorder: { borderColor: GatzColor.active, borderBottomWidth: 1 },

  highlightedMessage: {
    borderColor: GatzColor.active,
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 4,
  },

  editedContainer: {
    // position: "absolute",
    // bottom: -16,
    // left: 2,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",

    zIndex: -1,
  },
  editedText: {
    fontSize: 12,
    zIndex: -1,
  },
  innerContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: 6,
    marginRight: 0,
  },
  avatarContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Platform.select({ ios: 4, default: 5 }),
    // This is the distnace that I am trying to get rid of?
    marginRight: 4,
    backgroundColor: "transparent",
  },
  inPostAvatarContainer: {
    zIndex: 5, // for the threadLine in DiscussionView
    marginTop: Platform.select({ ios: 5, default: 7 }),
  },
  replyPreviewOuterContainer: {
    marginLeft: 35,
    marginRight: 32,
    marginTop: 2,
    marginBottom: 2,
    // display: "flex",
    // flexDirection: "row",
  },
  mirror: { transform: [{ scaleX: -1 }] },
  inlineIconMargin: { marginRight: 2 },
  threadLine: {
    position: "absolute",
    top: 0,
    left: 9,
    width: 2,
    // backgroundColor: "red",
    zIndex: 2,
  },
  rightBorderAnimated: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GatzColor.active,
  },
});

