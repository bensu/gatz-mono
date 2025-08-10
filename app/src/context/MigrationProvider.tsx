import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { ClientContext } from './ClientProvider';
import { SessionContext } from './SessionProvider';
import { MigrationScreen } from '../components/MigrationScreen';
import { MigrationBanner } from '../components/MigrationBanner';
import { SocialSignInCredential } from '../gatz/auth';
import { MigrationStatus } from '../gatz/types';
import {
  shouldShowMigrationScreen,
  shouldShowMigrationBanner,
  markMigrationScreenShown,
  markMigrationBannerDismissed,
  clearMigrationState,
} from '../gatz/migration';

interface MigrationContextType {
  migrationStatus: MigrationStatus | null;
  isLoading: boolean;
  refreshMigrationStatus: () => Promise<void>;
}

const MigrationContext = createContext<MigrationContextType>({
  migrationStatus: null,
  isLoading: false,
  refreshMigrationStatus: async () => {},
});

export const useMigration = () => useContext(MigrationContext);

export const MigrationProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { gatzClient } = useContext(ClientContext);
  const { session } = useContext(SessionContext);
  
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMigrationScreen, setShowMigrationScreen] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [hasCheckedMigrationUI, setHasCheckedMigrationUI] = useState(false);

  // Fetch migration status from /me endpoint
  const refreshMigrationStatus = useCallback(async () => {
    if (!session) {
      setMigrationStatus(null);
      return;
    }

    setIsLoading(true);
    try {
      const meResponse = await gatzClient.getMe();
      setMigrationStatus(meResponse.migration || null);
      return meResponse.migration;
    } catch (error) {
      console.error('Failed to fetch migration status:', error);
      setMigrationStatus(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [gatzClient, session]);

  // Check what migration UI to show based on API response and local state
  const checkMigrationUI = useCallback(async (status: MigrationStatus | null = migrationStatus) => {
    if (!status?.required || hasCheckedMigrationUI) {
      return;
    }

    try {
      const [shouldShowScreen, shouldShowBanner] = await Promise.all([
        shouldShowMigrationScreen(status),
        shouldShowMigrationBanner(status),
      ]);

      setShowMigrationScreen(shouldShowScreen);
      setShowMigrationBanner(shouldShowBanner);
      setHasCheckedMigrationUI(true);
    } catch (error) {
      console.error('Failed to determine migration UI state:', error);
    }
  }, [migrationStatus, hasCheckedMigrationUI]);

  // Load migration status when session changes
  useEffect(() => {
    if (session) {
      refreshMigrationStatus().then(checkMigrationUI);
    } else {
      setMigrationStatus(null);
      setShowMigrationScreen(false);
      setShowMigrationBanner(false);
      setHasCheckedMigrationUI(false);
    }
  }, [session]); // Only depend on session to avoid circular dependencies

  // Check migration UI when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && migrationStatus?.required) {
        checkMigrationUI();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [migrationStatus, checkMigrationUI]);

  // Handle linking account (Apple or Google)
  const handleLinkAccount = useCallback(async (credential: SocialSignInCredential) => {
    try {
      let result;
      if (credential.type === 'apple') {
        result = await gatzClient.linkApple(credential.idToken, credential.clientId);
      } else if (credential.type === 'google') {
        result = await gatzClient.linkGoogle(credential.idToken, credential.clientId);
      } else {
        throw new Error('Unsupported credential type');
      }

      console.log('Account linking result:', result);
      
      // Clear migration state since user has completed migration
      await clearMigrationState();
      
      // Refresh migration status to reflect changes
      await refreshMigrationStatus();
      
      return result;
    } catch (error) {
      console.error('Account linking failed:', error);
      throw error;
    }
  }, [gatzClient, refreshMigrationStatus]);

  // Handle migration screen close (Remind Later)
  const handleMigrationScreenClose = useCallback(async () => {
    await markMigrationScreenShown();
    setShowMigrationScreen(false);
    
    // Show banner on next app open if migration still required
    if (migrationStatus?.required) {
      setShowMigrationBanner(true);
    }
  }, [migrationStatus]);

  // Handle banner dismiss
  const handleBannerDismiss = useCallback(async () => {
    await markMigrationBannerDismissed();
    setShowMigrationBanner(false);
  }, []);

  // Handle migration success
  const handleMigrationSuccess = useCallback(() => {
    setShowMigrationScreen(false);
    setShowMigrationBanner(false);
    setMigrationStatus(null);
  }, []);

  // Handle "Migrate Now" from banner
  const handleBannerMigrateNow = useCallback(() => {
    setShowMigrationBanner(false);
    setShowMigrationScreen(true);
  }, []);

  return (
    <MigrationContext.Provider
      value={{
        migrationStatus,
        isLoading,
        refreshMigrationStatus,
      }}
    >
      {children}
      
      {/* Migration Screen */}
      <MigrationScreen
        visible={showMigrationScreen}
        onClose={() => setShowMigrationScreen(false)}
        onRemindLater={handleMigrationScreenClose}
        onMigrationSuccess={handleMigrationSuccess}
        onLinkAccount={handleLinkAccount}
        gatzClient={gatzClient}
      />

      {/* Migration Banner */}
      <MigrationBanner
        visible={showMigrationBanner}
        onDismiss={handleBannerDismiss}
        onMigrateNow={handleBannerMigrateNow}
        onLinkAccount={handleLinkAccount}
      />
    </MigrationContext.Provider>
  );
};