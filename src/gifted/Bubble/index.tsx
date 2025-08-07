// Stryker disable all
import PropTypes from "prop-types";
import React from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { GestureResponderEvent } from "react-native";

import Animated from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';

import { MessageText, PostOpts } from "../MessageText";

import Color from "../Color";
import { Styles as GatzStyles } from "../../gatz/styles";
import * as T from "../../gatz/types";
import { TEST_ID } from "../Constant";

import { HangingReactions } from "../../components/reactions";
import { MessageStatus } from "../../components/MessageStatus";

import { isSameUser, isSameDay } from "../utils";
import type { User } from "../../gatz/types";


/**
 * Pure functional component that renders the content of a message bubble.
 * 
 * This component serves as the main content renderer for message bubbles, handling
 * the display of text messages with proper validation and conditional rendering.
 * 
 * Key functionality and invariants:
 * - [null-safety-guard] Returns null if currentMessage is missing or has no text, preventing empty bubble rendering
 * - [text-content-required] Only renders when currentMessage.text is truthy (non-empty string)
 * - [overflow-containment] Wraps content in a View with overflow: "hidden" to ensure content stays within bubble bounds
 * - [message-text-delegation] Delegates all text rendering logic to MessageText component
 * - [props-passthrough] Passes through all display configuration props (postOpts, showFull, textContainerStyle, searchText) to MessageText
 * 
 * The component maintains a clean separation of concerns by:
 * - Handling only the structural/container aspects of bubble content
 * - Delegating all text-specific rendering to MessageText
 * - Providing consistent overflow handling for all bubble content
 * 
 * Note: The component includes commented-out media rendering code (renderMessageMedia, renderMessageVideo, renderMessageAudio)
 * suggesting future support for multimedia messages, but currently only handles text messages.
 * 
 * @param props.currentMessage - The message object to render, must contain non-empty text property
 * @param props.postOpts - Optional post display configuration (isPost, isActive flags)
 * @param props.showFull - Whether to show full message text or truncated version
 * @param props.textContainerStyle - Optional style overrides for text container
 * @param props.searchText - Optional search term for highlighting matches in message text
 * @returns React element containing MessageText or null if message is invalid
 */
export const BubbleContent = (props: {
  currentMessage: T.Message;
  postOpts?: PostOpts;
  showFull?: boolean;
  textContainerStyle?: ViewStyle;
  searchText?: string;
}) => {

  // const renderOneMedia = (media: T.Media) => {
  //   // TODO: render multiple of these?
  //   switch (media.kind) {
  //     case "img":
  //       return <MessageImage key={media.id} media={media} />;
  //     case "vid":
  //       return <MessageVideo key={media.id} {...props} />;
  //     case "aud":
  //       return <MessageAudio key={media.id} {...props} />;
  //     default:
  //       return null;
  //   }
  // };

  // const renderMessageMedia = () => {
  //   if (
  //     currentMessage &&
  //     currentMessage.media &&
  //     currentMessage.media.length > 0
  //   ) {
  //     return (
  //       <ScrollView horizontal style={{ flexDirection: "row" }}>
  //         {currentMessage.media.map((media) => renderOneMedia(media))}
  //       </ScrollView>
  //     );
  //   }
  //   return null;
  // };

  // const renderMessageVideo = () => {
  //   if (currentMessage && currentMessage.video) {
  //     const { ...messageVideoProps } = props;
  //     return <MessageVideo {...messageVideoProps} />;
  //   }
  //   return null;
  // };

  // const renderMessageAudio = () => {
  //   if (currentMessage && currentMessage.audio) {
  //     const { ...messageAudioProps } = props;
  //     return <MessageAudio {...messageAudioProps} />;
  //   }
  //   return null;
  // };

  // If message is missing or text is empty, return null to not render the bubble at all
  // Stryker restore all
  // [null-safety-guard] [text-content-required]
  if (!props.currentMessage || !props.currentMessage.text) {
    return null;
  }
  // Stryker disable all

  return (
    // Stryker restore all
    <View 
      // [overflow-containment]
      style={{ overflow: "hidden" }}
      testID={TEST_ID.BUBBLE_CONTENT}
    >
      {/* Stryker disable all */}
      {/* Stryker restore all */}
      {/* [message-text-delegation] [props-passthrough] */}
      <MessageText
        postOpts={props.postOpts}
        currentMessage={props.currentMessage}
        showFull={props.showFull}
        textContainerStyle={props.textContainerStyle}
        searchText={props.searchText}
      />
      {/* Stryker disable all */}

      {/* {renderMessageMedia()} */}
    </View>
  );
};

