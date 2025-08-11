import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ActionSheetOptions,
  ActionSheetProvider,
  ActionSheetProviderRef,
} from "@expo/react-native-action-sheet";

import { useThemeColors } from "../hooks/useThemeColors";

import { Actions, ActionsProps } from "../Actions";
import { Composer, ComposerPropsFromChat } from "../Composer";
import {
  MIN_INPUT_TOOLBAR_HEIGHT,
  TEST_ID,
} from "../Constant";
import { Day } from "../Day";
import GiftedAvatar from "../GiftedAvatar";
import { GiftedChatContext } from "../GiftedChatContext";
import { InputToolbar, MessageDraft, InputToolbarProps } from "../InputToolbar";
import { LoadEarlier } from "../LoadEarlier";
import Message from "../Message";
import MessageContainer from "../MessageContainer";
import { LeftRightStyle } from "../Models";
import type { Contact } from "../../gatz/types";
import { SystemMessage, } from "../SystemMessage";
import * as utils from "../utils";
import { homeIndicatorHeight} from "../keyboardAdjustment";

import * as T from "../../gatz/types";
import { SessionContext } from "../../context/SessionProvider";
import { ClientContext } from "../../context/ClientProvider";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { ReplyDraftStore } from "../../gatz/store";
import { MessageActionProps } from "../Message";

type GiftedChatProps = MessageActionProps & {
  discussion: T.Discussion;
  draftReplyStore: ReplyDraftStore;
  // did: Discussion["id"];
  post?: T.Message;
  /* Messages to display */
  messages?: T.Message[];
  showLeftUsername?: boolean;
  /* Controls whether or not the message bubbles appear at the top of the chat */
  alignTop?: boolean;
  initialText?: string;
  /* User sending the messages: { id, name, avatar } */
  user: Contact;
  /*  Locale to localize the dates */
  locale?: string;
  /* Format to use for rendering times; default is 'LT' */
  timeFormat?: string;
  /* Format to use for rendering dates; default is 'll' */
  dateFormat?: string;
  /* Enables the "Load earlier messages" button */
  loadEarlier?: boolean;
  /*Display an ActivityIndicator when loading earlier messages*/
  isLoadingEarlier?: boolean;
  /* Whether to render an avatar for the current user; default is false, only show avatars for other users */
  showUserAvatar?: boolean;
  /* When false, avatars will only be displayed when a consecutive message is from the same user on the same day; default is false */
  showAvatarForEveryMessage?: boolean;
  /* Determine whether to handle keyboard awareness inside the plugin. If you have your own keyboard handling outside the plugin set this to false; default is true */
  renderAvatarOnTop?: boolean;
  inverted?: boolean;
  /* Extra props to be passed to the <Image> component created by the default renderMessageImage */
  imageProps?: Message["props"];
  /* Minimum height of the input toolbar; default is 44 */
  minInputToolbarHeight?: number;
  /*Determines whether the keyboard should stay visible after a tap; see <ScrollView> docs */
  keyboardShouldPersistTaps?: any;
  /*Max message composer TextInput length */
  maxInputLength?: number;
  /* Force getting keyboard height to fix some display issues */
  forceGetKeyboardHeight?: boolean;
  /* Force send button */
  alwaysShowSend?: boolean;
  /* Image style */
  imageStyle?: StyleProp<ViewStyle>;
  /* This can be used to pass any data which needs to be re-rendered */
  extraData?: any;
  options?: { [key: string]: any };
  /* infinite scroll up when reach the top of messages container, automatically call onLoadEarlier function if exist */
  infiniteScroll?: boolean;
  timeTextStyle?: LeftRightStyle<TextStyle>;
  /* Custom action sheet */
  actionSheet?(): {
    showActionSheetWithOptions: (
      options: ActionSheetOptions,
      callback: (i: number) => void,
    ) => void;
  };
  /* Callback when a message avatar is tapped */
  onPressAvatar?(userId: T.Contact["id"]): void;
  /* Callback when sending a message */
  onSend(message: MessageDraft): void;
  /*Callback when loading earlier messages*/
  onLoadEarlier?(): void;
  /* Callback when a message bubble is long-pressed; default is to show an ActionSheet with "Copy Text" (see example using showActionSheetWithOptions()) */
  onLongPress?(context: any, message: T.Message): void;
  /* Custom footer component on the ListView, e.g. 'User is typing...' */
  renderFooter?(): React.ReactNode;
  /* Custom action button on the left of the message composer */
  renderActions?(props: ActionsProps): React.ReactNode;
  /*Callback when the Action button is pressed (if set, the default actionSheet will not be used) */
  onPressActionButton?(): void;
  /* Custom parse patterns for react-native-parsed-text used to linking message content (like URLs and phone numbers) */
  parsePatterns?(linkStyle: TextStyle): any;
  shouldUpdateMessage?(
    props: Message["props"],
    nextProps: Message["props"],
  ): boolean;
  navigateToDiscussion?: (did: T.Discussion["id"]) => void;
  highlightedMessageId?: T.Message["id"];
  onArchive: (did: T.Discussion["id"]) => void;
}

