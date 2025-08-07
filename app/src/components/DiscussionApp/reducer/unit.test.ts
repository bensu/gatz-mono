/**
 * Unit tests for DiscussionApp reducer
 * 
 * Test Plan for reducer function:
 * 
 * Happy Path:
 * - Should handle all valid action types correctly
 * - Should return proper state transitions for each action
 * - Should maintain proper state structure throughout operations
 * 
 * Edge Cases:
 * - Should handle unknown/invalid action types gracefully
 * - Should handle null/undefined values in actions
 * - Should handle empty arrays and null message lists
 * - Should handle concurrent state changes appropriately
 * 
 * [immutable-state] State Immutability Tests:
 * - Should never mutate the input state object
 * - Should always return a new state object (except for TOGGLE_REACTION)
 * - Should preserve nested object references when not modified
 * - Should create new arrays when modifying collections
 * 
 * [message-ordering] Message Ordering Tests:
 * - Should maintain chronological order when adding messages
 * - Should properly append new messages to existing list
 * - Should handle empty message lists correctly
 * - Should use appendMessages utility for consistent ordering
 * 
 * [pending-tracking] Pending Message Tracking Tests:
 * - Should add message IDs to pendingMessages when sending
 * - Should remove message IDs from pendingMessages when sent successfully
 * - Should remove message IDs from pendingMessages when failed
 * - Should maintain array integrity during concurrent operations
 * 
 * [error-recovery] Error Recovery Tests:
 * - Should add failed message IDs to errorMessages array
 * - Should remove message IDs from errorMessages when retried successfully
 * - Should clean up error states appropriately
 * - Should maintain separate tracking from pending messages
 * 
 * [step-counter] Step Counter Tests:
 * - Should increment step counter for state-changing operations
 * - Should not increment step for read-only operations
 * - Should maintain monotonic incrementing behavior
 * - Should handle multiple rapid state changes correctly
 * 
 * [reaction-system] Reaction System Tests:
 * - Should set reactingToMessage when opening reaction picker
 * - Should clear reactingToMessage when closing reaction picker
 * - Should handle displayingMessageReactions state correctly
 * - Should manage multiple reaction states independently
 * 
 * [loading-states] Loading State Tests:
 * - Should set isLoadingEarlier to true when starting load
 * - Should set isLoadingEarlier to false when load completes
 * - Should set loadEarlier flag appropriately
 * - Should handle loading state transitions correctly
 * 
 * [cleanup-operations] Cleanup Operations Tests:
 * - Should remove messages from arrays when operations complete
 * - Should filter out specific message IDs correctly
 * - Should maintain array integrity during cleanup
 * - Should handle cleanup for non-existent message IDs gracefully
 */

import { reducer, State, ActionKind, StateAction } from './index';
import { makeApplyEffect } from '../applyEffect';
import * as T from '../../../gatz/types';
import { waitFor, act } from '@testing-library/react-native';

// Mock data and helper functions
const createMockMessage = (idOrProps: string | Partial<T.Message>, text: string = 'Test message'): T.Message => {
  if (typeof idOrProps === 'string') {
    return {
      id: idOrProps,
      clock: { counter: 1, node: 'test-node', ts: '2023-01-01T00:00:00Z' },
      did: 'discussion-1',
      user_id: 'user-1',
      text,
      media: [],
      edits: [],
      reactions: {},
      mentions: {},
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };
  }
  return {
    id: 'msg-1',
    clock: { counter: 1, node: 'test-node', ts: '2023-01-01T00:00:00Z' },
    did: 'discussion-1',
    user_id: 'user-1',
    text: 'Test message',
    media: [],
    edits: [],
    reactions: {},
    mentions: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...idOrProps,
  };
};

const createInitialState = (): State => ({
  messages: [],
  numberOfUsers: 0,
  step: 0,
  loadEarlier: false,
  isLoadingEarlier: false,
  isTyping: false,
  pendingMessages: [],
  errorMessages: [],
  reactingToMessage: undefined,
  displayingMessageReactions: undefined,
});

