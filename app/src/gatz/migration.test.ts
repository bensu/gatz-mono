import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasMigrationScreenBeenShown,
  markMigrationScreenShown,
  getMigrationState,
  clearMigrationState,
  determineMigrationUIState,
  shouldShowMigrationScreen,
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
        reason: 'No migration required',
      });
    });

    test('should show screen for first-time migration', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen not shown
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('false') // screen shown
        .mockResolvedValueOnce(null);   // last prompt

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: true,
        reason: 'First time migration prompt',
      });
    });


    test('should not show UI when user has postponed migration', async () => {
      const migrationStatus: MigrationStatus = {
        required: true,
        show_migration_screen: true,
        completed_at: null,
      };

      // Mock screen shown
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true') // screen shown
        .mockResolvedValueOnce(new Date().toISOString()); // last prompt

      const result = await determineMigrationUIState(migrationStatus);
      
      expect(result).toEqual({
        showScreen: false,
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
        .mockResolvedValueOnce(null);   // last prompt

      const result = await shouldShowMigrationScreen(migrationStatus);
      expect(result).toBe(true);
    });


    test('clearMigrationState should remove all storage keys', async () => {
      await clearMigrationState();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gatz/migration/screen_shown');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gatz/migration/last_prompt');
    });
  });
});