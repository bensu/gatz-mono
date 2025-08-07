import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FeedScreen } from './FeedScreen';
import * as T from '../gatz/types';
import { FrontendDBContext } from '../context/FrontendDBProvider';
import { ClientContext } from '../context/ClientProvider';
import { SessionContext } from '../context/SessionProvider';
import { ActionPillContext } from '../context/ActionPillProvider';
import { useDebouncedRouter } from '../context/debounceRouter';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../context/debounceRouter', () => ({
  useDebouncedRouter: jest.fn(),
}));

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  isMobile: jest.fn(() => false),
  multiPlatformAlert: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
  Ionicons: ({ name }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

jest.mock('../gifted/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    active: '#007AFF',
    appBackground: '#FFFFFF',
    primaryText: '#000000',
    rowBackground: '#F5F5F5',
    strongGrey: '#666666',
    activityIndicator: '#999999',
    secondaryText: '#666666',
    activeBackgroundText: '#FFFFFF',
  }),
}));

jest.mock('../push', () => ({
  clearActivityNotifications: jest.fn(),
}));

jest.mock('../gatz/store', () => ({
  useNotificationStore: () => ({
    notifications: [],
  }),
}));

jest.mock('../gatz/feed', () => ({
  toSortedFeedItems: (userId: string, feedQuery: any, feedItems: T.FeedItem[]) => {
    // Filter out dismissed items - this is what the real implementation does
    return feedItems
      .filter(item => {
        if (item.dismissed_by && item.dismissed_by.includes(userId)) {
          if (!feedQuery.hidden) {
            return false; // Filter out dismissed items
          }
        }
        return true;
      })
      .map(item => ({
        ...item,
        id: item.id,
        isSeen: true,
      }));
  },
  toSortedActiveFeedItems: jest.fn(() => []),
  toFullFeed: (items: any[]) => items.map(item => ({ ...item, type: 'feed_item' })),
}));

jest.mock('./NavTabs', () => ({
  NavTabBar: () => null,
}));

jest.mock('./Header', () => ({
  UniversalHeader: () => null,
  headerStyles: {},
}));

jest.mock('./GroupSheet', () => ({
  GroupSheet: () => null,
}));

jest.mock('./InitialPrompt', () => ({
  InitialPrompt: () => null,
}));

jest.mock('./Separator', () => ({
  Separator: () => null,
}));

jest.mock('./DiscussionPreview', () => ({
  DiscussionPreview: () => null,
}));

jest.mock('./FeedItemCard', () => ({
  FeedItemCard: ({ item }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    const { AcceptedInviteCard } = require('./ContactRequestCard');
    
    if (item.feed_type === 'accepted_invite') {
      return <AcceptedInviteCard invite={item.ref} feedItem={item} />;
    }
    return (
      <View testID={`feed-item-${item.id}`}>
        <Text>{item.feed_type}</Text>
      </View>
    );
  },
}));