export interface GiftedChatState {
  isInitialized: boolean;
  messagesContainerHeight?: number | Animated.Value;
  typingDisabled: boolean;
  messages?: T.Message[];
}

/**
 * Main chat interface component providing a complete messaging experience.
 * 
 * This component serves as the core of the Gifted Chat library, managing message display,
 * input handling, keyboard interactions, and overall chat UI state.
 * 
 * Key functionality and invariants:
 * - [keyboard-aware-layout] Dynamically adjusts message container height based on keyboard state
 * - [inverted-list-default] Defaults to inverted list view for standard chat UI behavior
 * - [message-ordering] Maintains proper message order with support for append/prepend operations
 * - [scroll-position-management] Handles auto-scrolling on new messages and manual scrolling
 * - [input-focus-persistence] Preserves text input focus state across keyboard show/hide cycles
 * - [platform-specific-keyboard] Different keyboard handling for iOS vs Android platforms
 * - [lazy-initialization] Delays rendering until layout dimensions are calculated
 * - [context-provision] Provides GiftedChatContext for child components
 * - [action-sheet-integration] Manages action sheet for message interactions
 * - [draft-reply-support] Integrates with reply draft store for message threading
 * 
 * State management invariants:
 * - [initialization-guard] isInitialized prevents rendering before layout calculation
 * - [height-calculation-order] maxHeight must be set before calculating container heights
 * - [keyboard-height-tracking] Maintains accurate keyboard height for iOS devices
 * - [typing-disabled-state] Temporarily disables input during keyboard transitions
 * 
 * Platform-specific behaviors:
 * - iOS: Keyboard height affects container, requires home indicator adjustment
 * - Android: Container auto-resizes, keyboard height ignored for layout
 * - Web: Special handling for last user message tracking
 * 
 * Component lifecycle:
 * 1. Initial render shows loading indicator
 * 2. onInitialLayoutViewLayout captures available height
 * 3. State updates with isInitialized=true
 * 4. Main chat UI renders with calculated dimensions
 * 5. Keyboard events dynamically adjust layout
 * 
 * @param props - Comprehensive chat configuration including messages, callbacks, and UI options
 * @returns Complete chat interface with message list and input toolbar
 */
