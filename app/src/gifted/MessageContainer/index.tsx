import PropTypes from "prop-types";
import React, { RefObject, useContext } from "react";

import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { LoadEarlier } from "../LoadEarlier";
import Message, { SwipeMessage, PropsForBubble, MessageActionProps } from "../Message";
import Color from "../Color";
import type { User } from "../../gatz/types";

import * as T from "../../gatz/types";

import { warning } from "../logging";

import { Post } from "../Post";
import { GatzClient } from "../../gatz/client";
import { flattenReactions } from "../../components/reactions";
import { useThemeColors } from "../hooks/useThemeColors";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { FrontendDB } from "../../context/FrontendDB";

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerAlignTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  contentContainerStyle: { flexGrow: 1, justifyContent: "flex-start" },
  emptyChatContainer: {
    flex: 1,
    transform: [{ scaleY: -1 }],
  },
  headerWrapper: { flex: 1, marginBottom: 12 },
  listStyle: { flex: 1 },
  scrollToBottomStyle: {
    opacity: 0.8,
    position: "absolute",
    right: 10,
    bottom: 30,
    zIndex: 999,
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Color.black,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 1,
  },
});

/**
 * Props interface for the MessageContainer component hierarchy.
 * 
 * This interface defines the complete contract for rendering message lists in the app,
 * supporting both regular chat messages and post-based discussions.
 * 
 * Key functionality and invariants:
 * - [message-ordering] Messages array expected in chronological order, displayed inverted by default
 * - [highlight-support] Supports highlighting specific messages via highlightedMessageId
 * - [scroll-control] Provides fine-grained scroll behavior control through multiple props
 * - [context-awareness] Distinguishes between post discussions and regular chats via messageProps.inPost
 * - [user-interactions] Enforces required callbacks for avatar press and archive actions
 * - [lazy-loading] Supports infinite scroll and load earlier mechanisms
 * - [typing-indicator] Manages typing state display at list footer
 * - [ref-forwarding] Allows parent components to control scroll programmatically
 * 
 * Required dependencies:
 * - colors: Theme colors object (injected by wrapper)
 * - db: FrontendDB instance for user lookups (injected by wrapper)
 * - onPressAvatar: Callback for user profile navigation
 * - onArchive: Callback for discussion archival
 * - showScrollToBottom: Boolean controlling scroll button visibility
 * 
 * Optional features:
 * - post: Original post for discussion threads
 * - discussion: Full discussion metadata
 * - gatzClient: API client for marking messages as seen
 * - highlightedMessageId: Message to scroll to and highlight
 * - messageProps: Additional props passed to each Message component
 * 
 * The interface ensures:
 * - Type-safe message rendering with proper user/author resolution
 * - Flexible scroll behavior (inverted for chat, normal for feeds)
 * - Support for both standalone messages and threaded discussions
 * - Proper typing indicator positioning based on scroll direction
 * 
 * @see MessageContainer for implementation details
 * @see MessageContainerWrapper for context injection
 */
export interface MessageContainerProps {
  highlightedMessageId?: T.Message["id"];
  messages?: T.Message[];
  user?: T.Contact;
  inverted?: boolean;
  loadEarlier?: boolean;
  alignTop?: boolean;
  showScrollToBottom: boolean;
  invertibleScrollViewProps?: any;
  extraData?: any;
  forwardRef?: RefObject<FlatList<T.Message>>;
  onLoadEarlier?(): void;
  infiniteScroll?: boolean;
  isLoadingEarlier?: boolean;
  onPressAvatar: (user: T.User["id"]) => void;
  onArchive: (did: T.Discussion["id"]) => void;
  messageProps?: {
    shouldRenderDay?: boolean;
    inPost?: boolean;
    onSuggestedPost: (mid: T.Message["id"]) => void;
    navigateToDiscussion: (did: T.Discussion["id"]) => void;
  };
  bubble?: PropsForBubble;
  messageActionProps?: MessageActionProps;
  post?: T.Message;
  discussion?: T.Discussion;
  gatzClient?: GatzClient;
  colors: any;
  db: FrontendDB;
}

interface State {
  showScrollBottom: boolean;
  hasScrolled: boolean;
}

type InnerProperties = {
  contentHeight?: number;
  layoutHeight?: number;
  lastMessageRendered: boolean;
  lastMessageMarked: T.Message["id"];
};

