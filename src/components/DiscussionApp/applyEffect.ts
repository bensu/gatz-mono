import { StateAction, ActionKind } from "./reducer";
import * as T from "../../gatz/types";
import { GatzClient } from "../../gatz/client";
import { multiPlatformAlert } from "../../util";
import { useFailedMessagesStore } from "../../gatz/store";

export interface ApplyEffectDependencies {
  gatzClient: GatzClient;
  dispatch: (action: StateAction) => void;
  db: {
    getMessageById: (did: string, messageId: string) => T.Message | null;
    appendMessage: (message: T.Message) => void;
  };
  did: string;
  userId: string;
  markMessageRead: (messageId: string) => void;
}

export const makeApplyEffect = (deps: ApplyEffectDependencies) => {
  return (action: StateAction) => {
    // Get store functions for managing failed messages inside the action handler
    // This ensures the store is initialized when actually used
    const { addFailedMessage, removeFailedMessage, updateRetryState } = useFailedMessagesStore.getState();
    switch (action.type) {
      case ActionKind.DELETE_MESSAGE: {
        deps.gatzClient.deleteMessage(deps.did, action.messageId).then((r) => {
          if (r.status === "success") {
            deps.dispatch({
              type: ActionKind.MESSAGE_DELETED,
              messageId: action.messageId,
            });
          } else {
            // TODO
          }
        });
        break;
      }
      case ActionKind.FLAG_MESSAGE: {
        // TODO: handle and surface errors here
        deps.gatzClient.flagMessage(deps.did, action.messageId);
        break;
      }
      case ActionKind.EDIT_MESSAGE: {
        deps.gatzClient.editMessage(
          deps.did,
          action.message.id,
          action.message.text,
        );
        break;
      }
      case ActionKind.SEND_MESSAGE: {
        try {
          deps.markMessageRead(action.message.id);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
        try {
          deps.gatzClient
            .postMessage(
              deps.did,
              action.message.id,
              action.message.text,
              action.message.media && action.message.media.map((m) => m.id),
              action.message.reply_to && action.message.reply_to,
              action.message.link_previews && action.message.link_previews.map((m) => m.id),
            )
            .then((r) => {
              const m = r.message;
              if (m) {
                deps.dispatch({
                  type: ActionKind.MESSAGE_SENT,
                  messageId: action.message.id,
                });
                // Remove from failed messages store on successful send
                removeFailedMessage(deps.did, action.message.id);
                try {
                  deps.markMessageRead(m.id);
                } catch (error) {
                  console.error('Error marking message as read after send:', error);
                }
                deps.db.appendMessage(m);
              } else {
                deps.dispatch({
                  type: ActionKind.MESSAGE_FAILED,
                  messageId: action.message.id,
                });
                // Save failed message to persistent store
                addFailedMessage(deps.did, action.message, {
                  retryCount: 0,
                  failureReason: 'server',
                  isRetrying: false,
                  originalMessage: action.message,
                });
              }
            })
            .catch((e) => {
              // Detect error type: network error if fetch fails, server error for HTTP response
              const failureReason = e.message?.includes('Failed to fetch') || e.name === 'NetworkError' || !navigator.onLine
                ? 'network' 
                : 'server';
              
              deps.dispatch({
                type: ActionKind.MESSAGE_FAILED,
                messageId: action.message.id,
                failureReason,
              } as any);
              // Save failed message to persistent store
              addFailedMessage(deps.did, action.message, {
                retryCount: 0,
                failureReason: failureReason as 'network' | 'server',
                isRetrying: false,
                originalMessage: action.message,
              });
              console.error(e);
            });
        } catch (error) {
          // Handle synchronous errors (like network completely unavailable)
          console.error('Synchronous error in postMessage:', error);
          deps.dispatch({
            type: ActionKind.MESSAGE_FAILED,
            messageId: action.message.id,
            failureReason: 'network',
          } as any);
          // Save failed message to persistent store
          addFailedMessage(deps.did, action.message, {
            retryCount: 0,
            failureReason: 'network',
            isRetrying: false,
            originalMessage: action.message,
          });
        }
        break;
      }
      case ActionKind.SEND_REACTION: {
        deps.gatzClient
          .reactToMessage(deps.did, action.messageId, action.reaction)
          .then((r) => {
            const { message } = r;
            deps.db.appendMessage(message);
          });
        break;
      }

      case ActionKind.UNDO_REACTION: {
        deps.gatzClient
          .undoReaction(deps.did, action.messageId, action.reaction)
          .then((r) => {
            const { message } = r;
            deps.db.appendMessage(message);
          });
        deps.dispatch({ type: ActionKind.CLOSE_MESSAGE_REACTIONS });
        break;
      }

      case ActionKind.TOGGLE_REACTION: {
        // if it already has the reaction, remove it
        // if it doesn't have the reaction, add it
        const message = deps.db.getMessageById(deps.did, action.messageId);
        if (message) {
          const userReactions = message.reactions[deps.userId] || {};
          const newAction: StateAction = {
            type: userReactions[action.reaction] ? ActionKind.UNDO_REACTION : ActionKind.SEND_REACTION,
            messageId: action.messageId,
            reaction: action.reaction,
          };
          // Recursive call to handle the toggle
          makeApplyEffect(deps)(newAction);
        }
        break;
      }

      case ActionKind.RETRY_MESSAGE: {
        // Get the original message from the retry status (stored when message failed)
        const retryStatus = (action as any).retryStatus;
        const message = retryStatus?.originalMessage;
        if (!message) {
          console.error(`Cannot retry: message ${action.messageId} not found in retry status`);
          break;
        }
        
        // Update retry state in persistent store
        updateRetryState(deps.did, action.messageId, {
          ...retryStatus,
          retryCount: retryStatus.retryCount + 1,
          isRetrying: true,
          lastRetryTime: Date.now(),
        });
        
        try {
          deps.gatzClient
            .postMessage(
              deps.did,
              message.id,
              message.text,
              message.media && message.media.map((m) => m.id),
              message.reply_to && message.reply_to,
              message.link_previews && message.link_previews.map((m) => m.id),
            )
            .then((r) => {
              const m = r.message;
              if (m) {
                deps.dispatch({
                  type: ActionKind.RETRY_SUCCESS,
                  messageId: action.messageId,
                });
                // Give time to show success before clearing
                setTimeout(() => {
                  deps.dispatch({
                    type: ActionKind.MESSAGE_SENT,
                    messageId: action.messageId,
                  });
                  // Remove from failed messages store on successful retry
                  removeFailedMessage(deps.did, action.messageId);
                  try {
                    deps.markMessageRead(m.id);
                  } catch (error) {
                    console.error('Error marking message as read after retry:', error);
                  }
                  deps.db.appendMessage(m);
                }, 3500); // 3s for success display + 500ms buffer
              } else {
                deps.dispatch({
                  type: ActionKind.MESSAGE_FAILED,
                  messageId: action.messageId,
                  failureReason: action.failureReason,
                } as any);
                // Update failed state in persistent store
                updateRetryState(deps.did, action.messageId, {
                  ...retryStatus,
                  retryCount: retryStatus.retryCount + 1,
                  failureReason: action.failureReason,
                  isRetrying: false,
                  originalMessage: message,
                });
              }
            })
            .catch((e) => {
              // Detect error type on retry
              const failureReason = e.message?.includes('Failed to fetch') || e.name === 'NetworkError' || !navigator.onLine
                ? 'network' 
                : 'server';
              
              // Show alert to inform user that retry failed
              const alertTitle = failureReason === 'network' ? 'No Connection' : 'Send Failed';
              const alertMessage = failureReason === 'network' 
                ? 'Unable to send message. Please check your internet connection and try again.'
                : 'Message could not be sent. Please try again later.';
              
              multiPlatformAlert(alertTitle, alertMessage);
              
              deps.dispatch({
                type: ActionKind.MESSAGE_FAILED,
                messageId: action.messageId,
                failureReason,
              } as any);
              // Update failed state in persistent store
              updateRetryState(deps.did, action.messageId, {
                ...retryStatus,
                retryCount: retryStatus.retryCount + 1,
                failureReason: failureReason as 'network' | 'server',
                isRetrying: false,
                originalMessage: message,
              });
              console.error('Retry failed:', e);
            });
        } catch (error) {
          // Handle synchronous errors (like network completely unavailable)
          console.error('Synchronous error in retry postMessage:', error);
          multiPlatformAlert('No Connection', 'Unable to send message. Please check your internet connection and try again.');
          deps.dispatch({
            type: ActionKind.MESSAGE_FAILED,
            messageId: action.messageId,
            failureReason: 'network',
          } as any);
          // Update failed state in persistent store
          updateRetryState(deps.did, action.messageId, {
            ...retryStatus,
            retryCount: retryStatus.retryCount + 1,
            failureReason: 'network',
            isRetrying: false,
            originalMessage: message,
          });
        }
        break;
      }
    }
  };
};