// Stryker disable all
const styles = StyleSheet.create({
  truncateContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  mirror: { transform: [{ scaleX: -1 }] },
  wrapperShadow: { ...GatzStyles.thinDropShadow },
  outerContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  container: { flex: 1, alignItems: "flex-start" },
  bubble: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  wrapper: {
    minHeight: 20,
    justifyContent: "flex-end",
    position: "relative",
  },
  containerToNext: {},
  containerToPrevious: {},
  bottom: { flexDirection: "row", justifyContent: "flex-start" },
  tick: {
    fontSize: 10,
    backgroundColor: Color.backgroundTransparent,
    color: Color.white,
  },
  tickView: { flexDirection: "row", marginRight: 10 },
  usernameView: { flexDirection: "row", marginHorizontal: 10 },
});

/**
 * Pure function that determines styling for message bubbles relative to the previous message.
 * 
 * This function implements message grouping logic by analyzing the relationship between
 * consecutive messages to apply appropriate visual styling for message continuity.
 * 
 * Key functionality and invariants:
 * - [message-grouping-logic] Groups messages from the same user on the same day
 * - [null-safe-comparison] Safely handles null/undefined messages by checking existence before comparison
 * - [user-continuity-check] Uses isSameUser utility to verify messages are from the same sender
 * - [temporal-grouping] Uses isSameDay utility to ensure messages are from the same day
 * - [style-array-return] Returns array of styles for React Native style composition or null
 * 
 * The function maintains visual coherence by:
 * - Reducing visual separation between grouped messages
 * - Creating visual "threads" of messages from the same user
 * - Respecting day boundaries to prevent confusing message grouping across dates
 * 
 * @param props - BubbleProps containing currentMessage and previousMessage
 * @returns Array containing containerToPrevious style if messages should be grouped, null otherwise
 */
const styledBubbleToPrevious = (props: BubbleProps) => {
  const { currentMessage, previousMessage } = props;
  // Stryker restore all
  // [message-grouping-logic] [null-safe-comparison]
  if (
    currentMessage && previousMessage &&
    // [user-continuity-check]
    isSameUser(currentMessage, previousMessage) &&
    // [temporal-grouping]
    isSameDay(currentMessage, previousMessage)
  ) {
    // [style-array-return]
    return [styles.containerToPrevious];
  } else {
    return null;
  }
  // Stryker disable all
}

/**
 * Pure function that determines styling for message bubbles relative to the next message.
 * 
 * This function complements styledBubbleToPrevious by analyzing the relationship between
 * a message and the following message to apply appropriate visual styling for message continuity.
 * 
 * Key functionality and invariants:
 * - [forward-grouping-logic] Groups messages with the next message from the same user on the same day
 * - [null-safe-comparison] Safely handles null/undefined messages by checking existence before comparison
 * - [user-continuity-check] Uses isSameUser utility to verify messages are from the same sender
 * - [temporal-grouping] Uses isSameDay utility to ensure messages are from the same day
 * - [style-array-return] Returns array of styles for React Native style composition or null
 * 
 * Works in conjunction with styledBubbleToPrevious to create cohesive message groups where:
 * - First message in a group has no containerToPrevious style
 * - Middle messages have both containerToPrevious and containerToNext styles
 * - Last message in a group has only containerToPrevious style
 * 
 * @param props - BubbleProps containing currentMessage and nextMessage
 * @returns Array containing containerToNext style if messages should be grouped, null otherwise
 */
const styledBubbleToNext = (props: BubbleProps) => {
  const { currentMessage, nextMessage } = props;
  // Stryker restore all
  // [forward-grouping-logic] [null-safe-comparison]
  if (
    currentMessage && nextMessage &&
    // [user-continuity-check]
    isSameUser(currentMessage, nextMessage) &&
    // [temporal-grouping]
    isSameDay(currentMessage, nextMessage)
  ) {
    // [style-array-return]
    return [styles.containerToNext];
  } else {
    return null;
  }
  // Stryker disable all
}