/**
 * [immutable-state] Tests for state immutability
 * 
 * Happy Path:
 * - Should return new state object for all mutations
 * - Should preserve original state references when unchanged
 * - Should use spread operator correctly for immutability
 * 
 * Edge Cases:
 * - Should handle TOGGLE_REACTION which returns same state
 * - Should not mutate nested objects or arrays
 * - Should maintain referential integrity where appropriate
 */
describe('[immutable-state] State immutability', () => {
  it('should never mutate the original state object', () => {
    const initialState = createInitialState();
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState).not.toBe(initialState);
    expect(initialState.step).toBe(0);
    expect(initialState.pendingMessages).toEqual([]);
  });

  it('should return same state reference for TOGGLE_REACTION with no implementation', () => {
    const initialState = createInitialState();
    const action: StateAction = { 
      type: ActionKind.TOGGLE_REACTION, 
      reaction: '👍', 
      messageId: 'msg-1' 
    };
    
    const newState = reducer(initialState, action);
    
    expect(newState).toBe(initialState);
  });

  it('should create new arrays when modifying collections', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['existing-msg'];
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).not.toBe(initialState.pendingMessages);
    expect(newState.pendingMessages).toEqual(['existing-msg', 'msg-1']);
    expect(initialState.pendingMessages).toEqual(['existing-msg']);
  });

  it('should handle unknown action types gracefully', () => {
    const initialState = createInitialState();
    const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
    
    const newState = reducer(initialState, unknownAction);
    
    expect(newState).toBe(initialState);
  });
});

/**
 * [message-ordering] Tests for message ordering
 * 
 * Happy Path:
 * - Should maintain chronological order when adding messages
 * - Should use appendMessages utility for consistent ordering
 * - Should handle multiple message additions correctly
 * 
 * Edge Cases:
 * - Should handle empty message lists correctly
 * - Should handle null message lists appropriately
 * - Should maintain order when loading earlier messages
 */
describe('[message-ordering] Message ordering', () => {
  it('should maintain chronological order when sending messages', () => {
    const initialState = createInitialState();
    // Create first message with earlier timestamp
    const firstMessage = createMockMessage('msg-1', 'First message');
    firstMessage.created_at = '2023-01-01T10:00:00Z';
    initialState.messages = [firstMessage];
    
    // Create second message with later timestamp
    const newMessage = createMockMessage('msg-2', 'Second message');
    newMessage.created_at = '2023-01-01T11:00:00Z';
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message: newMessage };
    
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(2);
    // appendMessages actually sorts in ascending order (older messages first)
    expect(newState.messages![0].id).toBe('msg-1');
    expect(newState.messages![1].id).toBe('msg-2');
    expect(newState.messages![0].created_at <= newState.messages![1].created_at).toBe(true);
  });

  it('should handle empty message list when sending first message', () => {
    const initialState = createInitialState();
    initialState.messages = [];
    
    const message = createMockMessage('msg-1', 'First message');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages![0].id).toBe('msg-1');
  });

  it('should handle null message list when sending message', () => {
    const initialState = createInitialState();
    initialState.messages = null;
    
    const message = createMockMessage('msg-1', 'First message');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages![0].id).toBe('msg-1');
  });

  it('should maintain order when loading earlier messages', () => {
    const initialState = createInitialState();
    const recentMessage = createMockMessage('msg-2', 'Recent message');
    recentMessage.created_at = '2023-01-01T11:00:00Z';
    initialState.messages = [recentMessage];
    
    const earlierMessage = createMockMessage('msg-1', 'Earlier message');
    earlierMessage.created_at = '2023-01-01T10:00:00Z';
    const action: StateAction = { 
      type: ActionKind.LOAD_EARLIER_MESSAGES, 
      messages: [earlierMessage] 
    };
    
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(2);
    // appendMessages sorts in ascending order (older messages first)
    expect(newState.messages![0].id).toBe('msg-1');
    expect(newState.messages![1].id).toBe('msg-2');
  });

  it('should use appendMessages for LOAD_FIRST_MESSAGES', () => {
    const initialState = createInitialState();
    
    const msg1 = createMockMessage('msg-1', 'First');
    msg1.created_at = '2023-01-01T10:00:00Z';
    const msg2 = createMockMessage('msg-2', 'Second');
    msg2.created_at = '2023-01-01T11:00:00Z';
    
    const action: StateAction = { 
      type: ActionKind.LOAD_FIRST_MESSAGES, 
      messages: [msg1, msg2], 
      numberOfUsers: 5 
    };
    
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(2);
    // appendMessages sorts in ascending order (older messages first)
    expect(newState.messages![0].id).toBe('msg-1');
    expect(newState.messages![1].id).toBe('msg-2');
    expect(newState.numberOfUsers).toBe(5);
  });
});

