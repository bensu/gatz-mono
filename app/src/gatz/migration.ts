import AsyncStorage from '@react-native-async-storage/async-storage';
import { MigrationStatus } from './types';

// Local storage keys
const MIGRATION_SCREEN_SHOWN_KEY = 'gatz/migration/screen_shown';
const MIGRATION_LAST_PROMPT_KEY = 'gatz/migration/last_prompt';

// Time constants
const REMIND_LATER_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface MigrationState {
  screenShown: boolean;
  lastPromptDate: string | null;
}

/**
 * Check if migration screen has been shown before
 */
export const hasMigrationScreenBeenShown = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(MIGRATION_SCREEN_SHOWN_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Failed to check migration screen shown status:', error);
    return false;
  }
};

/**
 * Mark migration screen as shown
 */
export const markMigrationScreenShown = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(MIGRATION_SCREEN_SHOWN_KEY, 'true');
    await AsyncStorage.setItem(MIGRATION_LAST_PROMPT_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Failed to mark migration screen as shown:', error);
  }
};



/**
 * Get complete migration state
 */
export const getMigrationState = async (): Promise<MigrationState> => {
  try {
    const [screenShown, lastPrompt] = await Promise.all([
      hasMigrationScreenBeenShown(),
      AsyncStorage.getItem(MIGRATION_LAST_PROMPT_KEY),
    ]);

    return {
      screenShown,
      lastPromptDate: lastPrompt,
    };
  } catch (error) {
    console.error('Failed to get migration state:', error);
    return {
      screenShown: false,
      lastPromptDate: null,
    };
  }
};

/**
 * Clear migration state (useful for testing or when migration is completed)
 */
export const clearMigrationState = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(MIGRATION_SCREEN_SHOWN_KEY),
      AsyncStorage.removeItem(MIGRATION_LAST_PROMPT_KEY),
    ]);
  } catch (error) {
    console.error('Failed to clear migration state:', error);
  }
};

/**
 * Check if the remind later period has expired
 */
const hasRemindLaterExpired = (lastPromptDate: string | null): boolean => {
  if (!lastPromptDate) {
    return true; // If no date recorded, consider it expired
  }
  
  const lastPromptTime = new Date(lastPromptDate).getTime();
  const now = Date.now();
  const timeSinceLastPrompt = now - lastPromptTime;
  
  return timeSinceLastPrompt >= REMIND_LATER_EXPIRY_MS;
};

/**
 * Determine what migration UI to show based on API response and local state
 */
export const determineMigrationUIState = async (
  migrationStatus?: MigrationStatus
): Promise<{
  showScreen: boolean;
  reason: string;
}> => {
  // If no migration required from API, don't show anything
  if (!migrationStatus?.required) {
    return {
      showScreen: false,
      reason: 'No migration required',
    };
  }

  const state = await getMigrationState();

  // If migration screen hasn't been shown yet, show it
  if (!state.screenShown) {
    return {
      showScreen: true,
      reason: 'First time migration prompt',
    };
  }

  // If screen was shown but the remind later period has expired, show it again
  if (hasRemindLaterExpired(state.lastPromptDate)) {
    return {
      showScreen: true,
      reason: 'Remind later period expired',
    };
  }

  // Screen was shown recently - don't show anything
  return {
    showScreen: false,
    reason: 'User has postponed migration (within remind later period)',
  };
};

/**
 * Should we show migration screen on app startup?
 */
export const shouldShowMigrationScreen = async (
  migrationStatus?: MigrationStatus
): Promise<boolean> => {
  const uiState = await determineMigrationUIState(migrationStatus);
  return uiState.showScreen;
};