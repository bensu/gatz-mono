import * as T from "../../../gatz/types";
import { appendMessages, removeMessage } from "../../../util";
import { MessageStatusType } from "../../MessageStatus";

export type MessageRetryState = MessageStatusType & {
  isSuccess?: boolean;
  originalMessage?: T.Message;
};

export type State = {
  messages: T.Message[] | null;
  numberOfUsers: number;
  step: number;
  loadEarlier?: boolean;
  isLoadingEarlier?: boolean;
  pendingMessages: T.Message["id"][];
  errorMessages: T.Message["id"][];
  messageRetryStatus: Record<T.Message["id"], MessageRetryState>;
  reactingToMessage?: T.Message;
  displayingMessageReactions?: T.Message;
};

export enum ActionKind {
  SEND_MESSAGE = "SEND_MESSAGE",
  EDIT_MESSAGE = "EDIT_MESSAGE",
  MESSAGE_SENT = "MESSAGE_SENT",
  MESSAGE_FAILED = "MESSAGE_FAILED",
  DELETE_MESSAGE = "DELETE_MESSAGE",
  MESSAGE_DELETED = "MESSAGE_DELETED",
  FLAG_MESSAGE = "FLAG_MESSAGE",
  LOAD_EARLIER_MESSAGES = "LOAD_EARLIER_MESSAGES",
  LOAD_FIRST_MESSAGES = "LOAD_FIRST_MESSAGES",
  LOAD_EARLIER_START = "LOAD_EARLIER_START",
  SET_IS_TYPING = "SET_IS_TYPING",
  // LOAD_EARLIER_END = 'LOAD_EARLIER_END',
  OPEN_REACTION_PICKER = "OPEN_REACTION_PICKER",
  CLOSE_REACTION_PICKER = "CLOSE_REACTION_PICKER",
  SEND_REACTION = "SEND_REACTION",
  UNDO_REACTION = "UNDO_REACTION",
  TOGGLE_REACTION = "TOGGLE_REACTION",

  DISPLAY_MESSAGE_REACTIONS = "DISPLAY_MESSAGE_REACTIONS",
  CLOSE_MESSAGE_REACTIONS = "CLOSE_MESSAGE_REACTIONS",
  
  // Retry actions
  RETRY_MESSAGE = "RETRY_MESSAGE",
  RETRY_SUCCESS = "RETRY_SUCCESS",
}

// An interface for our actions
export type StateAction =
  | {
    type: ActionKind.SEND_MESSAGE;
    message: T.Message;
  }
  | {
    type: ActionKind.EDIT_MESSAGE;
    message: T.Message;
  }
  | {
    type: ActionKind.MESSAGE_SENT;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.MESSAGE_FAILED;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.DELETE_MESSAGE;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.MESSAGE_DELETED;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.FLAG_MESSAGE;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.LOAD_FIRST_MESSAGES;
    messages: T.Message[];
    numberOfUsers: number;
  }
  | {
    type: ActionKind.LOAD_EARLIER_MESSAGES;
    messages: T.Message[];
  }
  | { type: ActionKind.LOAD_EARLIER_START }

  // Reactions
  | { type: ActionKind.OPEN_REACTION_PICKER; message: T.Message }
  | { type: ActionKind.CLOSE_REACTION_PICKER }
  | {
    type: ActionKind.SEND_REACTION;
    reaction: string;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.UNDO_REACTION;
    reaction: string;
    messageId: T.Message["id"];
  }
  | {
    type: ActionKind.TOGGLE_REACTION;
    reaction: string;
    messageId: T.Message["id"];
  }
  | { type: ActionKind.DISPLAY_MESSAGE_REACTIONS; message: T.Message }
  | { type: ActionKind.CLOSE_MESSAGE_REACTIONS }
  | {
    type: ActionKind.RETRY_MESSAGE;
    messageId: T.Message["id"];
    failureReason: "network" | "server";
    retryStatus: MessageRetryState;
  }
  | {
    type: ActionKind.RETRY_SUCCESS;
    messageId: T.Message["id"];
  };

/**
 * Main state reducer function for the DiscussionApp chat system.
 * 
 * This function serves as the central state management hub for all chat-related
 * operations, handling message lifecycle, user interactions, and UI state transitions.
 * 
 * Key functionality and invariants:
 * - [immutable-state] Never mutates the input state, always returns new state objects
 * - [message-ordering] Maintains chronological message order through appendMessages utility
 * - [pending-tracking] Tracks pending messages for optimistic UI updates
 * - [error-recovery] Manages failed message states for retry/recovery mechanisms
 * - [step-counter] Increments step counter for state change tracking and debugging
 * - [reaction-system] Manages message reaction picker and display states
 * - [loading-states] Handles loading indicators for async operations
 * - [cleanup-operations] Removes messages from pending/error arrays when state changes
 * 
 * This pattern provides:
 * - Predictable state transitions for all chat operations
 * - Optimistic UI updates with proper error handling
 * - Consistent message ordering and lifecycle management
 * - Clear separation between different operation types
 * 
 * The reducer handles:
 * - Message sending, editing, and deletion operations
 * - Loading earlier messages with pagination support
 * - Real-time typing indicators
 * - Message reactions and reaction picker UI
 * - Error states and recovery mechanisms
 * 
 * Used by the DiscussionApp component as the primary state management system,
 * ensuring consistent behavior across all chat interactions.
 * 
 * @param state - Current application state
 * @param action - Action object describing the state change to perform
 * @returns New state object with applied changes
 */
