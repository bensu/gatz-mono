import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MessageStatus, MessageStatusType, areMessageStatusesEqual } from './MessageStatus';

describe('MessageStatus', () => {
  const mockOnRetryPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render anything when status is undefined', () => {
      const { queryByText } = render(
        <MessageStatus
          status={undefined as any}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );
      expect(queryByText('Success!')).toBeNull();
      expect(queryByText('Failed to send')).toBeNull();
      expect(queryByText('No connection')).toBeNull();
    });

    it('should render success message when isSuccess is true', () => {
      const status: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={true}
        />
      );

      expect(getByText('Success!')).toBeTruthy();
    });

    it('should render "No connection" for network errors', () => {
      const status: MessageStatusType = {
        retryCount: 0,
        failureReason: 'network',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      expect(getByText('No connection • Tap to retry')).toBeTruthy();
    });

    it('should render "Failed to send" for server errors', () => {
      const status: MessageStatusType = {
        retryCount: 0,
        failureReason: 'server',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      expect(getByText('Failed to send • Tap to retry')).toBeTruthy();
    });

    it('should render retrying state', () => {
      const status: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: true,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      expect(getByText('No connection • Retrying...')).toBeTruthy();
    });

    it('should show "Tap to retry" when not retrying', () => {
      const status: MessageStatusType = {
        retryCount: 0,
        failureReason: 'server',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      expect(getByText('Failed to send • Tap to retry')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onRetryPress when tapping on retryable message', () => {
      const status: MessageStatusType = {
        retryCount: 0,
        failureReason: 'network',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      fireEvent.press(getByText('No connection • Tap to retry'));
      expect(mockOnRetryPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onRetryPress when status is retrying', () => {
      const status: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: true,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={false}
        />
      );

      fireEvent.press(getByText('No connection • Retrying...'));
      expect(mockOnRetryPress).not.toHaveBeenCalled();
    });
  });

  describe('Success animation', () => {
    it('should show success state when isSuccess is true', () => {
      const status: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
      };

      const { getByText } = render(
        <MessageStatus
          status={status}
          onRetryPress={mockOnRetryPress}
          isSuccess={true}
        />
      );

      expect(getByText('Success!')).toBeTruthy();

      // Verify that the component renders with success state
      // Note: Testing the actual fade animation timing is challenging with react-native-testing-library
      // as it involves react-native-reanimated which requires more complex setup
    });
  });

  describe('areMessageStatusesEqual', () => {
    it('should return true when both statuses are undefined', () => {
      expect(areMessageStatusesEqual(undefined, undefined)).toBe(true);
    });

    it('should return false when one status is undefined', () => {
      const status: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
      };
      expect(areMessageStatusesEqual(status, undefined)).toBe(false);
      expect(areMessageStatusesEqual(undefined, status)).toBe(false);
    });

    it('should return true when statuses are equal', () => {
      const status1: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
        lastRetryTime: 1234567890,
      };
      const status2: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
        lastRetryTime: 1234567890,
      };
      expect(areMessageStatusesEqual(status1, status2)).toBe(true);
    });

    it('should return false when statuses differ', () => {
      const status1: MessageStatusType = {
        retryCount: 1,
        failureReason: 'network',
        isRetrying: false,
      };
      const status2: MessageStatusType = {
        retryCount: 2,
        failureReason: 'network',
        isRetrying: false,
      };
      expect(areMessageStatusesEqual(status1, status2)).toBe(false);
    });
  });
});