import React, {
  useState,
  useCallback,
  useReducer,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { useDebouncedRouter } from "../../context/debounceRouter";

import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import { useShallow } from "zustand/react/shallow";

import { Discussion, Message } from "../../gatz/types";
import * as T from "../../gatz/types";
import { createDraftReplyStore, useNotificationStore, useFailedMessagesStore } from "../../gatz/store";

import { GiftedChat } from "../../gifted";
import { MessageDraft } from "../../gifted/InputToolbar";

import { appendMessages, crdtIsEqual, isMobile, removeMessage } from "../../util";

import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { ClientContext, ConnectionStatus } from "../../context/ClientProvider";
import { SessionContext } from "../../context/SessionProvider";
import { DiscussionContextProvider } from "../../context/DiscussionContext";

import { DisplayMessageReactions, ReactionPicker } from "../reactions";
import { ScrollableSmallSheet, SmallSheet } from "../BottomSheet";
import * as Push from "../../push";
import { useThemeColors } from "../../gifted/hooks/useThemeColors";
import { TEST_ID } from "../../gifted/Constant";
import { reducer, StateAction, ActionKind } from "./reducer";
import { makeApplyEffect } from "./applyEffect";

type Props = { did: Discussion["id"]; highlightedMessageId?: Message["id"] };

/**
 * Main discussion/chat component that manages a conversation thread in the Gatz app.
 * 
 * This component serves as the primary interface for users to participate in discussions,
 * send messages, react to content, and manage conversation state.
 * 
 * Key functionality and invariants:
 * - [state-management] Uses useReducer for complex state management with atomic updates
 * - [optimistic-updates] Implements optimistic UI updates for messages with pending/error states
 * - [real-time-sync] Maintains real-time synchronization with backend through FrontendDB listeners
 * - [message-ordering] Preserves message chronological order using appendMessages utility
 * - [pending-tracking] Tracks pending messages separately to show loading states
 * - [error-recovery] Handles message send failures with error state tracking
 * - [reaction-system] Manages emoji reactions with picker UI and optimistic updates
 * - [reply-threading] Supports threaded replies with reply_to message references
 * - [message-editing] Allows editing messages with edit history tracking
 * - [user-presence] Shows typing indicators and online status
 * - [notification-clearing] Automatically clears push notifications for viewed discussions
 * - [app-state-refresh] Refreshes data when app returns to foreground
 * - [message-read-tracking] Updates last_message_read for read receipt functionality
 * - [deep-linking] Supports highlighting specific messages via props
 * - [connection-status] Displays connection status overlay
 * - [lazy-loading] Implements infinite scroll for message history
 * - [message-deletion] Supports soft deletion with UI updates
 * - [message-flagging] Allows reporting inappropriate content
 * - [archive-discussion] Enables hiding/archiving entire discussions
 * - [navigation-routing] Handles navigation to user profiles, other discussions, and posts
 * - [loading-states] Shows loading indicator during initial data fetch
 * - [error-display] Displays loading errors with user-friendly messages
 * - [reaction-sheets] Manages bottom sheets for reaction picker and reaction display
 * 
 * Dependencies (for testing strategy):
 * - Child Components: GiftedChat, ConnectionStatus, DisplayMessageReactions, ReactionPicker, SmallSheet, ScrollableSmallSheet (use real implementations)
 * - Internal Dependencies: useThemeColors, useShallow, useDebouncedRouter, createDraftReplyStore (use real implementations)
 * - External Services: gatzClient API calls, Push notifications, router navigation (mock at boundaries)
 * - Context Providers: SessionContext, ClientContext, FrontendDBContext, DiscussionContextProvider (provide test implementations)
 * - Native Modules: react-native-get-random-values, uuid (mock globally if needed)
 * - Utilities: appendMessages, crdtIsEqual, isMobile, removeMessage (use real implementations)
 * 
 * State shape includes:
 * - messages: Array of messages or null during loading
 * - numberOfUsers: Count of discussion participants
 * - step: Incremental counter for forcing re-renders
 * - loadEarlier/isLoadingEarlier: Pagination state
 * - isTyping: Typing indicator state
 * - pendingMessages: Array of message IDs being sent
 * - errorMessages: Array of message IDs that failed to send
 * - reactingToMessage: Message being reacted to (reaction picker open)
 * - displayingMessageReactions: Message whose reactions are being displayed
 * 
 * @param props - Props containing discussion ID (did) and optional highlightedMessageId
 * @returns Discussion interface with GiftedChat component and reaction sheets
 */
const DiscussionApp = (props: Props) => {
  const colors = useThemeColors();
  const did = props.did;
  // Track if app is in foreground or not to know when to refresh data
  // [app-state-refresh]
  const [appState, setAppState] = useState(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  // Handle unhandled promise rejections to prevent uncaught errors
  useEffect(() => {
    const handleUnhandledRejection = (event: any) => {
      console.error('Unhandled promise rejection in DiscussionApp:', event.reason);
      // Prevent the error from propagating and showing the error screen
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    if (typeof window !== 'undefined' && window.addEventListener && window.removeEventListener) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }
  }, []);

  const router = useDebouncedRouter();
  const { session } = useContext(SessionContext);
  const userId = session.userId;
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);

  const user = useMemo(() => db.getUserById(userId), [userId, db]);

  const initialDr = useMemo(() => db.getDRById(did) || null, [did, db]);

  const [discussion, setDiscussion] = useState<T.Discussion | undefined>(
    initialDr && initialDr.discussion,
  );

  // Memoize the discussion update to prevent unnecessary re-renders
  const updateDiscussion = useCallback((d: T.Discussion | undefined) => {
    setDiscussion((prev) => {
      if (!prev || !d || !crdtIsEqual(prev, d)) {
        return d;
      }
      return prev;
    });
  }, [setDiscussion]);

  // [message-read-tracking]
  const markMessageRead = useCallback(
    (mid: T.Message["id"]) => {
      if (discussion) {
        const last_message_read = {
          ...discussion.last_message_read,
          [userId]: mid,
        };
        const newDiscussion = { ...discussion, last_message_read };
        db.addDiscussion(newDiscussion);
      }
    },
    [db, discussion, userId],
  );

  // const group: T.Group | undefined = useMemo(() => {
  //   if (discussion && discussion.group_id) {
  //     return db.getGroupById(discussion.group_id);
  //   } else {
  //     return null;
  //   }
  // }, [discussion, db]);

  useEffect(() => {
    // [real-time-sync]
    const lid = db.listenToDiscussion(did, updateDiscussion);
    return () => db.removeDiscussionListener(did, lid);
  }, [did, db, updateDiscussion]);

  // Memoize state initialization to prevent unnecessary re-renders
  const initialState = useMemo(() => ({
    messages:
      (initialDr && initialDr.messages) || null,
    numberOfUsers: initialDr && initialDr.discussion.members.length,
    step: 0,
    loadEarlier: true,
    isLoadingEarlier: false,
    isTyping: false,
    reactingToMessage: undefined,
    displayingMessageReactions: undefined,
    pendingMessages: [],
    errorMessages: [],
    messageRetryStatus: {},
  }), [initialDr, db]);

  // [state-management]
  const [state, dispatch] = useReducer(reducer, initialState);

  const applyEffect = useMemo(
    () => makeApplyEffect({
      gatzClient,
      dispatch,
      db,
      did,
      userId,
      markMessageRead,
    }),
    [gatzClient, dispatch, db, did, userId, markMessageRead],
  );

  // Given that this depends on the state, it doesn't make sense to memoize it
  const dispatchEffect = useCallback(
    (action: StateAction) => {
      try {
        applyEffect(action);
      } catch (error) {
        console.error('Error in applyEffect:', error);
        // Still dispatch the action to update UI state
      }
      dispatch(action);
    },
    [applyEffect, dispatch],
  );

  const postAndMessages = useMemo(() => {
    if (state.messages === null || state.messages === undefined) {
      return null;
    } else {
      const pending = new Set(state.pendingMessages);
      const errors = new Set(state.errorMessages);
      return state.messages
        .filter((m) => !m.deleted_at)
        .map((m) => {
          // [deep-linking]
          const isHighlighted = m.id === props.highlightedMessageId;
          if (pending.has(m.id)) {
            return {
              ...m,
              pending: true,
              sent: false,
              error: false,
              received: false,
              isHighlighted,
            };
          } else if (errors.has(m.id)) {
            return {
              ...m,
              error: true,
              pending: false,
              sent: false,
              received: false,
              isHighlighted,
            };
          } else {
            return {
              ...m,
              sent: true,
              pending: false,
              received: false,
              error: false,
              isHighlighted,
            };
          }
        });
    }
  }, [state.messages, state.pendingMessages, state.errorMessages, props.highlightedMessageId]);

  const isLoading = state.messages === null;

  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const drListener = db.listenToDR(did, (dr) => {
      const { discussion, messages } = dr;
      dispatchEffect({
        type: ActionKind.LOAD_FIRST_MESSAGES,
        messages,
        numberOfUsers: discussion.members.length,
      });
    });

    const deleteListener = db.listenToDeletedMessages(
      did,
      (_did, mid: Message["id"]) => {
        dispatchEffect({ type: ActionKind.MESSAGE_DELETED, messageId: mid });
      },
    );
    return () => {
      db.removeDRListener(did, drListener);
      db.removeDeleteMessageListener(did, deleteListener);
    };
  }, [did, db, dispatchEffect]);

  useEffect(() => {
    if (appState === "active") {
      const loadDiscussions = async () => {
        const data = await gatzClient.getDiscussion(did);
        // TODO: what happens if this fails?
        switch (data.current) {
          case false: {
            // The order matters here, users need to be added first
            const { users, discussion, group } = data;

            // Batch all DB operations in a single transaction
            db.transaction(() => {
              users.forEach((u) => db.addUser(u));
              if (group) {
                db.addGroup(group);
              }
              db.addDiscussionResponse(data);
            });
            break;
          }
          case true: {
            break;
          }
        }
      };

      loadDiscussions().catch((_e) => {
        setLoadingError("Failed to load discussion");
      });
    }
  }, [appState, gatzClient, did, db]);

  const notificationsStore = useNotificationStore();

  useEffect(() => {
    // [notification-clearing]
    Push.clearDiscussionNotifications(notificationsStore, did);
  }, [did, notificationsStore]);

  // Restore failed messages from persistent storage
  const [hasRestoredMessages, setHasRestoredMessages] = useState(false);
  
  useEffect(() => {
    if (state.messages !== null && !hasRestoredMessages) {
      // Only restore after initial messages have loaded and haven't restored yet
      const failedMessages = useFailedMessagesStore.getState().getFailedMessages(did);
      
      if (failedMessages.length > 0) {
        // Restore each failed message to the state
        failedMessages.forEach(({ message, retryState }) => {
          // Check if message already exists in current state
          const existingMessage = state.messages?.find(m => m.id === message.id);
          if (!existingMessage) {
            // Add message to state
            dispatchEffect({ type: ActionKind.SEND_MESSAGE, message });
            // Mark it as failed immediately
            setTimeout(() => {
              dispatch({
                type: ActionKind.MESSAGE_FAILED,
                messageId: message.id,
                failureReason: retryState.failureReason,
              } as any);
            }, 0);
          } else {
            // Message exists, just update its retry status
            setTimeout(() => {
              dispatch({
                type: ActionKind.MESSAGE_FAILED,
                messageId: message.id,
                failureReason: retryState.failureReason,
              } as any);
            }, 0);
          }
        });
      }
      setHasRestoredMessages(true);
    }
  }, [state.messages, hasRestoredMessages, did, dispatchEffect, dispatch]); // Proper dependencies

  const idGenerator = useCallback(() => uuidv4(), []);

  const onSend = useCallback(
    (messageDraft: MessageDraft) => {
      const createdAt = new Date();
      // [message-editing]
      if (messageDraft.editingId) {
        const em = db.getMessageById(did, messageDraft.editingId);
        if (em) {
          let edits = em.edits || [];
          if (edits.length === 0) {
            edits = [{ text: em.text, edited_at: em.created_at }];
          }
          const message: T.Message = {
            ...em,
            text: messageDraft.text,
            edits: edits.concat({
              text: messageDraft.text,
              edited_at: createdAt.toISOString(),
            }),
          };
          dispatchEffect({ type: ActionKind.EDIT_MESSAGE, message });
        }
      } else {
        const id = idGenerator();
        // [reply-threading]
        const replyToMessage =
          messageDraft.reply_to &&
          db.getMessageById(did, messageDraft.reply_to);
        const clock: T.HLC = {
          counter: 0,
          node: did,
          ts: createdAt.toISOString(),
        };
        const message: T.Message = {
          ...messageDraft,
          id: id,
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString(),
          reply_to: replyToMessage ? replyToMessage.id : undefined,
          edits: [{ text: messageDraft.text, edited_at: createdAt.toISOString() }],
          user_id: userId,
          clock,
          did,
          // the message never starts with any reactions or mentions
          reactions: {},
          mentions: {},
        };
        dispatchEffect({ type: ActionKind.SEND_MESSAGE, message });
      }
    },
    // TODO: is state.messages needed here?
    [dispatch, state.messages],
  );

  const onDeleteMessage = useCallback(
    async (messageId: Message["id"]) =>
      dispatchEffect({ type: ActionKind.DELETE_MESSAGE, messageId }),
    [dispatchEffect],
  );

  const onRetryMessage = useCallback(
    (messageId: Message["id"]) => {
      const retryStatus = state.messageRetryStatus[messageId];
      if (retryStatus && !retryStatus.isRetrying) {
        dispatchEffect({ 
          type: ActionKind.RETRY_MESSAGE, 
          messageId,
          failureReason: retryStatus.failureReason,
          retryStatus
        });
      }
    },
    [dispatchEffect, state.messageRetryStatus],
  );

  const replyStore = useMemo(() => createDraftReplyStore(did), [did]);

  const { setReplyTo, setEditingId } = replyStore(
    useShallow((state) => ({
      setReplyTo: state.setReplyTo,
      setEditingId: state.setEditingId,
    })),
  );

  const onReplyTo = useCallback(
    (reply_to: T.Message["id"]) => setReplyTo(reply_to),
    [setReplyTo],
  );

  const onReactji = useCallback((message: T.Message) =>
    dispatch({ type: ActionKind.OPEN_REACTION_PICKER, message }),
    [dispatch],
  );

  const onQuickReaction = useCallback((messageId: T.Message["id"], reaction: string) => {
    dispatchEffect({ type: ActionKind.TOGGLE_REACTION, messageId, reaction });
  }, [dispatchEffect]);

  const onReactionSelected = useCallback(
    (reaction: string) => {
      dispatchEffect({
        type: ActionKind.SEND_REACTION,
        messageId: state.reactingToMessage.id,
        reaction,
      });
    },
    [state.reactingToMessage, dispatchEffect],
  );
  const onDisplayReactions = useCallback(
    (message: T.Message) => dispatchEffect({ type: ActionKind.DISPLAY_MESSAGE_REACTIONS, message }),
    [dispatchEffect],
  );
  const onUndoReaction = useCallback(
    (messageId: T.Message["id"], reaction: string) => {
      dispatchEffect({ type: ActionKind.UNDO_REACTION, messageId, reaction });
    },
    [dispatchEffect],
  );

  const onEditMessage = useCallback(
    (editingId: T.Message["id"]) => {
      const em = db.getMessageById(did, editingId);
      if (em) {
        setEditingId(editingId, em.text || "");
      }
    },
    [setEditingId, db, did],
  );

  const onFlagMessage = useCallback(
    (mid: T.Message["id"]) => dispatchEffect({ type: ActionKind.FLAG_MESSAGE, messageId: mid }),
    [dispatchEffect],
  );

  // [archive-discussion]
  const onArchive = useCallback(
    async (did: T.Discussion["id"]) => {
      await gatzClient.hideDiscussion(did);
      router.replace("/");
    },
    [gatzClient, router.replace],
  );

  // [navigation-routing]
  const onSuggestedPost = useCallback(
    (mid: T.Message["id"]) => router.push(`/post?did=${did}&mid=${mid}`),
    [router.push, did],
  );

  // [navigation-routing]
  const navigateToDiscussion = useCallback((did: T.Discussion["id"]) => {
    if (isMobile()) {
      router.push(`/discussion/${did}`);
    } else {
      router.push(`?did=${did}`);
    }
  }, [router.push]);

  // [navigation-routing]
  const onPressAvatar = useCallback(
    (userId: T.User["id"]) => router.push(`/contact/${userId}`),
    [router.push],
  );

  if (loadingError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
        testID={TEST_ID.DISCUSSION_APP_ERROR}
      >
        <Text>{loadingError}</Text>
        <Text>Please try again later</Text>
      </View>
    );
  }

  if (isLoading || !postAndMessages || !discussion) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }} testID={TEST_ID.DISCUSSION_APP_LOADING}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const [post, ...messagesWithState] = postAndMessages;

  return (
    <DiscussionContextProvider discussion={discussion} userId={userId}>
      <View style={[styles.container, { backgroundColor: colors.rowBackground }]} testID={TEST_ID.DISCUSSION_APP_CONTAINER}>
        {/* [connection-status] */}
        <View style={styles.connectionStatusContainer} testID="connection-status-container">
          <ConnectionStatus />
        </View>
        <GiftedChat
          key={discussion?.id}
          discussion={discussion}
          draftReplyStore={replyStore}
          post={post}
          messages={messagesWithState}
          onSend={onSend}
          loadEarlier={false}
          // parsePatterns={parsePatterns}
          user={user}
          onPressAvatar={onPressAvatar}
          // onPressAvatar={onPressAvatar}
          // onQuickReply={onQuickReply}
          renderUsernameOnMessage
          keyboardShouldPersistTaps="never"
          // [user-presence]
          isTyping={state.isTyping}
          inverted={false}
          // [lazy-loading]
          infiniteScroll
          showLeftUsername={true}
          onDelete={onDeleteMessage}
          onReplyTo={onReplyTo}
          onReactji={onReactji}
          onQuickReaction={onQuickReaction}
          onEdit={onEditMessage}
          onFlagMessage={onFlagMessage}
          onDisplayReactions={onDisplayReactions}
          onSuggestedPost={onSuggestedPost}
          onArchive={onArchive}
          navigateToDiscussion={navigateToDiscussion}
          highlightedMessageId={props.highlightedMessageId}
          messageRetryStatus={state.messageRetryStatus}
          onRetryMessage={onRetryMessage}
        />
        {state.displayingMessageReactions && (
          <ScrollableSmallSheet
            title="Reactions"
            isVisible
            onClose={() =>
              dispatchEffect({ type: ActionKind.CLOSE_MESSAGE_REACTIONS })
            }
          >
            <View style={{ paddingTop: 8, paddingBottom: 18, width: "100%" }}>
              <DisplayMessageReactions
                message={state.displayingMessageReactions}
                onUndoReaction={(reaction) =>
                  onUndoReaction(state.displayingMessageReactions.id, reaction)
                }
              />
            </View>
          </ScrollableSmallSheet>
        )}

        <SmallSheet
          title="Add reaction"
          isVisible={!!state.reactingToMessage}
          onClose={() =>
            dispatchEffect({ type: ActionKind.CLOSE_MESSAGE_REACTIONS })
          }
        >
          <ReactionPicker
            userId={userId}
            message={state.reactingToMessage}
            onReactionSelected={onReactionSelected}
            onUndoReaction={(reaction) =>
              onUndoReaction(state.reactingToMessage.id, reaction)
            }
          />
        </SmallSheet>
      </View>
    </DiscussionContextProvider >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  connectionStatusContainer: {
    position: "absolute",
    width: "100%",
    zIndex: 1,
    top: 0,
  },
});

export default DiscussionApp;