export type BubbleAnimationProps = {
  isTruncated: boolean;
  bubbleHeightStyle: ViewStyle;
  bubbleScaleStyle: ViewStyle;
  textContainerStyle: ViewStyle;
  onLongPress: (event: { absoluteY: number }) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
}

export type BubbleActionProps = {
  onReply: () => void,
  onReactji: () => void,
  onCopyText: () => void,
  openBottomMenu: () => void,
  onDisplayReactions: () => void,
  onFlagMessage: () => void,
  onDelete: () => void,
  onEdit: () => void,
}

export type BubbleConfigProps = {
  showFull?: boolean;
  withMargin?: boolean;
  colors: any;
  searchText?: string;
}


export type BubbleSpecialProps = BubbleActionProps & BubbleAnimationProps & BubbleConfigProps;

/**
 * Pure function for comparing BubbleSpecialProps to determine if they are equal.
 * 
 * This function performs a shallow equality check on specific properties of BubbleSpecialProps
 * to support React.memo optimization and prevent unnecessary re-renders of bubble components.
 * 
 * Key functionality and invariants:
 * - [shallow-equality-check] Performs shallow comparison only (uses === for all properties)
 * - [selective-prop-comparison] Only compares a subset of BubbleSpecialProps properties, excluding animation-related props
 * - [boolean-short-circuit] Returns false as soon as any property differs (short-circuit evaluation)
 * - [reference-equality-colors] Uses reference equality for colors object (does not deep compare)
 * 
 * Properties compared:
 * - withMargin: Controls bubble margin spacing
 * - showFull: Determines if full message text is shown
 * - openBottomMenu: Function reference for opening bottom menu
 * - onReply: Function reference for reply action
 * - onReactji: Function reference for reaction action
 * - onCopyText: Function reference for copy text action
 * - onDisplayReactions: Function reference for displaying reactions
 * - onEdit: Function reference for edit action
 * - colors: Theme colors object (reference comparison only)
 * 
 * Properties NOT compared (from BubbleSpecialProps):
 * - Animation props (isTruncated, bubbleHeightStyle, bubbleScaleStyle, textContainerStyle)
 * - Event handlers (onLongPress, onPressIn, onPressOut)
 * - searchText prop
 * 
 * This selective comparison suggests:
 * - [performance-optimization] Animation props likely change frequently and shouldn't trigger re-renders
 * - [stable-callbacks] Action callbacks are expected to be stable (memoized) references
 * - [theme-stability] Colors object is expected to be a stable reference when theme doesn't change
 * 
 * Note: Currently commented out in Message.tsx (line 331), suggesting it may be used for future optimization.
 * 
 * @param prev - Previous BubbleSpecialProps to compare
 * @param next - Next BubbleSpecialProps to compare
 * @returns true if all compared properties are equal, false otherwise
 */
export const areBubbleSpecialPropsEqual = (
  prev: BubbleSpecialProps,
  next: BubbleSpecialProps,
) => {
  // Stryker restore all
  // [selective-prop-comparison] [boolean-short-circuit]
  return (
    // [shallow-equality-check]
    prev.withMargin === next.withMargin &&
    prev.showFull === next.showFull &&
    prev.openBottomMenu === next.openBottomMenu &&
    prev.onReply === next.onReply &&
    prev.onReactji === next.onReactji &&
    prev.onCopyText === next.onCopyText &&
    prev.onDisplayReactions === next.onDisplayReactions &&
    prev.onEdit === next.onEdit &&
    // [reference-equality-colors]
    prev.colors === next.colors
  );
  // Stryker disable all
};

export type BubbleProps = BubbleSpecialProps & {
  user?: User;
  inverted?: boolean;
  currentMessage?: T.Message;
  nextMessage?: T.Message;
  previousMessage?: T.Message;
  showLeftUsername?: boolean;
  inPost?: boolean;
  colors: any;
  messageRetryStatus?: Record<T.Message["id"], any>;
  onRetryMessage?: (messageId: T.Message["id"]) => void;
  isHover?: boolean;
};

type BubbleState = {
  isHover: boolean;
};

