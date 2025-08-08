import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasMigrationScreenBeenShown,
  markMigrationScreenShown,
  hasMigrationBannerBeenDismissed,
  markMigrationBannerDismissed,
  getMigrationState,
  clearMigrationState,
  determineMigrationUIState,
  shouldShowMigrationScreen,
  shouldShowMigrationBanner,
} from './migration';
import { MigrationStatus } from './types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migration state tracking', () => {
    test('should track migration screen shown state', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('true');
      
      const result = await hasMigrationScreenBeenShown();
      expect(result).toBe(true);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('gatz/migration/screen_shown');
    });

    test('should mark migration screen as shown', async () => {
      await markMigrationScreenShown();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('gatz/migration/screen_shown', 'true');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('gatz/migration/last_prompt', expect.any(String));
    });

    test('should track migration banner dismissed state', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('true');
      
      const result = await hasMigrationBannerBeenDismissed();
      expect(result).toBe(true);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('gatz/migration/banner_dismissed');
    });

    test('should mark migration banner as dismissed', async () => {
      await markMigrationBannerDismissed();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('gatz/migration/banner_dismissed', 'true');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('gatz/migration/last_prompt', expect.any(String));
    });
  });

  describe('migration UI state determination', () => {
    test('should not show UI when migration is not required', async () => {
      const migrationStatus: MigrationStatus = {
        required: false,
        show_migration_screen: false,
        completed_at: new Date().toISOString(),
      };

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: false,
        showBanner: false,
        reason: 'No migration required',
      });
    });

    test('should show screen for first-time migration', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen not shown, banner not dismissed
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('false') // screen shown
        .mockResolvedValueOnce('false') // banner dismissed
        .mockResolvedValueOnce(null);   // last prompt

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: true,
        showBanner: false,
        reason: 'First time migration prompt',
      });
    });

    test('should show banner for reminder after screen shown', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen shown, banner not dismissed
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true')  // screen shown
        .mockResolvedValueOnce('false') // banner dismissed
        .mockResolvedValueOnce(new Date().toISOString()); // last prompt

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: false,
        showBanner: true,
        reason: 'Reminder banner',
      });
    });

    test('should not show UI when user has postponed migration', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock both screen shown and banner dismissed
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true') // screen shown
        .mockResolvedValueOnce('true') // banner dismissed
        .mockResolvedValueOnce(new Date().toISOString()); // last prompt

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: false,
        showBanner: false,
        reason: 'User has postponed migration',
      });
    });
  });

  describe('helper functions', () => {
    test('shouldShowMigrationScreen should return correct value', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen not shown
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('false') // screen shown
        .mockResolvedValueOnce('false') // banner dismissed
        .mockResolvedValueOnce(null);   // last prompt

      const result = await shouldShowMigrationScreen(migrationStatus);
      expect(result).toBe(true);
    });

    test('shouldShowMigrationBanner should return correct value', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen shown, banner not dismissed
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true')  // screen shown
        .mockResolvedValueOnce('false') // banner dismissed
        .mockResolvedValueOnce(new Date().toISOString()); // last prompt

      const result = await shouldShowMigrationBanner(migrationStatus);
      expect(result).toBe(true);
    });

    test('clearMigrationState should remove all storage keys', async () => {
      await clearMigrationState();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gatz/migration/screen_shown');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gatz/migration/banner_dismissed');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gatz/migration/last_prompt');
    });
  });
});