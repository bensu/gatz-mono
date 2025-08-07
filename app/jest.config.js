module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|just-.*)",
  ],
  testMatch: [
    "<rootDir>/src/**/*.test.js",
    "<rootDir>/src/**/*.test.jsx",
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  coverageReporters: ['lcov', 'json'],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^just-group-by/index\\.js$": "<rootDir>/__mocks__/just-group-by.js",
    "^just-map-values/index\\.js$": "<rootDir>/__mocks__/just-map-values.js"
  }
};