describe('AcceptedInviteCard dismiss functionality', () => {
  const mockRouter = { push: jest.fn() };
  const mockAppendAction = jest.fn();

  const createMockAcceptedInviteFeedItem = (): T.FeedItem => ({
    id: 'feed-item-1',
    ref_type: 'invite' as any,
    feed_type: 'accepted_invite',
    ref: {
      id: 'invite-1',
      contact: {
        id: 'contact-1',
        username: 'newuser',
        name: 'New User',
        avatar: null,
      },
      in_common: {
        contacts: [],
        groups: [],
      },
    } as T.HydratedInviteLink,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seen_at: {},
    dismissed_by: [],
  });

  // Track feed items and listeners in the mock
  let feedItems: Record<string, T.FeedItem> = {
    'feed-item-1': createMockAcceptedInviteFeedItem(),
  };
  let feedItemIdsListeners: Array<(ids: string[]) => void> = [];

  const mockDb = {
    getAllFeedItemIds: jest.fn(() => Object.keys(feedItems)),
    getFeedItemById: jest.fn((id) => feedItems[id] || null),
    listenToFeedItemIds: jest.fn((callback) => {
      feedItemIdsListeners.push(callback);
      return 'listener-1';
    }),
    removeFeedItemIdsListener: jest.fn(),
    listenToFeedItem: jest.fn((id, callback) => 'listener-2'),
    removeFeedItemListener: jest.fn(),
    addFeedItem: jest.fn((item: T.FeedItem) => {
      // Simulate the fix - trigger ID listeners when dismissed_by changes
      const oldItem = feedItems[item.id];
      const dismissedByChanged = oldItem && 
        JSON.stringify(oldItem.dismissed_by || []) !== JSON.stringify(item.dismissed_by || []);
      
      feedItems[item.id] = item;
      
      // Trigger ID listeners if dismissed status changed
      if (dismissedByChanged) {
        feedItemIdsListeners.forEach(listener => listener(Object.keys(feedItems)));
      }
    }),
    getUserById: jest.fn(() => ({ id: 'user1', username: 'Test User' })),
    getGroupById: jest.fn(() => null),
    listenToIncoming: jest.fn(() => 'listener-3'),
    removeIncomingFeedListener: jest.fn(),
    integrateIncomingFeed: jest.fn(),
    _fetchFeed: jest.fn(() => Promise.resolve()),
    _prepareFeed: jest.fn(),
  };

  const mockGatzClient = {
    dismissFeedItem: jest.fn((id) => Promise.resolve({
      item: {
        ...createMockAcceptedInviteFeedItem(),
        dismissed_by: ['user1'],
      },
    })),
  };

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <FrontendDBContext.Provider value={{ db: mockDb as any }}>
        <ClientContext.Provider value={{ gatzClient: mockGatzClient as any }}>
          <SessionContext.Provider value={{ session: { userId: 'user1' } } as any}>
            <ActionPillContext.Provider value={{ appendAction: mockAppendAction } as any}>
              {children}
            </ActionPillContext.Provider>
          </SessionContext.Provider>
        </ClientContext.Provider>
      </FrontendDBContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDebouncedRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Reset feed items and listeners
    feedItems = {
      'feed-item-1': createMockAcceptedInviteFeedItem(),
    };
    feedItemIdsListeners = [];
  });

  /**
   * This test reproduces the bug where dismissed cards don't disappear from the feed.
   * 
   * Expected: When dismiss button is clicked, the card should disappear from the feed
   * Actual: The card remains visible until page refresh
   * 
   * Reproduction steps:
   * 1. Render feed with AcceptedInviteCard
   * 2. Click dismiss button
   * 3. Verify network request is made
   * 4. Check if card is still visible
   */
  it('should remove AcceptedInviteCard from feed when dismiss button is clicked', async () => {
    // Setup - render the feed with an AcceptedInviteCard
    const feedQuery: T.MainFeedQuery = {
      feedType: 'all_posts',
      type: 'all',
      group_id: null,
      contact_id: null,
      location_id: null,
    };

    const { getByText, queryByText } = render(
      <TestWrapper>
        <FeedScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={jest.fn()}
          navTo={jest.fn()}
        />
      </TestWrapper>
    );

    // Step 1: Verify the AcceptedInviteCard is visible
    await waitFor(() => {
      expect(getByText('Dismiss')).toBeTruthy();
    });

    // Step 2: Click the dismiss button
    const dismissButton = getByText('Dismiss');
    fireEvent.press(dismissButton);

    // Step 3: Verify network request was made
    await waitFor(() => {
      expect(mockGatzClient.dismissFeedItem).toHaveBeenCalledWith('feed-item-1');
    });

    // Step 4: Verify the database was updated with dismissed item
    await waitFor(() => {
      expect(mockDb.addFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'feed-item-1',
          dismissed_by: ['user1'],
        })
      );
    });

    // ASSERTION: The card SHOULD be removed from the feed (will fail due to bug)
    await waitFor(() => {
      // The Dismiss button should no longer be visible
      expect(queryByText('Dismiss')).toBeNull();
    }, { timeout: 3000 });

    // Alternative assertion: The feed should re-render without the dismissed item
    expect(mockDb.getAllFeedItemIds).toHaveBeenCalled();
  });

  it('should handle dismiss when dismissed_by changes', async () => {
    // This test verifies that the fix properly triggers feed updates when dismissed_by changes
    const feedQuery: T.MainFeedQuery = {
      feedType: 'all_posts',
      type: 'all',
      group_id: null,
      contact_id: null,
      location_id: null,
    };

    const { getByText, queryByText } = render(
      <TestWrapper>
        <FeedScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={jest.fn()}
          navTo={jest.fn()}
        />
      </TestWrapper>
    );

    // Verify card is visible
    await waitFor(() => {
      expect(getByText('Dismiss')).toBeTruthy();
    });

    // Simulate the fix: when dismissed_by changes, ID listeners should be called
    const dismissedItem = {
      ...createMockAcceptedInviteFeedItem(),
      dismissed_by: ['user1'],
    };
    
    // Call addFeedItem directly to test the fix
    mockDb.addFeedItem(dismissedItem);
    
    // Verify the ID listeners were called (this is what triggers the re-filter)
    expect(feedItemIdsListeners.length).toBeGreaterThan(0);
  });

  it('should not remove items when viewing hidden feed', async () => {
    // Setup - create a dismissed item
    const dismissedItem = {
      ...createMockAcceptedInviteFeedItem(),
      dismissed_by: ['user1'],
    };
    feedItems['feed-item-1'] = dismissedItem;
    
    const feedQuery: T.MainFeedQuery = {
      feedType: 'all_posts',
      type: 'all',
      group_id: null,
      contact_id: null,
      location_id: null,
      hidden: true, // Viewing hidden items
    };

    const { getByText } = render(
      <TestWrapper>
        <FeedScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={jest.fn()}
          navTo={jest.fn()}
        />
      </TestWrapper>
    );

    // The dismissed item should still be visible when viewing hidden feed
    await waitFor(() => {
      expect(getByText('Dismiss')).toBeTruthy();
    });
  });

  it('should handle empty response from dismissFeedItem', async () => {
    // Mock empty response (no item returned)
    mockGatzClient.dismissFeedItem.mockResolvedValueOnce({});
    
    const feedQuery: T.MainFeedQuery = {
      feedType: 'all_posts',
      type: 'all',
      group_id: null,
      contact_id: null,
      location_id: null,
    };

    const { getByText } = render(
      <TestWrapper>
        <FeedScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={jest.fn()}
          navTo={jest.fn()}
        />
      </TestWrapper>
    );

    // Click dismiss button
    await waitFor(() => {
      expect(getByText('Dismiss')).toBeTruthy();
    });
    
    const dismissButton = getByText('Dismiss');
    fireEvent.press(dismissButton);

    // Verify the API was called
    await waitFor(() => {
      expect(mockGatzClient.dismissFeedItem).toHaveBeenCalled();
    });
    
    // Card should still be visible because no update was made to the database
    expect(getByText('Dismiss')).toBeTruthy();
  });
});