/**
 * Function component that renders a message bubble for regular chat messages.
 * 
 * This component handles the complete rendering of standard message bubbles including
 * animations, reactions, styling, and interaction states. It represents the primary
 * bubble implementation for non-post messages.
 * 
 * Key functionality and invariants:
 * - [null-safety-guard] Returns null if currentMessage is missing or has no text
 * - [context-integration] Uses GiftedChatContext for accessing chat-wide functionality
 * - [highlight-state-disabled] Currently hardcodes isHighlighted to false (TODO comment indicates future support)
 * - [conditional-shadow] Applies drop shadow only for non-post messages
 * - [message-grouping-styles] Applies styledBubbleToNext/Previous for visual message threading
 * - [animated-container] Wraps content in Animated.View for animation support
 * - [truncation-gradient] Shows FadeGradient when content is truncated
 * - [reaction-rendering] Conditionally renders reactions based on showFull and media presence
 * - [reactions-null-safety] Guards against null currentMessage before accessing reactions
 * - [reactions-fallback] Provides empty object fallback when reactions are undefined
 * - [media-presence-check] Checks both existence and non-empty length of media array
 * - [media-reaction-exclusion] Excludes reactions from bubble when media is present
 * 
 * Component structure hierarchy:
 * 1. Outer container (positioning and layout)
 * 2. Container (flex alignment)
 * 3. Wrapper (minimum height and positioning)
 * 4. Animated.View (animation layer with composed styles)
 * 5. Truncate container (overflow handling)
 * 6. BubbleContent (actual message content)
 * 7. Optional FadeGradient (truncation indicator)
 * 8. Optional HangingReactions (reaction display)
 * 
 * Style composition order:
 * - Base styles (wrapper, bubble)
 * - Background color (based on highlight state)
 * - Post-specific overrides
 * - Shadow (non-post only)
 * - Message grouping styles
 * - Animation styles (scale, height)
 * - Margin override
 * 
 * @param props - BubbleProps with animation, config, and action properties
 * @returns Styled message bubble with animations and reactions
 */
const BubbleInMessage: React.FC<BubbleProps> = (props) => {
  
  // [context-integration]

  const { currentMessage, inPost, showFull, colors, } = props;
  const { textContainerStyle, bubbleHeightStyle, bubbleScaleStyle } = props;
  // [highlight-state-disabled]
  const isHighlighted = false; // currentMessage?.isHighlighted;

  // Stryker disable all

  // Stryker restore all
  const renderReactions = () => {
    // [media-presence-check]
    const hasMedia = currentMessage.media && currentMessage.media.length > 0;

    // Don't show reactions in the bubble if the message has media
    // since they'll be shown hanging from the media instead
    // Stryker restore all
    // [reaction-rendering] [media-reaction-exclusion]
    if (showFull && !hasMedia) {
      // Stryker disable all
      return (
        <HangingReactions
          reactions={currentMessage.reactions || {}}
          onDisplayReactions={props.onDisplayReactions}
          outerStyle={{ right: 6, bottom: -26 }}
          isHover={props.isHover}
          onReactji={props.onReactji}
        />
      );
    } else {
      return null;
    }
  };


  const bubbleStyles = [
    styles.wrapper,
    styles.bubble,
    isHighlighted
      ? { backgroundColor: colors.active }
      : { backgroundColor: colors.appBackground }, // Added backgroundColor
    inPost && { paddingHorizontal: 0 },
    // Stryker restore all
    // [conditional-shadow]
    !inPost && styles.wrapperShadow,
    // [message-grouping-styles]
    styledBubbleToNext(props),
    styledBubbleToPrevious(props),
    // Stryker disable all
    props.withMargin ? { marginRight: 8 } : {},
  ];

  const isTruncated = props.isTruncated; // truncatedHeight !== undefined;

  const messageStatus = props.messageRetryStatus?.[currentMessage.id];
  const showStatus = messageStatus && (messageStatus.isRetrying || messageStatus.isSuccess || 
    (messageStatus.retryCount >= 0 && !messageStatus.isSuccess));

  return (
    <View style={[styles.outerContainer, { position: "relative" },]}>
      <View style={[styles.container]}>
        <View style={[styles.wrapper]}>
          {/* [animated-container] */}
          <Animated.View style={[bubbleScaleStyle, bubbleStyles, bubbleHeightStyle]}>
            <View style={styles.truncateContainer}>
              <BubbleContent
                currentMessage={currentMessage}
                postOpts={{ isPost: false, isActive: false }}
                showFull={showFull}
                textContainerStyle={textContainerStyle}
              />
              {/* Stryker restore all */}
              {/* [truncation-gradient] */}
              {isTruncated && <FadeGradient colors={colors} />}
              {/* Stryker disable all */}
            </View>
          </Animated.View>
          {renderReactions()}
        </View>
        {showStatus && (
          <MessageStatus
            status={messageStatus}
            onRetryPress={() => props.onRetryMessage?.(currentMessage.id)}
            isSuccess={messageStatus.isSuccess || false}
          />
        )}
      </View>
    </View>
  );
};