/**
 * [pending-tracking] Tests for pending message tracking
 * 
 * Happy Path:
 * - Should add message IDs to pendingMessages when sending
 * - Should remove message IDs from pendingMessages when sent successfully
 * - Should handle multiple pending messages correctly
 * 
 * Edge Cases:
 * - Should handle removing non-existent message IDs gracefully
 * - Should maintain array integrity during concurrent operations
 * - Should track both SEND_MESSAGE and EDIT_MESSAGE as pending
 */
describe('[pending-tracking] Pending message tracking', () => {
  it('should add message ID to pendingMessages when sending message', () => {
    const initialState = createInitialState();
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toContain('msg-1');
    expect(newState.pendingMessages).toHaveLength(1);
  });

  it('should add message ID to pendingMessages when editing message', () => {
    const initialState = createInitialState();
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.EDIT_MESSAGE, message };
    
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toContain('msg-1');
    expect(newState.pendingMessages).toHaveLength(1);
  });

  it('should remove message ID from pendingMessages when message sent successfully', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1', 'msg-2'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).not.toContain('msg-1');
    expect(newState.pendingMessages).toContain('msg-2');
    expect(newState.pendingMessages).toHaveLength(1);
  });

  it('should handle multiple pending messages correctly', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['existing-msg'];
    
    const message = createMockMessage('new-msg');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toContain('existing-msg');
    expect(newState.pendingMessages).toContain('new-msg');
    expect(newState.pendingMessages).toHaveLength(2);
  });

  it('should handle removing non-existent message ID gracefully', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1', 'msg-2'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'non-existent' };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toEqual(['msg-1', 'msg-2']);
    expect(newState.pendingMessages).toHaveLength(2);
  });

  it('should remove message from pendingMessages when message fails', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1', 'msg-2'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_FAILED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).not.toContain('msg-1');
    expect(newState.pendingMessages).toContain('msg-2');
    expect(newState.pendingMessages).toHaveLength(1);
  });
});

/**
 * [error-recovery] Tests for error recovery
 * 
 * Happy Path:
 * - Should add failed message IDs to errorMessages array
 * - Should remove message IDs from errorMessages when retried successfully
 * - Should handle error state cleanup appropriately
 * 
 * Edge Cases:
 * - Should maintain separate tracking from pending messages
 * - Should handle removing non-existent error message IDs gracefully
 * - Should clean up both pending and error states when message succeeds
 */
describe('[error-recovery] Error recovery', () => {
  it('should add message ID to errorMessages when message fails', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_FAILED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.errorMessages).toContain('msg-1');
    expect(newState.errorMessages).toHaveLength(1);
    expect(newState.pendingMessages).not.toContain('msg-1');
  });

  it('should remove message from errorMessages when message sent successfully', () => {
    const initialState = createInitialState();
    initialState.errorMessages = ['msg-1', 'msg-2'];
    initialState.pendingMessages = ['msg-1'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.errorMessages).not.toContain('msg-1');
    expect(newState.errorMessages).toContain('msg-2');
    expect(newState.errorMessages).toHaveLength(1);
    expect(newState.pendingMessages).not.toContain('msg-1');
  });

  it('should handle multiple error messages correctly', () => {
    const initialState = createInitialState();
    initialState.errorMessages = ['existing-error'];
    initialState.pendingMessages = ['msg-1'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_FAILED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.errorMessages).toContain('existing-error');
    expect(newState.errorMessages).toContain('msg-1');
    expect(newState.errorMessages).toHaveLength(2);
  });

  it('should handle removing non-existent error message ID gracefully', () => {
    const initialState = createInitialState();
    initialState.errorMessages = ['msg-1', 'msg-2'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'non-existent' };
    const newState = reducer(initialState, action);
    
    expect(newState.errorMessages).toEqual(['msg-1', 'msg-2']);
    expect(newState.errorMessages).toHaveLength(2);
  });
});

