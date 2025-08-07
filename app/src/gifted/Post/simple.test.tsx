import React from 'react';
import { render } from '@testing-library/react-native';
import { Post } from '../Post';
import * as T from '../../gatz/types';

// Mock all the child components to isolate Post component testing
jest.mock('../Bubble', () => ({
  BubbleContent: ({ currentMessage }: any) => {
    const React = require('react');
    return React.createElement('View', {
      testID: 'bubble-content',
    }, currentMessage?.text || '');
  },
}));

jest.mock('../GiftedAvatar', () => ({
  WrappedUsernameWithAvatar: ({ user }: any) => {
    const React = require('react');
    return React.createElement('View', {
      testID: 'avatar',
    }, user?.name || 'Unknown');
  },
}));

jest.mock('../GiftedChatContext', () => ({
  useChatContext: () => ({
    getLocale: () => 'en',
  }),
}));

jest.mock('../../context/SessionProvider', () => {
  const React = require('react');
  return {
    SessionContext: React.createContext({
      session: { userId: 'test-user-id' },
    }),
  };
});

jest.mock('../../context/FrontendDBProvider', () => {
  const React = require('react');
  return {
    FrontendDBContext: React.createContext({
      db: {
        getUserById: jest.fn(() => ({ id: 'test-user-id', name: 'Test User' })),
        getGroupById: jest.fn(),
        getMyContacts: jest.fn(() => new Set()),
      },
    }),
  };
});

jest.mock('../../context/PortalProvider', () => {
  const React = require('react');
  return {
    PortalContext: React.createContext({
      openPortal: jest.fn(),
      closePortal: jest.fn(),
    }),
  };
});

jest.mock('../../context/ClientProvider', () => {
  const React = require('react');
  return {
    ClientContext: React.createContext({
      gatzClient: {
        getDiscussionById: jest.fn(),
        getMessageById: jest.fn(),
      },
    }),
  };
});

jest.mock('../../context/debounceRouter', () => ({
  useDebouncedRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('../hooks/useThemeColors', () => ({
  useThemeColors: jest.fn(() => ({
    theme: 'light',
    greyText: '#666',
    strongGrey: '#333',
    active: '#007AFF',
    appBackground: '#FFF',
    primaryText: '#000',
    secondaryText: '#666',
  })),
}));

jest.mock('../Continued', () => ({
  ContinuedFrom: () => null,
  ContinuedToPost: () => null,
  useContinuedDiscussion: jest.fn(() => ({ originallyFrom: null })),
}));

// Simple test message creator
const createTestMessage = (overrides?: Partial<T.Message>): T.Message => ({
  id: 'test-message-id',
  user_id: 'test-user-id',
  text: 'Test message',
  created_at: '2024-01-01T00:00:00Z',
  reactions: {},
  media: [],
  link_previews: [],
  edits: ['v1'],
  ...overrides,
} as T.Message);

// Simple test discussion creator
const createTestDiscussion = (overrides?: Partial<T.Discussion>): T.Discussion => ({
  id: 'test-discussion-id',
  created_by: 'test-user-id',
  open_until: null,
  archived_uids: [],
  originally_from: null,
  location: null,
  location_id: null,
  group_id: null,
  member_mode: 'contacts',
  ...overrides,
} as T.Discussion);

describe('Post Component - Simple Tests', () => {
  it('should render Post component', () => {
    const message = createTestMessage();
    const discussion = createTestDiscussion();
    
    const { getByTestId } = render(
      <Post
        currentMessage={message}
        discussion={discussion}
        onPressAvatar={jest.fn()}
      />
    );
    
    expect(getByTestId('bubble-content')).toBeTruthy();
  });

  it('should render MainPost when isMain is true', () => {
    const message = createTestMessage();
    const discussion = createTestDiscussion();
    
    const { getByTestId } = render(
      <Post
        currentMessage={message}
        discussion={discussion}
        onPressAvatar={jest.fn()}
        isMain={true}
      />
    );
    
    expect(getByTestId('bubble-content')).toBeTruthy();
  });
});