const scrollToBottomOffset = 200;

class MessageContainer extends React.PureComponent<
  MessageContainerProps & { colors: ReturnType<typeof useThemeColors> },
  State
> {
  constructor(
    props: MessageContainerProps & {
      colors: ReturnType<typeof useThemeColors>;
    },
  ) {
    super(props);
    this.memoizedScrollToId = this.scrollToId.bind(this);
  }
  memoizedScrollToId: (id: T.Message["id"]) => void;

  static defaultProps = {
    messages: [],
    user: {},
      onLoadEarlier: () => { },
    inverted: true,
    loadEarlier: false,
    invertibleScrollViewProps: {},
    extraData: null,
    alignTop: false,
    infiniteScroll: false,
    showScrollToBottom: false,
    isLoadingEarlier: false,
  };

  static propTypes = {
    messages: PropTypes.arrayOf(PropTypes.object),
      user: PropTypes.object,
    onLoadEarlier: PropTypes.func,
    inverted: PropTypes.bool,
    loadEarlier: PropTypes.bool,
    invertibleScrollViewProps: PropTypes.object,
    extraData: PropTypes.object,
    showScrollToBottom: PropTypes.bool,
    alignTop: PropTypes.bool,
    infiniteScroll: PropTypes.bool,
    inPost: PropTypes.bool,
    post: PropTypes.object,
    discussion: PropTypes.object,
  };

  state = {
    showScrollBottom: false,
    hasScrolled: false,
  };


  renderFooter = () => {
    return null;
  };

  renderLoadEarlier = () => {
    if (this.props.loadEarlier === true) {
      const loadEarlierProps = {
        ...this.props,
      };
      return <LoadEarlier {...loadEarlierProps} />;
    }
    return null;
  };

  scrollToIndex(index: number) {
    if (this.props.forwardRef && this.props.forwardRef.current) {
      this.props.forwardRef!.current!.scrollToIndex({ animated: true, index });
    }
  }

  scrollToId(id: T.Message["id"]) {
    const index = this.props.messages!.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.scrollToIndex(index);
    }
  }

  scrollTo(options: { animated?: boolean; offset: number }) {
    if (this.props.forwardRef && this.props.forwardRef.current && options) {
      this.props.forwardRef.current.scrollToOffset(options);
    }
  }

  scrollToBottom = (animated: boolean = true) => {
    const { inverted } = this.props;
    if (inverted) {
      this.scrollTo({ offset: 0, animated });
    } else if (this.props.forwardRef && this.props.forwardRef.current) {
      this.props.forwardRef!.current!.scrollToEnd({ animated });
    }
  };

  handleOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {
      nativeEvent: {
        contentOffset: { y: contentOffsetY },
        contentSize: { height: contentSizeHeight },
        layoutMeasurement: { height: layoutMeasurementHeight },
      },
    } = event;
    if (this.props.inverted) {
      if (contentOffsetY > scrollToBottomOffset!) {
        this.setState({ showScrollBottom: true, hasScrolled: true });
      } else {
        this.setState({ showScrollBottom: false, hasScrolled: true });
      }
    } else {
      if (
        contentOffsetY < scrollToBottomOffset! &&
        contentSizeHeight - layoutMeasurementHeight > scrollToBottomOffset!
      ) {
        this.setState({ showScrollBottom: true, hasScrolled: true });
      } else {
        this.setState({ showScrollBottom: false, hasScrolled: true });
      }
    }
  };

  renderRow = ({ item, index }: ListRenderItemInfo<T.Message>) => {
    if (this.props.messages && index === this.props.messages.length - 1) {
      this.innerProperties.lastMessageRendered = true;
    }
    if (!item.id) {
      warning("GiftedChat: `id` is missing for message", JSON.stringify(item));
    }
    if (!item.user_id) {
      warning(
        "GiftedChat: `user_id` is missing for message",
        JSON.stringify(item),
      );
    }

    const author = this.props.db.maybeGetUserById(item.user_id);

    const { messages, user, inverted, post, ...restProps } = this.props;
    if (messages && user) {
      const previousMessage =
        (inverted
          ? messages[index + 1]
          : index === 0
            ? post
            : messages[index - 1]) || undefined;
      const nextMessage =
        (inverted
          ? index === 0
            ? post
            : messages[index - 1]
          : messages[index + 1]) || undefined;

      const messageProps: Message["props"] = {
        ...restProps,
        ...this.props.messageProps,
        db: this.props.db,
        user,
        author,
        key: item.id,
        currentMessage: item,
        previousMessage,
        // inverted,
        nextMessage,
        // position: item.user_id === user.id ? "right" : "left",
        onTapReply: this.memoizedScrollToId,
        onPressAvatar: this.props.onPressAvatar,
      };

      if (messageProps.inPost) {
        return <Message {...messageProps} />;
      } else {
        return <SwipeMessage {...messageProps} />;
      }
    }
    return null;
  };

  renderChatEmpty = () => {
    const { colors } = this.props;
    return (
      <View
        style={[styles.container, { backgroundColor: colors.rowBackground }]}
      />
    );
  };

  renderHeaderWrapper = () => {
    const reactions = flattenReactions(this.props.post?.reactions);
    const hasReactions = reactions.length > 0;
    const { colors } = this.props;
    return (
      <View
        style={[
          styles.headerWrapper,
          { backgroundColor: colors.rowBackground },
          hasReactions && { marginBottom: 22 },
        ]}
      >
        {this.props.post && (
          <Post
            isMain
            currentMessage={this.props.post}
            discussion={this.props.discussion}
            onEdit={this.props.messageActionProps?.onEdit}
            onOpenReactionMenu={this.props.messageActionProps?.onReactji}
            onQuickReaction={this.props.messageActionProps?.onQuickReaction}
            onDisplayReactions={this.props.messageActionProps.onDisplayReactions}
            onPressAvatar={this.props.onPressAvatar}
            onArchive={this.props.onArchive}
            onContinue={this.props.messageActionProps?.onSuggestedPost}
          />
        )}
        {this.renderLoadEarlier()}
      </View>
    );
  };

  renderScrollToBottomWrapper() {
    const { colors } = this.props;
    return (
      <View
        style={[
          styles.scrollToBottomStyle,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <TouchableOpacity
          onPress={() => this.scrollToBottom()}
          hitSlop={{ top: 5, left: 5, right: 5, bottom: 5 }}
        >
          <MaterialIcons
            name="keyboard-arrow-down"
            size={24}
            color={colors.primaryText}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Track if we've rendered the last message

  innerProperties: InnerProperties = {
    contentHeight: undefined,
    layoutHeight: undefined,
    lastMessageRendered: false,
    lastMessageMarked: undefined,
  };

  isListFullyRendered(): boolean {
    return (
      this.innerProperties.lastMessageRendered &&
      this.innerProperties.contentHeight &&
      this.innerProperties.layoutHeight &&
      this.innerProperties.contentHeight <= this.innerProperties.layoutHeight
    );
  }

  onContentSizeChange(_w: number, h: number) {
    this.innerProperties.contentHeight = h;
    if (this.isListFullyRendered()) {
      this.markLastMessageAsSeen();
    }
  }

  onLayoutList({ nativeEvent }) {
    this.innerProperties.layoutHeight = nativeEvent.layout.height;
    if (this.isListFullyRendered()) {
      this.markLastMessageAsSeen();
    }
  }

  async markLastMessageAsSeen() {
    const { gatzClient, discussion, messages, user } = this.props;
    if (discussion && messages && gatzClient) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const lastReadMId =
          discussion.last_message_read &&
          discussion.last_message_read[user.id];

        if (!lastReadMId || lastReadMId !== lastMessage.id) {
          if (this.innerProperties.lastMessageMarked !== lastMessage.id) {
            this.innerProperties.lastMessageMarked = lastMessage.id;
            try {
              await gatzClient.markMessageSeen(discussion.id, lastMessage.id);
            } catch (error) {
              console.error('Error marking message as seen:', error);
              // Don't propagate the error - this is a background operation
            }
          }
        }
      }
    }
  }

  // onLayoutList = () => {
  //   if (
  //     !this.props.inverted &&
  //     !!this.props.messages &&
  //     this.props.messages!.length
  //   ) {
  //     //setTimeout(
  //     //  () => this.scrollToBottom && this.scrollToBottom(false),
  //     //  15 * this.props.messages!.length
  //     //);
  //   }
  // };

  onEndReached = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    this.markLastMessageAsSeen();

    // const { loadEarlier, onLoadEarlier, infiniteScroll, isLoadingEarlier } =
    //   this.props;
    // if (
    //   infiniteScroll &&
    //   (this.state.hasScrolled || distanceFromEnd > 0) &&
    //   distanceFromEnd <= 100 &&
    //   loadEarlier &&
    //   onLoadEarlier &&
    //   !isLoadingEarlier &&
    //   Platform.OS !== "web"
    // ) {
    //   console.log("on load earlier");
    //   onLoadEarlier();
    // }
  };

  keyExtractor = (item: T.Message) => `${item.id}`;

  componentDidMount(): void {
    const { highlightedMessageId, discussion, user } = this.props;
    if (highlightedMessageId) {
      setTimeout(() => this.scrollToId(highlightedMessageId), 1000);
    } else {
      const lastReadMId =
        discussion?.last_message_read && discussion.last_message_read[user.id];

      if (lastReadMId) {
        setTimeout(() => this.scrollToId(lastReadMId), 100);
      }
    }
  }

  render() {
    const { inverted, colors } = this.props;

    return (
      <View
        style={[
          this.props.alignTop ? styles.containerAlignTop : styles.container,
          this.props.post && { backgroundColor: colors.rowBackground },
        ]}
      >
        <FlatList<T.Message>
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          initialScrollIndex={0}
          ref={this.props.forwardRef}
          extraData={this.props.extraData}
          keyExtractor={this.keyExtractor}
          enableEmptySections
          automaticallyAdjustContentInsets={false}
          inverted={inverted}
          data={this.props.messages}
          style={styles.listStyle}
          contentContainerStyle={styles.contentContainerStyle}
          renderItem={this.renderRow}
          {...this.props.invertibleScrollViewProps}
          ListEmptyComponent={this.renderChatEmpty}
          ListFooterComponent={
            inverted ? this.renderHeaderWrapper : this.renderFooter
          }
          ListHeaderComponent={
            inverted ? this.renderFooter : this.renderHeaderWrapper
          }
          onScroll={this.handleOnScroll}
          onScrollToIndexFailed={(e) => {
            console.log("scroll index failed", e);
          }}
          scrollEventThrottle={100}
          onContentSizeChange={(w, h) => this.onContentSizeChange(w, h)}
          onLayout={(e) => this.onLayoutList(e)}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={0.1}
        />
        {this.state.showScrollBottom && this.props.showScrollToBottom
          ? this.renderScrollToBottomWrapper()
          : null}
      </View>
    );
  }
}

