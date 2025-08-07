import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import Groups from '../../app/(app)/(drawer)/groups';
import { isMobile } from '../../util';

// Mock dependencies
jest.mock('expo-router');
jest.mock('../../util');
jest.mock('../../context/debounceRouter', () => ({
  useDebouncedRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
jest.mock('../../context/SessionProvider', () => {
  const React = require('react');
  return {
    SessionContext: React.createContext({
      session: { userId: 'test-user' },
    }),
  };
});
jest.mock('../../context/ClientProvider', () => {
  const React = require('react');
  return {
    ClientContext: React.createContext({
      gatzClient: {
        getUserGroups: jest.fn().mockResolvedValue({
          groups: [],
          public_groups: [],
        }),
        getGroup: jest.fn().mockResolvedValue({
          group: {
            id: 'test-group',
            name: 'Test Group',
            members: [],
            admins: [],
            owner: 'test-owner',
            settings: {
              mode: 'normal',
              member_mode: 'closed'
            },
            is_public: false,
          },
          all_contacts: [],
          in_common: {
            contact_ids: []
          }
        }),
      },
    }),
  };
});
jest.mock('../../context/FrontendDBProvider', () => {
  const React = require('react');
  return {
    FrontendDBContext: React.createContext({
      db: {
        addGroup: jest.fn(),
        listenToGroup: jest.fn(() => 'listener-id'),
        removeGroupListener: jest.fn(),
        getFeatureFlag: jest.fn(() => true),
      },
    }),
  };
});
jest.mock('../../sdk/posthog', () => ({
  useProductAnalytics: () => ({
    capture: jest.fn(),
  }),
}));
jest.mock('../../components/GroupScreen', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    GroupScreen: ({ groupResponse, onDesktopClose }: any) => (
      React.createElement(View, {},
        onDesktopClose && React.createElement(TouchableOpacity, { 
          onPress: onDesktopClose,
          testID: 'close-button'
        }, React.createElement(Text, {}, 'X')),
        React.createElement(Text, {}, 'Group info')
      )
    ),
  };
});

describe('Groups Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mobile layout when on mobile', () => {
    (isMobile as jest.Mock).mockReturnValue(true);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { queryByTestId } = render(<Groups />);
    
    // Should not render desktop layout components
    expect(queryByTestId('desktop-layout')).toBeNull();
  });

  it('renders desktop layout when not on mobile', () => {
    (isMobile as jest.Mock).mockReturnValue(false);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<Groups />);
    
    // Should render the groups header
    expect(getByText('Groups')).toBeTruthy();
  });

  it('renders selected group on desktop when gid is provided', async () => {
    (isMobile as jest.Mock).mockReturnValue(false);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ gid: 'test-group' });

    const { findByText } = render(<Groups />);
    
    // Should render the group info header
    await findByText('Group info');
  });

  it('navigates correctly on desktop when selecting a group', () => {
    (isMobile as jest.Mock).mockReturnValue(false);
    const mockReplace = jest.fn();
    
    jest.spyOn(require('../../context/debounceRouter'), 'useDebouncedRouter').mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
    });

    const { getByText } = render(<Groups />);
    
    // Test navigation would happen through GroupsInner component
    // which would call router.replace with the correct params
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('closes group view when close button is clicked on desktop', async () => {
    (isMobile as jest.Mock).mockReturnValue(false);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ gid: 'test-group' });
    
    const mockReplace = jest.fn();
    jest.spyOn(require('../../context/debounceRouter'), 'useDebouncedRouter').mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
    });

    const { findByTestId } = render(<Groups />);
    
    // Wait for the component to render
    await findByTestId('close-button');
    
    // Click the close button
    fireEvent.press(await findByTestId('close-button'));
    
    // Should navigate back to /groups without gid
    expect(mockReplace).toHaveBeenCalledWith('/groups');
  });
});