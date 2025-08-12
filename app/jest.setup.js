// Existing setup
import React from 'react';
import '@testing-library/jest-native/extend-expect';

// Ensure React is available globally for tests
global.React = React;

// Add missing globals
global.__DEV__ = true;

// Silence warnings
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    if (
      args[0]?.includes('Clipboard has been extracted') ||
      args[0]?.includes('ProgressBarAndroid has been extracted') ||
      args[0]?.includes('NativeEventEmitter') ||
      args[0]?.includes('PushNotificationIOS has been extracted') ||
      args[0]?.includes('ImagePickerIOS has been removed') ||
      args[0]?.includes('CheckBox has been extracted') ||
      args[0]?.includes('Slider has been extracted') ||
      args[0]?.includes('DatePickerIOS has been merged') ||
      args[0]?.includes('PickerIOS has been extracted') ||
      args[0]?.includes('ProgressViewIOS has been extracted') ||
      args[0]?.includes('SegmentedControlIOS has been extracted') ||
      args[0]?.includes('StatusBarIOS has been merged') ||
      args[0]?.includes('SwipeableListView has been removed') ||
      args[0]?.includes('ToolbarAndroid has been removed') ||
      args[0]?.includes('ViewPagerAndroid has been removed') ||
      args[0]?.includes('DrawerLayoutAndroid has been removed') ||
      args[0]?.includes('WebView has been removed') ||
      args[0]?.includes('NetInfo has been extracted') ||
      args[0]?.includes('CameraRoll has been extracted') ||
      args[0]?.includes('ImageStore has been removed') ||
      args[0]?.includes('ImageEditor has been extracted') ||
      args[0]?.includes('TimePickerAndroid has been removed') ||
      args[0]?.includes('has been deprecated') ||
      args[0]?.includes('has been removed from React Native') ||
      args[0]?.includes('has been moved to')
    ) {
      return;
    }
    originalWarn(...args);
  };
  
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && (
        args[0].includes('Warning:') ||
        args[0].includes('The above error occurred')
      )
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockGesture = {
    onStart: jest.fn(),
    onEnd: jest.fn(),
    _handlers: {},
  };
  mockGesture.onStart.mockReturnValue(mockGesture);
  mockGesture.onEnd.mockReturnValue(mockGesture);

  const gesture = {
    onStart: jest.fn().mockReturnThis(),
    onEnd: jest.fn().mockReturnThis(),
    onUpdate: jest.fn().mockReturnThis(),
    minDuration: jest.fn().mockReturnThis(),
    activeOffsetX: jest.fn().mockReturnThis(),
    failOffsetY: jest.fn().mockReturnThis(),
  };

  return {
    Gesture: {
      Hover: jest.fn(() => mockGesture),
      LongPress: jest.fn(() => ({ ...gesture })),
      Pan: jest.fn(() => ({ ...gesture })),
      Exclusive: jest.fn((...args: any[]) => ({ ...gesture })),
    },
    GestureDetector: jest.fn(({ children }) => children),
    GestureHandlerRootView: ({ children }: any) => children,
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: ({ testID, source, style, cachePolicy, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID,
      style,
      ...props,
      accessibilityLabel: `Image with cache policy: ${cachePolicy}`,
      accessibilityValue: { text: source?.uri || '' }
    });
  },
}));

// Mock expo-audio (temporarily disabled while fixing audio configuration)
// jest.mock('expo-audio', () => ({
//   Audio: {
//     setAudioModeAsync: jest.fn(() => Promise.resolve()),
//   },
// }));

// Mock expo-video
jest.mock('expo-video', () => ({
  VideoView: ({ testID, style, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: testID || 'Video', // Fallback to 'Video' for test compatibility
      style,
      ...props,
      accessibilityLabel: `VideoView with expo-video`,
    });
  },
  useVideoPlayer: jest.fn(() => ({
    pause: jest.fn(),
    play: jest.fn(),
    mute: jest.fn(),
    replace: jest.fn(),
    currentTime: 0,
    duration: 0,
    isLoaded: true,
    isPlaying: false,
  })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useGlobalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: 'Link',
  Stack: {
    Screen: 'Screen',
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  Ionicons: 'Ionicons',
  AntDesign: 'AntDesign',
  Entypo: 'Entypo',
  EvilIcons: 'EvilIcons',
  Feather: 'Feather',
  FontAwesome5: 'FontAwesome5',
  Foundation: 'Foundation',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Octicons: 'Octicons',
  SimpleLineIcons: 'SimpleLineIcons',
  Zocial: 'Zocial',
}));

// Mock deprecated React Native modules to prevent warnings
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native/Libraries/Components/ProgressBarAndroid/ProgressBarAndroid', () => 'ProgressBarAndroid');

jest.mock('react-native/Libraries/PushNotificationIOS/PushNotificationIOS', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestPermissions: jest.fn(() => Promise.resolve()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
}));

// Add StatusBarManager to NativeModules mock
const { NativeModules } = require('react-native');
NativeModules.StatusBarManager = {
  getHeight: jest.fn((callback) => callback({ height: 20 })),
  setStyle: jest.fn(),
  setHidden: jest.fn(),
  setNetworkActivityIndicatorVisible: jest.fn(),
};

// Add SettingsManager mock
NativeModules.SettingsManager = {
  settings: {},
  getConstants: () => ({ settings: {} }),
};

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({
  getRandomBase64: jest.fn(),
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: ({ source, style, onMessage, onLoad, onError, testID, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: testID || 'WebView',
      style,
      ...props,
      accessibilityLabel: `WebView loading: ${source?.uri || source?.html || 'content'}`,
    });
  },
}));