/**
 * Wrapper component that integrates MessageContainer with app-wide context providers.
 * 
 * This component serves as the primary export and integration point for the MessageContainer
 * class component, bridging it with modern React patterns and context APIs.
 * 
 * Key functionality and invariants:
 * - [context-injection] Injects theme colors and database context into the class component
 * - [props-passthrough] Forwards all MessageContainerProps unchanged to the inner component
 * - [theme-integration] Uses useThemeColors hook to provide dynamic theming support
 * - [db-access] Provides access to FrontendDB instance from context
 * - [single-responsibility] Acts purely as a context bridge with no additional logic
 * 
 * This pattern provides:
 * - Clean separation between class component logic and hook-based context access
 * - Type-safe prop forwarding with MessageContainerProps interface
 * - Consistent theming across the message container hierarchy
 * - Database access for user lookups and message operations
 * 
 * The wrapper ensures that:
 * - Theme changes are automatically reflected in the message list
 * - Database context is available for all message-related operations
 * - Props are passed through without modification or filtering
 * 
 * Used throughout the app wherever messages need to be displayed, including:
 * - Main chat views
 * - Discussion threads
 * - Post reply sections
 * 
 * @param props - MessageContainerProps to be forwarded to the inner MessageContainer
 * @returns MessageContainer with injected colors and db from context
 */
const MessageContainerWrapper: React.FC<MessageContainerProps> = (props) => {
  // [theme-integration]
  const colors = useThemeColors();
  // [db-access]
  const { db } = useContext(FrontendDBContext);
  // [context-injection] [props-passthrough] [single-responsibility]
  return <MessageContainer {...props} colors={colors} db={db} />;
};

export default MessageContainerWrapper;