/**
 * [step-counter] Tests for step counter
 * 
 * Happy Path:
 * - Should increment step counter for state-changing operations
 * - Should maintain monotonic incrementing behavior
 * - Should handle multiple rapid state changes correctly
 * 
 * Edge Cases:
 * - Should not increment step for read-only operations
 * - Should increment for both message and UI state changes
 */
describe('[step-counter] Step counter', () => {
  it('should increment step counter when sending message', () => {
    const initialState = createInitialState();
    initialState.step = 5;
    
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.SEND_MESSAGE, message };
    const newState = reducer(initialState, action);
    
    expect(newState.step).toBe(6);
  });

  it('should increment step counter when editing message', () => {
    const initialState = createInitialState();
    initialState.step = 10;
    
    const message = createMockMessage('msg-1');
    const action: StateAction = { type: ActionKind.EDIT_MESSAGE, message };
    const newState = reducer(initialState, action);
    
    expect(newState.step).toBe(11);
  });

  it('should not increment step counter for MESSAGE_SENT', () => {
    const initialState = createInitialState();
    initialState.step = 3;
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.step).toBe(3);
  });

  it('should not increment step counter for MESSAGE_FAILED', () => {
    const initialState = createInitialState();
    initialState.step = 7;
    
    const action: StateAction = { type: ActionKind.MESSAGE_FAILED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.step).toBe(7);
  });

  it('should not increment step counter for loading operations', () => {
    const initialState = createInitialState();
    initialState.step = 2;
    
    const action: StateAction = { type: ActionKind.LOAD_EARLIER_START };
    const newState = reducer(initialState, action);
    
    expect(newState.step).toBe(2);
  });
});

/**
 * [reaction-system] Tests for reaction system
 * 
 * Happy Path:
 * - Should set reactingToMessage when opening reaction picker
 * - Should clear reactingToMessage when closing reaction picker
 * - Should handle displayingMessageReactions state correctly
 * 
 * Edge Cases:
 * - Should manage multiple reaction states independently
 * - Should handle reaction picker and display states separately
 */
describe('[reaction-system] Reaction system', () => {
  it('should set reactingToMessage when opening reaction picker', () => {
    const initialState = createInitialState();
    const message = createMockMessage('msg-1');
    
    const action: StateAction = { type: ActionKind.OPEN_REACTION_PICKER, message };
    const newState = reducer(initialState, action);
    
    expect(newState.reactingToMessage).toBe(message);
  });

  it('should clear reactingToMessage when closing reaction picker', () => {
    const initialState = createInitialState();
    initialState.reactingToMessage = createMockMessage('msg-1');
    
    const action: StateAction = { type: ActionKind.CLOSE_REACTION_PICKER };
    const newState = reducer(initialState, action);
    
    expect(newState.reactingToMessage).toBeUndefined();
  });

  it('should clear reactingToMessage when sending reaction', () => {
    const initialState = createInitialState();
    initialState.reactingToMessage = createMockMessage('msg-1');
    
    const action: StateAction = { 
      type: ActionKind.SEND_REACTION, 
      reaction: '👍', 
      messageId: 'msg-1' 
    };
    const newState = reducer(initialState, action);
    
    expect(newState.reactingToMessage).toBeUndefined();
  });

  it('should set displayingMessageReactions when displaying reactions', () => {
    const initialState = createInitialState();
    const message = createMockMessage('msg-1');
    
    const action: StateAction = { type: ActionKind.DISPLAY_MESSAGE_REACTIONS, message };
    const newState = reducer(initialState, action);
    
    expect(newState.displayingMessageReactions).toBe(message);
  });

  it('should clear all reaction states when closing message reactions', () => {
    const initialState = createInitialState();
    initialState.reactingToMessage = createMockMessage('msg-1');
    initialState.displayingMessageReactions = createMockMessage('msg-2');
    
    const action: StateAction = { type: ActionKind.CLOSE_MESSAGE_REACTIONS };
    const newState = reducer(initialState, action);
    
    expect(newState.reactingToMessage).toBeUndefined();
    expect(newState.displayingMessageReactions).toBeUndefined();
  });
});

