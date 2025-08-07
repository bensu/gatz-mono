import AsyncStorage from "@react-native-async-storage/async-storage";
import * as zustand from "zustand";
import * as zustandMiddleware from "zustand/middleware";
import * as T from "../types";
import { MessageRetryState } from "../../components/DiscussionApp/reducer";

export type FailedMessage = {
  message: T.Message;
  retryState: MessageRetryState;
  failedAt: string; // ISO timestamp when message first failed
};

export type FailedMessagesState = {
  // Organized by discussion ID for efficient lookup and management
  failedMessages: Record<T.Discussion["id"], FailedMessage[]>;
  
  // Add a failed message
  addFailedMessage: (discussionId: T.Discussion["id"], message: T.Message, retryState: MessageRetryState) => void;
  
  // Remove a successfully sent message
  removeFailedMessage: (discussionId: T.Discussion["id"], messageId: T.Message["id"]) => void;
  
  // Update retry state for a message
  updateRetryState: (discussionId: T.Discussion["id"], messageId: T.Message["id"], retryState: MessageRetryState) => void;
  
  // Get all failed messages for a discussion
  getFailedMessages: (discussionId: T.Discussion["id"]) => FailedMessage[];
  
  // Clear all failed messages for a discussion
  clearDiscussionMessages: (discussionId: T.Discussion["id"]) => void;
  
  // Get count of failed messages globally
  getFailedMessageCount: () => number;
};

export const useFailedMessagesStore = zustand.create<FailedMessagesState>()(
  zustandMiddleware.persist(
    (set, get) => ({
      failedMessages: {},
      
      addFailedMessage: (discussionId: T.Discussion["id"], message: T.Message, retryState: MessageRetryState) => {
        set((state) => {
          const discussionMessages = state.failedMessages[discussionId] || [];
          
          // Check if message already exists (prevent duplicates)
          const existingIndex = discussionMessages.findIndex(fm => fm.message.id === message.id);
          
          const failedMessage: FailedMessage = {
            message,
            retryState,
            failedAt: new Date().toISOString(),
          };
          
          let updatedMessages: FailedMessage[];
          if (existingIndex >= 0) {
            // Update existing message
            updatedMessages = [...discussionMessages];
            updatedMessages[existingIndex] = failedMessage;
          } else {
            // Add new failed message
            updatedMessages = [...discussionMessages, failedMessage];
          }
          
          return {
            failedMessages: {
              ...state.failedMessages,
              [discussionId]: updatedMessages,
            },
          };
        });
      },
      
      removeFailedMessage: (discussionId: T.Discussion["id"], messageId: T.Message["id"]) => {
        set((state) => {
          const discussionMessages = state.failedMessages[discussionId];
          if (!discussionMessages) return state;
          
          const filteredMessages = discussionMessages.filter(fm => fm.message.id !== messageId);
          
          // Clean up empty discussion entries
          if (filteredMessages.length === 0) {
            const { [discussionId]: _, ...remainingMessages } = state.failedMessages;
            return { failedMessages: remainingMessages };
          }
          
          return {
            failedMessages: {
              ...state.failedMessages,
              [discussionId]: filteredMessages,
            },
          };
        });
      },
      
      updateRetryState: (discussionId: T.Discussion["id"], messageId: T.Message["id"], retryState: MessageRetryState) => {
        set((state) => {
          const discussionMessages = state.failedMessages[discussionId];
          if (!discussionMessages) return state;
          
          const updatedMessages = discussionMessages.map(fm => 
            fm.message.id === messageId 
              ? { ...fm, retryState }
              : fm
          );
          
          return {
            failedMessages: {
              ...state.failedMessages,
              [discussionId]: updatedMessages,
            },
          };
        });
      },
      
      getFailedMessages: (discussionId: T.Discussion["id"]) => {
        const state = get();
        return state.failedMessages[discussionId] || [];
      },
      
      clearDiscussionMessages: (discussionId: T.Discussion["id"]) => {
        set((state) => {
          const { [discussionId]: _, ...remainingMessages } = state.failedMessages;
          return { failedMessages: remainingMessages };
        });
      },
      
      getFailedMessageCount: () => {
        const state = get();
        return Object.values(state.failedMessages).reduce(
          (total, messages) => total + messages.length,
          0
        );
      },
    }),
    {
      name: "gatz/failed-messages",
      storage: zustandMiddleware.createJSONStorage(() => AsyncStorage),
    }
  )
);