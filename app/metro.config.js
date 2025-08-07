const { getSentryExpoConfig } = require('@sentry/react-native/metro');
 
const PATH = require('path');

/** @type {import('expo/metro-config').MetroConfig} **/
const initialConfig = getSentryExpoConfig(__dirname, {
  // Enable CSS support.
  isCSSEnabled: true,
  extraNodeModules: {
      "whatwg-url-without-unicode": PATH.resolve(__dirname, 'vendor/whatwg-url-without-unicode'),
      "react-native-phone-number-input": PATH.resolve(__dirname, 'vendor/react-native-phone-number-input'),
      "react-native-country-picker-modal": PATH.resolve(__dirname, 'vendor/react-native-country-picker-modal'),
      "react-native-hold-menu": PATH.resolve(__dirname, 'vendor/react-native-hold-menu'),
      "@gorhom/portal": PATH.resolve(__dirname, 'vendor/react-native-portal'),
      "@gatz/shared": PATH.resolve(__dirname, 'vendor/shared/npm-package'),
      "@georstat/react-native-image-gallery": PATH.resolve(__dirname, 'vendor/react-native-image-gallery'),
    }
  },
);

const config = {
  ...initialConfig,
  watchFolders: [
    ...(initialConfig.watchFolders || []),
    PATH.resolve(__dirname, 'vendor/shared/npm-package'),
  ],
}

module.exports = config;