/**
 * [loading-states] Tests for loading states
 * 
 * Happy Path:
 * - Should set isLoadingEarlier to true when starting load
 * - Should set isLoadingEarlier to false when load completes
 * - Should set loadEarlier flag appropriately
 * 
 * Edge Cases:
 * - Should handle loading state transitions correctly
 * - Should manage loading flags independently
 */
describe('[loading-states] Loading states', () => {
  it('should set isLoadingEarlier to true when starting to load earlier', () => {
    const initialState = createInitialState();
    
    const action: StateAction = { type: ActionKind.LOAD_EARLIER_START };
    const newState = reducer(initialState, action);
    
    expect(newState.isLoadingEarlier).toBe(true);
  });

  it('should set loading flags correctly when loading first messages', () => {
    const initialState = createInitialState();
    initialState.isLoadingEarlier = true;
    
    const messages = [createMockMessage('msg-1')];
    const action: StateAction = { 
      type: ActionKind.LOAD_FIRST_MESSAGES, 
      messages, 
      numberOfUsers: 3 
    };
    const newState = reducer(initialState, action);
    
    expect(newState.loadEarlier).toBe(true);
    expect(newState.isLoadingEarlier).toBe(false);
    expect(newState.numberOfUsers).toBe(3);
  });

  it('should set loading flags correctly when loading earlier messages', () => {
    const initialState = createInitialState();
    initialState.isLoadingEarlier = true;
    
    const messages = [createMockMessage('msg-1')];
    const action: StateAction = { type: ActionKind.LOAD_EARLIER_MESSAGES, messages };
    const newState = reducer(initialState, action);
    
    expect(newState.loadEarlier).toBe(true);
    expect(newState.isLoadingEarlier).toBe(false);
  });
});

/**
 * [cleanup-operations] Tests for cleanup operations
 * 
 * Happy Path:
 * - Should remove messages from arrays when operations complete
 * - Should filter out specific message IDs correctly
 * - Should maintain array integrity during cleanup
 * 
 * Edge Cases:
 * - Should handle cleanup for non-existent message IDs gracefully
 * - Should remove messages from message list when deleted or flagged
 */
describe('[cleanup-operations] Cleanup operations', () => {
  it('should remove message from message list when deleted', () => {
    const initialState = createInitialState();
    const msg1 = createMockMessage('msg-1');
    const msg2 = createMockMessage('msg-2');
    initialState.messages = [msg1, msg2];
    
    const action: StateAction = { type: ActionKind.MESSAGE_DELETED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages![0].id).toBe('msg-2');
  });

  it('should remove message from message list when flagged', () => {
    const initialState = createInitialState();
    const msg1 = createMockMessage('msg-1');
    const msg2 = createMockMessage('msg-2');
    initialState.messages = [msg1, msg2];
    
    const action: StateAction = { type: ActionKind.FLAG_MESSAGE, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages![0].id).toBe('msg-2');
  });

  it('should handle removing non-existent message ID from message list gracefully', () => {
    const initialState = createInitialState();
    const msg1 = createMockMessage('msg-1');
    const msg2 = createMockMessage('msg-2');
    initialState.messages = [msg1, msg2];
    
    const action: StateAction = { type: ActionKind.MESSAGE_DELETED, messageId: 'non-existent' };
    const newState = reducer(initialState, action);
    
    expect(newState.messages).toHaveLength(2);
    expect(newState.messages![0].id).toBe('msg-1');
    expect(newState.messages![1].id).toBe('msg-2');
  });

  it('should clean up both pending and error arrays on MESSAGE_SENT', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1', 'msg-2'];
    initialState.errorMessages = ['msg-1', 'msg-3'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_SENT, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toEqual(['msg-2']);
    expect(newState.errorMessages).toEqual(['msg-3']);
  });

  it('should clean up pending array on MESSAGE_FAILED', () => {
    const initialState = createInitialState();
    initialState.pendingMessages = ['msg-1', 'msg-2'];
    initialState.errorMessages = ['msg-3'];
    
    const action: StateAction = { type: ActionKind.MESSAGE_FAILED, messageId: 'msg-1' };
    const newState = reducer(initialState, action);
    
    expect(newState.pendingMessages).toEqual(['msg-2']);
    expect(newState.errorMessages).toEqual(['msg-3', 'msg-1']);
  });
});