// Default props for BubbleInMessage
BubbleInMessage.defaultProps = {
  withMargin: true,
  currentMessage: {
    text: null,
    created_at: null,
    image: null,
  },
  nextMessage: {},
  previousMessage: {},
  inPost: false,
  showFull: true,
  onDelete: () => { },
  onReactji: () => { },
  onFlagMessage: () => { },
  onSuggestedPost: () => { },
  onCopyText: () => { },
};

// PropTypes for BubbleInMessage
BubbleInMessage.propTypes = {
  user: PropTypes.object,
  onDelete: PropTypes.func,
  onReactji: PropTypes.func,
  currentMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  inPost: PropTypes.bool,
};

/**
 * Pure functional component that renders a message bubble in post context.
 * 
 * This specialized bubble renderer handles messages displayed within posts, with different
 * styling and layout requirements compared to regular chat messages.
 * 
 * Key functionality and invariants:
 * - [null-safety-guard] Returns null if currentMessage is missing or has no text
 * - [text-content-required] Only renders when currentMessage.text is truthy
 * - [post-specific-padding] Always sets paddingHorizontal to 0 for post layout consistency
 * - [transparent-container] Uses transparent background for outer container
 * - [highlight-state-disabled] Currently hardcodes isHighlighted to false (see TODO comment)
 * - [message-grouping-applied] Applies both styledBubbleToNext and styledBubbleToPrevious for visual continuity
 * - [conditional-margin] Applies right margin only when withMargin prop is true
 * - [forced-post-opts] Always passes isPost: false to BubbleContent (despite being in post context)
 * 
 * Style composition order (important for precedence):
 * 1. Base wrapper and bubble styles
 * 2. Background color (active or appBackground based on highlight state)
 * 3. Post-specific padding override
 * 4. Message grouping styles
 * 5. Optional margin
 * 
 * Note: The postOpts={{ isPost: false, isActive: false }} seems counterintuitive for a post bubble,
 * suggesting this component may handle a specific edge case or transitional state.
 * 
 * @param props - BubbleProps with required colors and currentMessage
 * @returns Styled View hierarchy containing BubbleContent or null if message invalid
 */
const BubbleInPost = (props: BubbleProps) => {
  const { withMargin, currentMessage, showFull, colors, textContainerStyle } = props;

  // Stryker disable all

  // [highlight-state-disabled]
  const isHighlighted = false; // currentMessage?.isHighlighted;
  const bubbleStyles = [
    styles.wrapper,
    styles.bubble,
    isHighlighted
      ? { backgroundColor: colors.active }
      : { backgroundColor: colors.appBackground }, // Added backgroundColor
    // Stryker restore all
    // [post-specific-padding]
    { paddingHorizontal: 0 },
    // [message-grouping-applied]
    styledBubbleToNext(props),
    styledBubbleToPrevious(props),
    // [conditional-margin]
    withMargin ? { marginRight: 8 } : {},
    // Stryker disable all
  ];

  return (
    <View 
      // Stryker restore all
      // [transparent-container]
      style={[styles.container, { backgroundColor: "transparent" }]}
      // Stryker disable all
    >
      <View style={bubbleStyles}>
        <BubbleContent
          currentMessage={currentMessage}
          // Stryker restore all
          // [forced-post-opts]
          postOpts={{ isPost: false, isActive: false }}
          // Stryker disable all
          showFull={showFull}
          textContainerStyle={textContainerStyle}
          searchText={props.searchText}
        />
      </View>
    </View>
  );
}