function GiftedChat(props: GiftedChatProps) {
  const {
    user,
    onSend,
    messages = [],
    locale = "en",
    actionSheet = null,
    keyboardShouldPersistTaps = Platform.select({
      ios: "never",
      android: "always",
      default: "never",
    }),
    maxInputLength = null,
    forceGetKeyboardHeight = false,
    inverted = true, // [inverted-list-default]
  } = props;

  const { session: { userId } } = useContext(SessionContext);

  const did = props.discussion?.id;

  // const panHandlerRef = useRef(null);
  const messageContainerRef = useRef<FlatList<T.Message>>();
  const inputToolbarHeightRef = useRef<number>(MIN_INPUT_TOOLBAR_HEIGHT);
  const textInputRef = useRef<TextInput>();
  const isMountedRef = useRef(false);
  const keyboardHeightRef = useRef(0);
  const maxHeightRef = useRef<number | undefined>(undefined);
  const isFirstLayoutRef = useRef(true);
  const actionSheetRef = useRef<ActionSheetProviderRef>(null);

  let _isTextInputWasFocused: boolean = false;

  const [state, setState] = useState<GiftedChatState>({
    isInitialized: false, // initialization will calculate maxHeight before rendering the chat // [lazy-initialization]
    messagesContainerHeight: undefined,
    typingDisabled: false, // [typing-disabled-state]
  });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getKeyboardHeight = useCallback(() => {
    // [platform-specific-keyboard]
    if (Platform.OS === "android" && !forceGetKeyboardHeight) {
      // For android: on-screen keyboard resized main container and has own height.
      // @see https://developer.android.com/training/keyboard-input/visibility.html
      // So for calculate the messages container height ignore keyboard height.
      return 0;
    }

    return keyboardHeightRef.current; // [keyboard-height-tracking]
  }, [keyboardHeightRef, forceGetKeyboardHeight]);

  const getInputToolbarHeight = useCallback(() => {
    return inputToolbarHeightRef.current || MIN_INPUT_TOOLBAR_HEIGHT;
  }, [inputToolbarHeightRef]);

  /**
   * Returns the height, based on current window size, without taking the keyboard into account.
   */
  const getBasicMessagesContainerHeight = useCallback(() => {
    return maxHeightRef.current! - getInputToolbarHeight();
  }, [maxHeightRef, getInputToolbarHeight]);

  /**
   * Returns the height, based on current window size, taking the keyboard into account.
   */
  const getMessagesContainerHeightWithKeyboard = useCallback(() => {
    // [keyboard-aware-layout]
    return getBasicMessagesContainerHeight() - getKeyboardHeight();
  }, [getBasicMessagesContainerHeight, getKeyboardHeight]);

  /**
   * Store text input focus status when keyboard hide to retrieve
   * it after wards if needed.
   * `onKeyboardWillHide` may be called twice in sequence so we
   * make a guard condition (eg. showing image picker)
   */
  const handleTextInputFocusWhenKeyboardHide = useCallback(() => {
    // [input-focus-persistence]
    if (!_isTextInputWasFocused) {
      _isTextInputWasFocused = textInputRef.current?.isFocused() || false;
    }
  }, [textInputRef, _isTextInputWasFocused]);

  /**
   * Refocus the text input only if it was focused before showing keyboard.
   * This is needed in some cases (eg. showing image picker).
   */
  const handleTextInputFocusWhenKeyboardShow = useCallback(() => {
    // [input-focus-persistence]
    if (
      textInputRef.current &&
      _isTextInputWasFocused &&
      !textInputRef.current.isFocused()
    ) {
      textInputRef.current.focus();
    }

    // Reset the indicator since the keyboard is shown
    _isTextInputWasFocused = false;
  }, [textInputRef, _isTextInputWasFocused]);

  const onKeyboardWillShow = useCallback((e: any) => {
    handleTextInputFocusWhenKeyboardShow();

    // [keyboard-height-tracking]
    keyboardHeightRef.current = e.endCoordinates
      ? e.endCoordinates.height
      : e.end.height;

    // [platform-specific-keyboard]
    if (Platform.OS === "ios") {
      // Adjust keyboard height for iOS
      keyboardHeightRef.current = keyboardHeightRef.current - homeIndicatorHeight; // [keyboard-height-tracking]
    }

    setState((state) => ({
      ...state,
      typingDisabled: true, // [typing-disabled-state]
      messagesContainerHeight: getMessagesContainerHeightWithKeyboard(), // [keyboard-aware-layout]
    }));
  }, [setState, keyboardHeightRef, getMessagesContainerHeightWithKeyboard]);

  const onKeyboardWillHide = useCallback((_e: any) => {
    handleTextInputFocusWhenKeyboardHide();

    keyboardHeightRef.current = 0; // [keyboard-height-tracking]

    setState((state) => ({
      ...state,
      typingDisabled: true, // [typing-disabled-state]
      messagesContainerHeight: getBasicMessagesContainerHeight(), // [keyboard-aware-layout]
    }));
  }, [setState, keyboardHeightRef, getBasicMessagesContainerHeight]);

  const onKeyboardDidShow = useCallback((e: any) => {
    // [platform-specific-keyboard]
    if (Platform.OS === "android") {
      onKeyboardWillShow(e);
    }

    setState((state) => ({ ...state, typingDisabled: false, })); // [typing-disabled-state]
  }, [onKeyboardWillShow, setState]);

  const onKeyboardDidHide = useCallback((e: any) => {
    // [platform-specific-keyboard]
    if (Platform.OS === "android") {
      onKeyboardWillHide(e);
    }

    setState((state) => ({ ...state, typingDisabled: false, })); // [typing-disabled-state]
  }, [onKeyboardWillHide, setState]);

  const scrollToBottom = useCallback((animated = true) => {
    // [scroll-position-management]
    if (messageContainerRef?.current) {
      if (!inverted) {
        messageContainerRef.current.scrollToEnd({ animated });
      } else {
        messageContainerRef.current.scrollToOffset({ offset: 0, animated, }); // [inverted-list-default]
      }
    }
  }, [messageContainerRef, inverted]);

  // TODO: this is a problem when the user is viewing older messages
  // and a new message comes in, it will scroll them down to the bottom
  // Instead, this should only trigger when the user is at the bottom
  // already and a new message comes in or they send one

  // useEffect(() => {
  //   if (state.messages.length > 0) {
  //     // scrollToBottom(true);
  //   }
  // }, [state.messages.length]);
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);

  const focusTextInput = useCallback(
    () => textInputRef.current?.focus(),
    [textInputRef],
  );
  const onReplyTo = useCallback(
    (id: string) => {
      props.onReplyTo?.(id);
      focusTextInput();
    },
    [props.onReplyTo, focusTextInput],
  );
  const onEdit = useCallback(
    (id: string) => {
      props.onEdit?.(id);
      focusTextInput();
    },
    [props.onEdit, focusTextInput],
  );
  const onReactji = useCallback(
    (message: T.Message) => props.onReactji?.(message),
    [props.onReactji, focusTextInput],
  );

  const colors = useThemeColors();

  const renderMessages = () => {
    const { ...messagesContainerProps } = props;

    return (
      <KeyboardAvoidingView enabled>
        <View
          style={[
            typeof state.messagesContainerHeight === "number" && {
              height: state.messagesContainerHeight,
            },
          ]}
        >
          <MessageContainer
            {...messagesContainerProps}
            colors={colors}
            onPressAvatar={props.onPressAvatar}
            highlightedMessageId={props.highlightedMessageId}
            gatzClient={gatzClient}
            discussion={props.discussion}
            post={props.post}
            db={db}
            invertibleScrollViewProps={{
              inverted: inverted, // [inverted-list-default] [message-ordering]
              keyboardShouldPersistTaps: keyboardShouldPersistTaps,
              onKeyboardWillShow: onKeyboardWillShow,
              onKeyboardWillHide: onKeyboardWillHide,
              onKeyboardDidShow: onKeyboardDidShow,
              onKeyboardDidHide: onKeyboardDidHide,
            }}
            messageProps={{
              onSuggestedPost: props.onSuggestedPost,
              navigateToDiscussion: props.navigateToDiscussion,
            }}
            onArchive={props.onArchive}
            messages={messages}
            forwardRef={messageContainerRef}
            showScrollToBottom
            bubble={{ colors }}
            messageActionProps={{
              onDelete: props.onDelete,
              onReplyTo,
              onEdit,
              onReactji,
              onDisplayReactions: props.onDisplayReactions,
              onSuggestedPost: props.onSuggestedPost,
              onFlagMessage: props.onFlagMessage,
              onQuickReaction: props.onQuickReaction,
              messageRetryStatus: props.messageRetryStatus,
              onRetryMessage: props.onRetryMessage,
            }}
          />
        </View>
      </KeyboardAvoidingView>
    );
  };

  // add the media that is being loaded here
  const _onSend = (messageDraft: MessageDraft) => {
    if (false) {
      setState((state) => ({
        ...state,
        typingDisabled: true,
      }));

      resetInputToolbar();
    }

    onSend(messageDraft);

    if (!messageDraft.editingId) {
      scrollToBottom(); // [scroll-position-management]
    }

    // if (shouldResetInputToolbar === true) {
    //   setTimeout(() => {
    //     if (isMountedRef.current === true) {
    //       setState({
    //         ...state,
    //         typingDisabled: false,
    //       })
    //     }
    //   }, 100)
    // }
  };

  const resetInputToolbar = useCallback(() => {
    if (textInputRef.current) {
      textInputRef.current.clear();
    }

    const messagesContainerHeight = getMessagesContainerHeightWithKeyboard();
    setState({ ...state, messagesContainerHeight, });
  }, [state, getMessagesContainerHeightWithKeyboard, setState]);

  const onInputToolbarHeightChange = useCallback((inputToolbarHeight: number) => {
    inputToolbarHeightRef.current = inputToolbarHeight;

    const messagesContainerHeight = getMessagesContainerHeightWithKeyboard();
    setState({ ...state, messagesContainerHeight, });
  }, [state, getMessagesContainerHeightWithKeyboard, setState]);

  const onInitialLayoutViewLayout = useCallback((e: LayoutChangeEvent) => {
    const { layout } = e.nativeEvent;

    if (layout.height <= 0) {
      return;
    }

    maxHeightRef.current = layout.height; // [height-calculation-order]

    setState((state) => ({
      ...state,
      isInitialized: true, // [lazy-initialization]
      messagesContainerHeight: getMessagesContainerHeightWithKeyboard(),
    }));
  }, [state, getMessagesContainerHeightWithKeyboard, setState]);

  const onMainViewLayout = useCallback((e: LayoutChangeEvent) => {
    // TODO: fix an issue when keyboard is dismissing during the initialization
    const { layout } = e.nativeEvent;

    if (maxHeightRef.current !== layout.height || isFirstLayoutRef.current === true) {
      maxHeightRef.current = layout.height;

      setState((state) => ({
        ...state,
        messagesContainerHeight:
          keyboardHeightRef.current > 0
            ? getMessagesContainerHeightWithKeyboard()
            : getBasicMessagesContainerHeight(),
      }));
    }

    if (isFirstLayoutRef.current === true) {
      isFirstLayoutRef.current = false;
    }
  }, [state, getMessagesContainerHeightWithKeyboard, setState]);

  const renderInputToolbar = useCallback(() => {
    let lastUserMessageId: T.Message["id"] | null = null;
    if (Platform.OS === "web") {
      const reversedMessages = messages.slice().reverse();
      for (const m of reversedMessages) {
        if (m.user_id === userId) {
          lastUserMessageId = m.id;
          break;
        }
      }
    }

    const inputToolbarProps: InputToolbarProps & ComposerPropsFromChat = {
      ...props,
      did: did,
      onSend: _onSend,
      onInputToolbarHeightChange,
      onEdit,
      lastUserMessageId,
      textInputProps: {
        ref: textInputRef,
        maxLength: state.typingDisabled ? 0 : maxInputLength,
      },
      inputToolbarHeightRef,
      gatzClient,
      draftReplyStore: props.draftReplyStore, // [draft-reply-support]
    };

    return <InputToolbar {...inputToolbarProps} />;
  }, [props, did, onSend, onInputToolbarHeightChange, onEdit, textInputRef, state, resetInputToolbar]);

  const contextValues = useMemo(() => {
    return {
      actionSheet: actionSheet || (() => actionSheetRef.current?.getContext()!), // [action-sheet-integration]
      getLocale: () => locale,
    };
  }, [actionSheet, locale]);

  // [initialization-guard] [lazy-initialization]
  if (state.isInitialized) {
    return (
      // [context-provision]
      <GiftedChatContext.Provider value={contextValues}>
        <View testID={TEST_ID.GIFTED_CHAT_WRAPPER} style={styles.wrapper}>
          <GestureHandlerRootView style={styles.container}>
            <ActionSheetProvider ref={actionSheetRef}>
              <View style={styles.container} onLayout={onMainViewLayout}>
                {renderMessages()}
                {renderInputToolbar()}
              </View>
            </ActionSheetProvider>
          </GestureHandlerRootView>
        </View>
      </GiftedChatContext.Provider>
    );
  } else {
    return (
      <View
        testID={TEST_ID.GIFTED_CHAT_LOADING_WRAPPER}
        style={styles.container}
        onLayout={onInitialLayoutViewLayout}
      >
        <ActivityIndicator style={{ marginTop: 30 }} />
      </View>
    );
  }
}

