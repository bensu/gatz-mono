// Shared mock for @expo/react-native-action-sheet

export const mockShowActionSheetWithOptions = jest.fn();

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: jest.fn(() => ({
    showActionSheetWithOptions: mockShowActionSheetWithOptions,
  })),
}));