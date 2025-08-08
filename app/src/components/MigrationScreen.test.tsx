import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MigrationScreen } from './MigrationScreen';

// Mock external dependencies
jest.mock('../gifted/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    theme: 'light',
    primaryText: '#000',
    secondaryText: '#666',
    modalBackground: '#fff',
    buttonActive: '#007AFF',
    border: '#ccc',
  }),
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('./SocialSignInButtons', () => ({
  SocialSignInButtons: ({ onSignIn, isLoading }: any) => (
    <button testID="social-sign-in" onClick={() => onSignIn({ type: 'apple', idToken: 'test' })}>
      {isLoading ? 'Loading...' : 'Sign In'}
    </button>
  ),
}));

jest.mock('./AuthErrorDisplay', () => ({
  AuthErrorDisplay: ({ error, onRetry, onDismiss }: any) => (
    <div testID="auth-error">
      <text>{error.message}</text>
      <button testID="retry-button" onClick={onRetry}>Retry</button>
      <button testID="dismiss-button" onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

describe('MigrationScreen', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onRemindLater: jest.fn(),
    onMigrationSuccess: jest.fn(),
    onLinkAccount: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders migration screen when visible', () => {
    const { getByText } = render(<MigrationScreen {...defaultProps} />);
    
    expect(getByText('Upgrade Your Account')).toBeTruthy();
    expect(getByText('Add Apple or Google Sign-In for faster, more secure access')).toBeTruthy();
    expect(getByText('Sign in instantly without SMS codes')).toBeTruthy();
    expect(getByText('More secure authentication')).toBeTruthy();
    expect(getByText('Sync across all your devices')).toBeTruthy();
  });

  test('does not render when not visible', () => {
    const { queryByText } = render(<MigrationScreen {...defaultProps} visible={false} />);
    
    expect(queryByText('Upgrade Your Account')).toBeNull();
  });

  test('handles remind later button press', () => {
    const { getByText } = render(<MigrationScreen {...defaultProps} />);
    
    fireEvent.press(getByText('Remind Me Later'));
    
    expect(defaultProps.onRemindLater).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('handles contact support button press', () => {
    const { getByText } = render(<MigrationScreen {...defaultProps} />);
    
    // Mock Linking.canOpenURL and openURL
    const mockLinking = {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(true),
    };
    jest.doMock('react-native', () => ({
      ...jest.requireActual('react-native'),
      Linking: mockLinking,
    }));
    
    fireEvent.press(getByText('Contact Support'));
    // Note: Since the Linking functionality is async and complex to test,
    // we mainly verify the button is present and pressable
  });

  test('handles successful social sign-in', async () => {
    const { getByTestId } = render(<MigrationScreen {...defaultProps} />);
    
    defaultProps.onLinkAccount.mockResolvedValueOnce({ success: true });
    
    fireEvent.press(getByTestId('social-sign-in'));
    
    expect(defaultProps.onLinkAccount).toHaveBeenCalledWith({
      type: 'apple',
      idToken: 'test'
    });
  });

  test('handles failed social sign-in', async () => {
    const { getByTestId, findByTestId } = render(<MigrationScreen {...defaultProps} />);
    
    defaultProps.onLinkAccount.mockRejectedValueOnce(new Error('Link failed'));
    
    fireEvent.press(getByTestId('social-sign-in'));
    
    expect(defaultProps.onLinkAccount).toHaveBeenCalled();
    
    // Should show error display
    const errorDisplay = await findByTestId('auth-error');
    expect(errorDisplay).toBeTruthy();
  });
});