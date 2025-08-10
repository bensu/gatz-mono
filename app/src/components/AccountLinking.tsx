import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as T from '../gatz/types';
import { GatzClient } from '../gatz/client';
import { MigrationScreen } from './MigrationScreen';
import { SocialSignInCredential } from '../gatz/auth';
import { useThemeColors } from '../gifted/hooks/useThemeColors';

interface AccountLinkingSectionProps {
  user: T.User;
  gatzClient: GatzClient;
  onUserUpdate: () => void;
}

export function getLinkedAccountsText(user: T.User): string {
  const linkedAccounts: string[] = [];
  
  if (user.apple_id) {
    linkedAccounts.push('Apple');
  }
  
  if (user.google_id) {
    linkedAccounts.push('Google');
  }
  
  if (user.email) {
    linkedAccounts.push('Email');
  }
  
  // Only show SMS if no other authentication methods are available
  if (linkedAccounts.length === 0) {
    linkedAccounts.push('SMS');
  }
  
  return `Authentication with ${linkedAccounts.join(', ')}`;
}

interface AccountLinkingState {
  showMigrationModal: boolean;
  openMigration: () => void;
  closeMigration: () => void;
  linkAccount: (credential: SocialSignInCredential) => Promise<void>;
  handleMigrationSuccess: () => void;
}

export function useAccountLinking(user: T.User, gatzClient: GatzClient, onUserUpdate: () => void): AccountLinkingState {
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const handleLinkAccount = useCallback(async (credential: SocialSignInCredential) => {
    switch (credential.type) {
      case 'apple':
        return await gatzClient.linkApple(credential.idToken, credential.clientId);
      case 'google':
        return await gatzClient.linkGoogle(credential.idToken, credential.clientId);
      default:
        throw new Error(`Unsupported credential type: ${(credential as any).type}`);
    }
  }, [gatzClient]);

  const handleMigrationSuccess = useCallback(() => {
    setShowMigrationModal(false);
    onUserUpdate();
  }, [onUserUpdate]);

  const handleCloseMigration = useCallback(() => {
    setShowMigrationModal(false);
  }, []);

  const handleOpenMigration = useCallback(() => {
    setShowMigrationModal(true);
  }, []);

  return {
    showMigrationModal,
    openMigration: handleOpenMigration,
    closeMigration: handleCloseMigration,
    linkAccount: handleLinkAccount,
    handleMigrationSuccess,
  };
}

export function AccountLinkingSection({ user, onOpenMigration }: { user: T.User; onOpenMigration: () => void }) {
  const colors = useThemeColors();
  const linkedAccountsText = getLinkedAccountsText(user);

  return (
    <>
      {/* Linked Accounts Status */}
      <View style={[styles.row, { backgroundColor: colors.appBackground, marginBottom: 8 }]}>
        <Text style={[styles.labelText, { color: colors.secondaryText }]}>
          {linkedAccountsText}
        </Text>
      </View>

      {/* Link Authentication Methods Button */}
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.appBackground }]}
        onPress={onOpenMigration}
      >
        <Text style={[styles.labelText, { color: colors.buttonActive, fontWeight: "400" }]}>
          Link authentication methods
        </Text>
      </TouchableOpacity>
    </>
  );
}

export function AccountLinkingModal({ 
  visible, 
  onClose, 
  onMigrationSuccess, 
  onLinkAccount, 
  gatzClient 
}: {
  visible: boolean;
  onClose: () => void;
  onMigrationSuccess: () => void;
  onLinkAccount: (credential: SocialSignInCredential) => Promise<void>;
  gatzClient: GatzClient;
}) {
  return (
    <MigrationScreen
      visible={visible}
      onClose={onClose}
      onRemindLater={onClose}
      onMigrationSuccess={onMigrationSuccess}
      onLinkAccount={onLinkAccount}
      gatzClient={gatzClient}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  labelText: { 
    fontSize: 18 
  },
});