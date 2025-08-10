import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountLinkingSection, getLinkedAccountsText, AccountLinkingModal, useAccountLinking } from './AccountLinking';
import * as T from '../gatz/types';
import { ThemeProvider } from '../context/ThemeProvider';

// Mock the MigrationScreen component
jest.mock('./MigrationScreen', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    MigrationScreen: jest.fn(({ visible, onClose, onMigrationSuccess }) => 
      visible ? (
        <View testID="migration-screen">
          <TouchableOpacity testID="close-migration" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="complete-migration" onPress={onMigrationSuccess}>
            <Text>Complete</Text>
          </TouchableOpacity>
        </View>
      ) : null
    )
  };
});

// Mock theme colors
const mockThemeColors = {
  primaryText: '#000000',
  secondaryText: '#666666',
  appBackground: '#ffffff',
  buttonActive: '#007AFF',
};

jest.mock('../gifted/hooks/useThemeColors', () => ({
  useThemeColors: () => mockThemeColors,
}));

describe('AccountLinking', () => {
  const mockGatzClient = {
    linkApple: jest.fn(),
    linkGoogle: jest.fn(),
    linkEmail: jest.fn(),
  } as any;

  const mockOnUserUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <ThemeProvider>
        {component}
      </ThemeProvider>
    );
  };

  describe('getLinkedAccountsText', () => {
    it('returns "Authentication with SMS" for user with no linked accounts', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const result = getLinkedAccountsText(user);
      expect(result).toBe('Authentication with SMS');
    });

    it('returns correct text for user with email only', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        email: 'user@example.com',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const result = getLinkedAccountsText(user);
      expect(result).toBe('Authentication with Email');
    });

    it('returns correct text for user with Apple ID only', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        apple_id: 'apple123',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const result = getLinkedAccountsText(user);
      expect(result).toBe('Authentication with Apple');
    });

    it('returns correct text for user with Google ID only', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        google_id: 'google123',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const result = getLinkedAccountsText(user);
      expect(result).toBe('Authentication with Google');
    });

    it('returns correct text for user with multiple linked accounts', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        apple_id: 'apple123',
        google_id: 'google123',
        email: 'user@example.com',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const result = getLinkedAccountsText(user);
      expect(result).toBe('Authentication with Apple, Google, Email');
    });
  });

  describe('AccountLinkingSection', () => {
    it('displays authentication status', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        email: 'user@example.com',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      renderWithTheme(
        <AccountLinkingSection 
          user={user}
          onOpenMigration={jest.fn()}
        />
      );

      expect(screen.getByText('Authentication with Email')).toBeTruthy();
    });

    it('displays linked accounts status', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        apple_id: 'apple123',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      renderWithTheme(
        <AccountLinkingSection 
          user={user}
          onOpenMigration={jest.fn()}
        />
      );

      expect(screen.getByText('Authentication with Apple')).toBeTruthy();
    });

    it('shows "Link authentication methods" button', () => {
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      renderWithTheme(
        <AccountLinkingSection 
          user={user}
          onOpenMigration={jest.fn()}
        />
      );

      expect(screen.getByText('Link authentication methods')).toBeTruthy();
    });

    it('calls onOpenMigration when button is pressed', async () => {
      const mockOnOpenMigration = jest.fn();
      const user: T.User = {
        id: 'user1',
        name: 'Test User',
        clock: '1',
        avatar: '',
        phone_number: '+1234567890',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const { getByText } = renderWithTheme(
        <AccountLinkingSection 
          user={user}
          onOpenMigration={mockOnOpenMigration}
        />
      );

      const linkButton = getByText('Link authentication methods');
      fireEvent.press(linkButton);

      expect(mockOnOpenMigration).toHaveBeenCalled();
    });
  });

  describe('AccountLinkingModal', () => {
    it('renders modal when visible', () => {
      const mockGatzClient = {
        linkApple: jest.fn(),
        linkGoogle: jest.fn(),
        linkEmail: jest.fn(),
      } as any;

      const { getByTestId } = renderWithTheme(
        <AccountLinkingModal
          visible={true}
          onClose={jest.fn()}
          onMigrationSuccess={jest.fn()}
          onLinkAccount={jest.fn()}
          gatzClient={mockGatzClient}
        />
      );

      expect(getByTestId('migration-screen')).toBeTruthy();
    });

    it('does not render modal when not visible', () => {
      const mockGatzClient = {
        linkApple: jest.fn(),
        linkGoogle: jest.fn(),
        linkEmail: jest.fn(),
      } as any;

      const { queryByTestId } = renderWithTheme(
        <AccountLinkingModal
          visible={false}
          onClose={jest.fn()}
          onMigrationSuccess={jest.fn()}
          onLinkAccount={jest.fn()}
          gatzClient={mockGatzClient}
        />
      );

      expect(queryByTestId('migration-screen')).toBeNull();
    });
  });
});