GiftedChat.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object),
  initialText: PropTypes.string,
  user: PropTypes.object,
  onSend: PropTypes.func,
  locale: PropTypes.string,
  timeFormat: PropTypes.string,
  dateFormat: PropTypes.string,
  loadEarlier: PropTypes.bool,
  onLoadEarlier: PropTypes.func,
  isLoadingEarlier: PropTypes.bool,
  showUserAvatar: PropTypes.bool,
  actionSheet: PropTypes.func,
  onPressAvatar: PropTypes.func,
  onLongPressAvatar: PropTypes.func,
  renderUsernameOnMessage: PropTypes.bool,
  renderAvatarOnTop: PropTypes.bool,
  onLongPress: PropTypes.func,
  imageProps: PropTypes.object,
  videoProps: PropTypes.object,
  audioProps: PropTypes.object,
  renderFooter: PropTypes.func,
  renderComposer: PropTypes.func,
  renderActions: PropTypes.func,
  onPressActionButton: PropTypes.func,
  minInputToolbarHeight: PropTypes.number,
  keyboardShouldPersistTaps: PropTypes.oneOf(["always", "never", "handled"]),
  maxInputLength: PropTypes.number,
  forceGetKeyboardHeight: PropTypes.bool,
  inverted: PropTypes.bool,
  textInputProps: PropTypes.object,
  extraData: PropTypes.object,
  alignTop: PropTypes.bool,
  onDelete: PropTypes.func,
};