export function reducer(state: State, action: StateAction): State {
  switch (action.type) {
    case ActionKind.SEND_MESSAGE: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        step: state.step + 1, // [step-counter]
        messages: appendMessages(state.messages, [action.message]), // [message-ordering]
        pendingMessages: [...state.pendingMessages, action.message.id], // [pending-tracking]
      };
    }
    case ActionKind.EDIT_MESSAGE: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        step: state.step + 1, // [step-counter]
        messages: appendMessages(state.messages, [action.message]), // [message-ordering]
        pendingMessages: [...state.pendingMessages, action.message.id], // [pending-tracking]
      };
    }
    case ActionKind.MESSAGE_SENT: {
      // [immutable-state]
      const newRetryStatus = { ...state.messageRetryStatus };
      delete newRetryStatus[action.messageId]; // [cleanup-operations]
      
      return {
        ...state, // [immutable-state]
        pendingMessages: state.pendingMessages.filter( // [cleanup-operations]
          (id) => id !== action.messageId,
        ),
        errorMessages: state.errorMessages.filter( // [cleanup-operations] [error-recovery]
          (id) => id !== action.messageId,
        ),
        messageRetryStatus: newRetryStatus,
      };
    }
    case ActionKind.MESSAGE_FAILED: {
      // [immutable-state]
      // Find the original message from the current state
      const originalMessage = state.messages?.find(m => m.id === action.messageId);
      
      return {
        ...state, // [immutable-state]
        pendingMessages: state.pendingMessages.filter( // [cleanup-operations]
          (id) => id !== action.messageId,
        ),
        errorMessages: [...state.errorMessages, action.messageId], // [error-recovery]
        messageRetryStatus: {
          ...state.messageRetryStatus,
          [action.messageId]: {
            retryCount: 0,
            failureReason: (action as any).failureReason || "server",
            isRetrying: false,
            originalMessage,
          },
        },
      };
    }
    case ActionKind.LOAD_FIRST_MESSAGES: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        loadEarlier: true, // [loading-states]
        isLoadingEarlier: false, // [loading-states]
        messages: appendMessages(state.messages, action.messages), // [message-ordering]
        numberOfUsers: action.numberOfUsers,
      };
    }
    case ActionKind.LOAD_EARLIER_MESSAGES: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        loadEarlier: true, // [loading-states]
        isLoadingEarlier: false, // [loading-states]
        messages: appendMessages(state.messages, action.messages), // [message-ordering]
      };
    }
    case ActionKind.LOAD_EARLIER_START: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        isLoadingEarlier: true, // [loading-states]
      };
    }
    case ActionKind.SET_IS_TYPING: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
      };
    }
    case ActionKind.MESSAGE_DELETED: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        messages: removeMessage(state.messages, action.messageId), // [cleanup-operations]
      };
    }
    case ActionKind.FLAG_MESSAGE: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        messages: removeMessage(state.messages, action.messageId), // [cleanup-operations]
      };
    }
    case ActionKind.OPEN_REACTION_PICKER: {
      // [immutable-state] [reaction-system]
      return {
        ...state, // [immutable-state]
        reactingToMessage: action.message, // [reaction-system]
      };
    }
    case ActionKind.CLOSE_REACTION_PICKER: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        reactingToMessage: undefined, // [reaction-system]
      };
    }
    case ActionKind.SEND_REACTION: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        reactingToMessage: undefined, // [reaction-system]
      };
    }
    case ActionKind.TOGGLE_REACTION: {
      return state; // [immutable-state]
    }
    case ActionKind.DISPLAY_MESSAGE_REACTIONS: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        displayingMessageReactions: action.message, // [reaction-system]
      };
    }
    case ActionKind.CLOSE_MESSAGE_REACTIONS: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        reactingToMessage: undefined, // [reaction-system]
        displayingMessageReactions: undefined, // [reaction-system]
      };
    }
    case ActionKind.RETRY_MESSAGE: {
      // [immutable-state]
      const currentStatus = action.retryStatus;
      return {
        ...state, // [immutable-state]
        pendingMessages: [...state.pendingMessages, action.messageId], // [pending-tracking]
        messageRetryStatus: {
          ...state.messageRetryStatus,
          [action.messageId]: {
            ...currentStatus,
            retryCount: currentStatus.retryCount + 1,
            isRetrying: true,
            lastRetryTime: Date.now(),
          },
        },
      };
    }
    case ActionKind.RETRY_SUCCESS: {
      // [immutable-state]
      return {
        ...state, // [immutable-state]
        messageRetryStatus: {
          ...state.messageRetryStatus,
          [action.messageId]: {
            ...state.messageRetryStatus[action.messageId],
            isRetrying: false,
            isSuccess: true,
          },
        },
      };
    }
    default:
      return state; // [immutable-state]
  }
}