/**
 * Tests for extracted makeApplyEffect function
 */
describe('makeApplyEffect', () => {
  const mockGatzClient = {
    deleteMessage: jest.fn(),
    flagMessage: jest.fn(),
    editMessage: jest.fn(),
    postMessage: jest.fn(),
    reactToMessage: jest.fn(),
    undoReaction: jest.fn(),
  };

  const mockDispatch = jest.fn();
  const mockDb = {
    getMessageById: jest.fn(),
    appendMessage: jest.fn(),
  };
  const mockMarkMessageRead = jest.fn();

  const did = 'discussion-123';
  const userId = 'user-123';

  const createApplyEffect = () => {
    return makeApplyEffect({
      gatzClient: mockGatzClient,
      dispatch: mockDispatch,
      db: mockDb,
      did,
      userId,
      markMessageRead: mockMarkMessageRead,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE_MESSAGE', () => {
    it('should call gatzClient.deleteMessage and dispatch MESSAGE_DELETED on success', async () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      
      mockGatzClient.deleteMessage.mockResolvedValue({ status: 'success' });

      applyEffect({ type: ActionKind.DELETE_MESSAGE, messageId });

      expect(mockGatzClient.deleteMessage).toHaveBeenCalledWith(did, messageId);
      
      // Wait for the promise to resolve
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ActionKind.MESSAGE_DELETED,
          messageId,
        });
      });
    });

    it('should not dispatch MESSAGE_DELETED on failure', async () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      
      mockGatzClient.deleteMessage.mockResolvedValue({ status: 'error' });

      applyEffect({ type: ActionKind.DELETE_MESSAGE, messageId });

      expect(mockGatzClient.deleteMessage).toHaveBeenCalledWith(did, messageId);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('FLAG_MESSAGE', () => {
    it('should call gatzClient.flagMessage', () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';

      applyEffect({ type: ActionKind.FLAG_MESSAGE, messageId });

      expect(mockGatzClient.flagMessage).toHaveBeenCalledWith(did, messageId);
    });
  });

  describe('EDIT_MESSAGE', () => {
    it('should call gatzClient.editMessage', () => {
      const applyEffect = createApplyEffect();
      const message = {
        id: 'msg-123',
        text: 'Updated text',
      } as T.Message;

      applyEffect({ type: ActionKind.EDIT_MESSAGE, message });

      expect(mockGatzClient.editMessage).toHaveBeenCalledWith(
        did,
        message.id,
        message.text
      );
    });
  });

  describe('SEND_MESSAGE', () => {
    it('should call postMessage and dispatch MESSAGE_SENT on success', async () => {
      const applyEffect = createApplyEffect();
      const message = createMockMessage({
        id: 'msg-123',
        text: 'Test message',
        media: [{ id: 'media-1' }] as any,
        reply_to: 'reply-id',
        link_previews: [{ id: 'preview-1' }] as any,
      });

      const responseMessage = { ...message, id: 'server-msg-id' };
      mockGatzClient.postMessage.mockResolvedValue({ message: responseMessage });

      applyEffect({ type: ActionKind.SEND_MESSAGE, message });

      expect(mockMarkMessageRead).toHaveBeenCalledWith(message.id);
      expect(mockGatzClient.postMessage).toHaveBeenCalledWith(
        did,
        message.id,
        message.text,
        ['media-1'],
        'reply-id',
        ['preview-1']
      );

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ActionKind.MESSAGE_SENT,
          messageId: message.id,
        });
        expect(mockMarkMessageRead).toHaveBeenCalledWith(responseMessage.id);
        expect(mockDb.appendMessage).toHaveBeenCalledWith(responseMessage);
      });
    });

    it('should dispatch MESSAGE_FAILED on postMessage failure', async () => {
      const applyEffect = createApplyEffect();
      const message = createMockMessage({ id: 'msg-123', text: 'Test message' });

      mockGatzClient.postMessage.mockResolvedValue({ message: undefined });

      applyEffect({ type: ActionKind.SEND_MESSAGE, message });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ActionKind.MESSAGE_FAILED,
          messageId: message.id,
        });
      });
    });

    it('should dispatch MESSAGE_FAILED on postMessage exception', async () => {
      const applyEffect = createApplyEffect();
      const message = createMockMessage({ id: 'msg-123', text: 'Test message' });

      mockGatzClient.postMessage.mockRejectedValue(new Error('Network error'));

      applyEffect({ type: ActionKind.SEND_MESSAGE, message });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ActionKind.MESSAGE_FAILED,
          messageId: message.id,
          failureReason: expect.any(String),
        });
      });
    });
  });

  describe('SEND_REACTION', () => {
    it('should call reactToMessage and append message to db', async () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      const reaction = '👍';
      const updatedMessage = createMockMessage({
        id: messageId,
        reactions: { [userId]: { [reaction]: true } },
      });

      mockGatzClient.reactToMessage.mockResolvedValue({ message: updatedMessage });

      applyEffect({ type: ActionKind.SEND_REACTION, messageId, reaction });

      expect(mockGatzClient.reactToMessage).toHaveBeenCalledWith(did, messageId, reaction);

      await waitFor(() => {
        expect(mockDb.appendMessage).toHaveBeenCalledWith(updatedMessage);
      });
    });
  });

  describe('UNDO_REACTION', () => {
    it('should call undoReaction, append message, and close reactions', async () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      const reaction = '👍';
      const updatedMessage = createMockMessage({
        id: messageId,
        reactions: {},
      });

      mockGatzClient.undoReaction.mockResolvedValue({ message: updatedMessage });

      applyEffect({ type: ActionKind.UNDO_REACTION, messageId, reaction });

      expect(mockGatzClient.undoReaction).toHaveBeenCalledWith(did, messageId, reaction);

      await waitFor(() => {
        expect(mockDb.appendMessage).toHaveBeenCalledWith(updatedMessage);
        expect(mockDispatch).toHaveBeenCalledWith({ type: ActionKind.CLOSE_MESSAGE_REACTIONS });
      });
    });
  });

  describe('TOGGLE_REACTION', () => {
    it('should send reaction if user does not have it', () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      const reaction = '👍';
      const message = createMockMessage({
        id: messageId,
        reactions: {}, // No reactions
      });

      mockDb.getMessageById.mockReturnValue(message);
      mockGatzClient.reactToMessage.mockResolvedValue({ message: { ...message, reactions: { [userId]: { [reaction]: true } } } });

      applyEffect({ type: ActionKind.TOGGLE_REACTION, messageId, reaction });

      expect(mockDb.getMessageById).toHaveBeenCalledWith(did, messageId);
      expect(mockGatzClient.reactToMessage).toHaveBeenCalledWith(did, messageId, reaction);
    });

    it('should undo reaction if user already has it', () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      const reaction = '👍';
      const message = createMockMessage({
        id: messageId,
        reactions: { [userId]: { [reaction]: true } }, // User has this reaction
      });

      mockDb.getMessageById.mockReturnValue(message);
      mockGatzClient.undoReaction.mockResolvedValue({ message: { ...message, reactions: {} } });

      applyEffect({ type: ActionKind.TOGGLE_REACTION, messageId, reaction });

      expect(mockDb.getMessageById).toHaveBeenCalledWith(did, messageId);
      expect(mockGatzClient.undoReaction).toHaveBeenCalledWith(did, messageId, reaction);
    });

    it('should do nothing if message not found', () => {
      const applyEffect = createApplyEffect();
      const messageId = 'msg-123';
      const reaction = '👍';

      mockDb.getMessageById.mockReturnValue(null);

      applyEffect({ type: ActionKind.TOGGLE_REACTION, messageId, reaction });

      expect(mockDb.getMessageById).toHaveBeenCalledWith(did, messageId);
      expect(mockGatzClient.reactToMessage).not.toHaveBeenCalled();
      expect(mockGatzClient.undoReaction).not.toHaveBeenCalled();
    });
  });
});