/**
 * Appends new messages to the existing message array with inversion handling.
 * 
 * This utility function manages message concatenation for the GiftedChat component,
 * supporting both standard and inverted message orders commonly used in chat UIs.
 * 
 * Key functionality and invariants:
 * - [array-normalization] Converts single message objects to arrays for consistent handling
 * - [inverted-append-order] When inverted=true, new messages go before current messages
 * - [standard-append-order] When inverted=false, new messages go after current messages
 * - [immutable-operation] Creates a new array rather than modifying existing arrays
 * - [empty-array-handling] Handles empty currentMessages gracefully with default []
 * - [type-consistency] Always returns T.Message[] regardless of input format
 * 
 * The inverted parameter controls message ordering:
 * - true (default): Used for typical chat UI where newest messages appear at bottom
 *   and the list is inverted. New messages are prepended to maintain visual order.
 * - false: Used for non-inverted lists where newest messages appear at top.
 *   New messages are appended normally.
 * 
 * This pattern supports:
 * - Real-time message addition without full list re-renders
 * - Consistent message ordering regardless of UI inversion
 * - Batch message additions (multiple messages at once)
 * - Single message additions (automatically converted to array)
 * 
 * @param currentMessages - Existing messages array (defaults to empty array)
 * @param messages - New message(s) to append (single or array)
 * @param inverted - Whether the chat display is inverted (default true)
 * @returns Combined message array with proper ordering based on inversion
 */