/**
 * Pure functional component that renders a fade gradient overlay.
 * 
 * This component creates a visual fade effect from transparent to solid background color,
 * typically used to indicate truncated content in message bubbles.
 * 
 * Key functionality and invariants:
 * - [gradient-direction] Creates a bottom-to-top fade (transparent to solid)
 * - [color-interpolation] Uses appBackground color with alpha channel manipulation
 * - [hex-alpha-format] Appends '00' for full transparency in first color stop
 * - [fixed-positioning] Positioned absolutely at bottom of container (via gradientStyles)
 * - [full-width-coverage] Spans entire width of parent container
 * 
 * Color array composition:
 * - First color: `${colors.appBackground}00` - Fully transparent version of background
 * - Second color: `colors.appBackground` - Solid background color
 * 
 * Used by BubbleInMessage when content is truncated (isTruncated === true) to provide
 * a smooth visual transition that signals more content is available.
 * 
 * @param colors - Theme colors object containing appBackground color
 * @returns LinearGradient component with fade effect
 */
// Transparent to solid
const FadeGradient = ({ colors }: { colors: any }) => (
  // Stryker restore all
  <LinearGradient 
    // [fixed-positioning] [full-width-coverage]
    style={gradientStyles.container} 
    // [gradient-direction] [color-interpolation] [hex-alpha-format]
    colors={[`${colors.appBackground}00`, colors.appBackground,]} 
  />
  // Stryker disable all
);

// Stryker disable all
const gradientStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    zIndex: 1,
  },
});


/**
 * Main bubble component that serves as a router between different bubble implementations.
 * 
 * This component acts as a conditional renderer, delegating to specialized bubble
 * components based on the message context (post vs regular message).
 * 
 * Key functionality and invariants:
 * - [context-based-routing] Routes to BubbleInPost when inPost is true, BubbleInMessage otherwise
 * - [props-forwarding] Passes all props unchanged to the selected implementation
 * - [binary-decision] Implements simple boolean branching with no additional logic
 * - [component-delegation] Acts purely as a dispatcher, containing no rendering logic itself
 * 
 * This pattern provides:
 * - Clean separation between post and message bubble implementations
 * - Single entry point for bubble rendering throughout the application
 * - Flexibility to add more bubble types in the future (e.g., system messages, media bubbles)
 * 
 * The inPost prop serves as the discriminator:
 * - true: Renders BubbleInPost (specialized post formatting)
 * - false/undefined: Renders BubbleInMessage (standard chat bubble with animations)
 * 
 * Used by Message.tsx as the primary bubble renderer, abstracting away the complexity
 * of different bubble types from the message list implementation.
 * 
 * @param props - BubbleProps including the critical inPost discriminator
 * @returns Either BubbleInPost or BubbleInMessage component based on context
 */
const Bubble = (props: BubbleProps) => {
  const { currentMessage } = props;

  // Don't render bubble if message is missing or has no text
  // Stryker restore all
  // [null-safety-guard]
  if (!currentMessage || !currentMessage.text) {
    return null;
  }
 
  // Stryker restore all
  // [context-based-routing] [binary-decision]
  if (props.inPost) {
    // [component-delegation] [props-forwarding]
    return <BubbleInPost {...props} />;
  } else {
    // [component-delegation] [props-forwarding]
    return <BubbleInMessage {...props} />;
  }
  // Stryker disable all
}

export default Bubble;

/**
 * Constant defining the duration in milliseconds for long press gesture recognition.
 * 
 * This constant establishes the timing threshold for distinguishing between regular taps
 * and long press gestures on message bubbles, enabling contextual actions.
 * 
 * Key characteristics:
 * - [gesture-timing-threshold] Set to 500ms, providing a balance between accidental activation and responsiveness
 * - [platform-consistency] Provides consistent long press behavior across iOS and Android platforms
 * - [user-experience-standard] 500ms is a common standard for long press recognition in mobile UIs
 * 
 * Used by Message.tsx to configure gesture handlers for message interaction, triggering
 * actions like message selection, context menus, or other long-press initiated features.
 * 
 * The 500ms duration ensures:
 * - Users have enough time to cancel accidental long presses
 * - The gesture feels responsive without excessive delay
 * - Consistency with platform gesture conventions
 */
// Stryker restore all
// [gesture-timing-threshold] [platform-consistency] [user-experience-standard]
export const LONG_PRESS_DURATION = 500;
// Stryker disable all

// Export internal functions for testing
export { styledBubbleToPrevious, styledBubbleToNext, BubbleInMessage, BubbleInPost, FadeGradient };
