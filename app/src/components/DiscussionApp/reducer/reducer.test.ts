import { reducer, State, ActionKind, MessageRetryState } from './index';
import * as T from '../../../gatz/types';

describe('DiscussionApp reducer - retry functionality', () => {
  const mockMessage: T.Message = {
    id: 'msg-123',
    text: 'Test message',
    clock: { counter: 0, node: 'test', ts: '2024-01-01T00:00:00Z' },
    did: 'discussion-123',
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    edits: [],
    reactions: {},
    mentions: {},
    media: [],
  };

  const initialState: State = {
    messages: [mockMessage],
    numberOfUsers: 1,
    step: 0,
    pendingMessages: [],
    errorMessages: [],
    messageRetryStatus: {},
  };

  describe('MESSAGE_FAILED action', () => {
    it('should add message to errorMessages and initialize retry status with network error', () => {
      const stateWithPending: State = {
        ...initialState,
        pendingMessages: ['msg-123'],
      };

      const action = {
        type: ActionKind.MESSAGE_FAILED,
        messageId: 'msg-123',
        failureReason: 'network' as const,
      } as any;

      const newState = reducer(stateWithPending, action);

      expect(newState.pendingMessages).toEqual([]);
      expect(newState.errorMessages).toEqual(['msg-123']);
      expect(newState.messageRetryStatus['msg-123']).toEqual({
        retryCount: 0,
        failureReason: 'network',
        isRetrying: false,
        originalMessage: mockMessage,
      });
    });

    it('should initialize retry status with server error when failureReason is not provided', () => {
      const stateWithPending: State = {
        ...initialState,
        pendingMessages: ['msg-123'],
      };

      const action = {
        type: ActionKind.MESSAGE_FAILED,
        messageId: 'msg-123',
      } as any;

      const newState = reducer(stateWithPending, action);

      expect(newState.messageRetryStatus['msg-123']).toEqual({
        retryCount: 0,
        failureReason: 'server',
        isRetrying: false,
        originalMessage: mockMessage,
      });
    });
  });

  describe('RETRY_MESSAGE action', () => {
    it('should add message to pendingMessages and update retry status', () => {
      const stateWithError: State = {
        ...initialState,
        errorMessages: ['msg-123'],
        messageRetryStatus: {
          'msg-123': {
            retryCount: 0,
            failureReason: 'network',
            isRetrying: false,
          },
        },
      };

      const action = {
        type: ActionKind.RETRY_MESSAGE,
        messageId: 'msg-123',
        failureReason: 'network' as const,
        retryStatus: {
          retryCount: 0,
          failureReason: 'network' as const,
          isRetrying: false,
        },
      };

      const newState = reducer(stateWithError, action);

      expect(newState.pendingMessages).toEqual(['msg-123']);
      expect(newState.messageRetryStatus['msg-123']).toEqual({
        retryCount: 1,
        failureReason: 'network',
        isRetrying: true,
        lastRetryTime: expect.any(Number),
      });
    });

    it('should increment retry count on subsequent retries', () => {
      const stateWithRetry: State = {
        ...initialState,
        messageRetryStatus: {
          'msg-123': {
            retryCount: 2,
            failureReason: 'server',
            isRetrying: false,
          },
        },
      };

      const action = {
        type: ActionKind.RETRY_MESSAGE,
        messageId: 'msg-123',
        failureReason: 'server' as const,
        retryStatus: {
          retryCount: 2,
          failureReason: 'server' as const,
          isRetrying: false,
        },
      };

      const newState = reducer(stateWithRetry, action);

      expect(newState.messageRetryStatus['msg-123'].retryCount).toBe(3);
    });
  });

  describe('RETRY_SUCCESS action', () => {
    it('should mark message as success', () => {
      const stateWithRetrying: State = {
        ...initialState,
        messageRetryStatus: {
          'msg-123': {
            retryCount: 1,
            failureReason: 'network',
            isRetrying: true,
          },
        },
      };

      const action = {
        type: ActionKind.RETRY_SUCCESS,
        messageId: 'msg-123',
      };

      const newState = reducer(stateWithRetrying, action);

      expect(newState.messageRetryStatus['msg-123']).toEqual({
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
        isSuccess: true,
      });
    });
  });

  describe('MESSAGE_SENT action', () => {
    it('should clean up retry status when message is sent', () => {
      const stateWithRetry: State = {
        ...initialState,
        pendingMessages: ['msg-123'],
        errorMessages: ['msg-123'],
        messageRetryStatus: {
          'msg-123': {
            retryCount: 1,
            failureReason: 'network',
            isRetrying: false,
            isSuccess: true,
          },
        },
      };

      const action = {
        type: ActionKind.MESSAGE_SENT,
        messageId: 'msg-123',
      };

      const newState = reducer(stateWithRetry, action);

      expect(newState.pendingMessages).toEqual([]);
      expect(newState.errorMessages).toEqual([]);
      expect(newState.messageRetryStatus['msg-123']).toBeUndefined();
    });
  });
});