GiftedChat.append = (
  currentMessages: T.Message[] = [], // [empty-array-handling]
  messages: T.Message[],
  inverted = true, // [inverted-list-default]
) => {
  // [array-normalization] [type-consistency]
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  return inverted
    ? messages.concat(currentMessages) // [inverted-append-order] [immutable-operation]
    : currentMessages.concat(messages); // [standard-append-order] [immutable-operation]
};

/**
 * Prepends new messages to the existing message array with inversion handling.
 * 
 * This utility function manages message concatenation for loading earlier messages,
 * supporting both standard and inverted message orders commonly used in chat UIs.
 * 
 * Key functionality and invariants:
 * - [array-normalization] Converts single message objects to arrays for consistent handling
 * - [inverted-prepend-order] When inverted=true, older messages go after current messages
 * - [standard-prepend-order] When inverted=false, older messages go before current messages
 * - [immutable-operation] Creates a new array rather than modifying existing arrays
 * - [empty-array-handling] Handles empty currentMessages gracefully with default []
 * - [type-consistency] Always returns T.Message[] regardless of input format
 * - [load-earlier-support] Designed for "load earlier messages" functionality
 * 
 * The inverted parameter controls message ordering:
 * - true (default): Used for typical chat UI where the list is inverted.
 *   Older messages are appended to maintain correct visual order when scrolling up.
 * - false: Used for non-inverted lists. Older messages are prepended normally.
 * 
 * This pattern supports:
 * - Infinite scroll/pagination by loading older messages
 * - Maintaining scroll position when loading history
 * - Batch historical message loading
 * - Single historical message additions (automatically converted to array)
 * 
 * Note the intentional opposite behavior compared to append:
 * - append with inverted=true: new messages before current (visual bottom)
 * - prepend with inverted=true: old messages after current (visual top)
 * 
 * @param currentMessages - Existing messages array (defaults to empty array)
 * @param messages - Historical message(s) to prepend (single or array)
 * @param inverted - Whether the chat display is inverted (default true)
 * @returns Combined message array with proper ordering for historical messages
 */
GiftedChat.prepend = (
  currentMessages: T.Message[] = [], // [empty-array-handling]
  messages: T.Message[],
  inverted = true, // [inverted-list-default]
) => {
  // [array-normalization] [type-consistency]
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  // [load-earlier-support]
  return inverted
    ? currentMessages.concat(messages) // [inverted-prepend-order] [immutable-operation]
    : messages.concat(currentMessages); // [standard-prepend-order] [immutable-operation]
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: { flex: 1 },
});

export { LeftRightStyle } from "../Models";
export {
  GiftedChat,
  Actions,
  SystemMessage,
  Composer,
  Day,
  LoadEarlier,
  Message,
  MessageContainer,
  GiftedAvatar,
  utils,
};
