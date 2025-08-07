import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFailedMessagesStore, FailedMessage } from './failedMessagesStore';
import * as T from '../types';
import { MessageRetryState } from '../../components/DiscussionApp/reducer';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('useFailedMessagesStore', () => {
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

  const mockRetryState: MessageRetryState = {
    retryCount: 0,
    failureReason: 'network',
    isRetrying: false,
    originalMessage: mockMessage,
  };

  beforeEach(() => {
    // Clear store before each test
    const { result } = renderHook(() => useFailedMessagesStore());
    act(() => {
      result.current.failedMessages = {};
    });
    jest.clearAllMocks();
  });

  describe('addFailedMessage', () => {
    it('should add a new failed message', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
      });

      const failedMessages = result.current.getFailedMessages('discussion-123');
      expect(failedMessages).toHaveLength(1);
      expect(failedMessages[0].message).toEqual(mockMessage);
      expect(failedMessages[0].retryState).toEqual(mockRetryState);
      expect(failedMessages[0].failedAt).toBeDefined();
    });

    it('should update existing failed message', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      // Add initial message
      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
      });

      // Update with new retry state
      const updatedRetryState: MessageRetryState = {
        ...mockRetryState,
        retryCount: 1,
        isRetrying: true,
      };

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, updatedRetryState);
      });

      const failedMessages = result.current.getFailedMessages('discussion-123');
      expect(failedMessages).toHaveLength(1); // Still only one message
      expect(failedMessages[0].retryState.retryCount).toBe(1);
      expect(failedMessages[0].retryState.isRetrying).toBe(true);
    });

    it('should handle multiple discussions independently', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      const message2 = { ...mockMessage, id: 'msg-456', did: 'discussion-456' };

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
        result.current.addFailedMessage('discussion-456', message2, mockRetryState);
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(1);
      expect(result.current.getFailedMessages('discussion-456')).toHaveLength(1);
      expect(result.current.getFailedMessageCount()).toBe(2);
    });
  });

  describe('removeFailedMessage', () => {
    it('should remove a failed message', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(1);

      act(() => {
        result.current.removeFailedMessage('discussion-123', 'msg-123');
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(0);
    });

    it('should clean up empty discussion entries', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
        result.current.removeFailedMessage('discussion-123', 'msg-123');
      });

      expect(result.current.failedMessages['discussion-123']).toBeUndefined();
    });

    it('should handle non-existent message gracefully', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.removeFailedMessage('discussion-123', 'non-existent');
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(0);
    });
  });

  describe('updateRetryState', () => {
    it('should update retry state for existing message', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
      });

      const updatedRetryState: MessageRetryState = {
        ...mockRetryState,
        retryCount: 2,
        isRetrying: true,
        lastRetryTime: Date.now(),
      };

      act(() => {
        result.current.updateRetryState('discussion-123', 'msg-123', updatedRetryState);
      });

      const failedMessages = result.current.getFailedMessages('discussion-123');
      expect(failedMessages[0].retryState).toEqual(updatedRetryState);
    });

    it('should handle non-existent discussion gracefully', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.updateRetryState('non-existent', 'msg-123', mockRetryState);
      });

      expect(result.current.getFailedMessages('non-existent')).toHaveLength(0);
    });
  });

  describe('clearDiscussionMessages', () => {
    it('should clear all messages for a discussion', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      const message2 = { ...mockMessage, id: 'msg-456' };

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
        result.current.addFailedMessage('discussion-123', message2, mockRetryState);
        result.current.addFailedMessage('discussion-456', mockMessage, mockRetryState);
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(2);
      expect(result.current.getFailedMessageCount()).toBe(3);

      act(() => {
        result.current.clearDiscussionMessages('discussion-123');
      });

      expect(result.current.getFailedMessages('discussion-123')).toHaveLength(0);
      expect(result.current.getFailedMessages('discussion-456')).toHaveLength(1);
      expect(result.current.getFailedMessageCount()).toBe(1);
    });
  });

  describe('getFailedMessageCount', () => {
    it('should return correct count across all discussions', () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      expect(result.current.getFailedMessageCount()).toBe(0);

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
        result.current.addFailedMessage('discussion-123', { ...mockMessage, id: 'msg-456' }, mockRetryState);
        result.current.addFailedMessage('discussion-789', mockMessage, mockRetryState);
      });

      expect(result.current.getFailedMessageCount()).toBe(3);
    });
  });

  describe('persistence', () => {
    it('should persist to AsyncStorage', async () => {
      const { result } = renderHook(() => useFailedMessagesStore());

      act(() => {
        result.current.addFailedMessage('discussion-123', mockMessage, mockRetryState);
      });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'gatz/failed-messages',
        expect.any(String)
      );
    });
  });
});