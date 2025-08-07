import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { 
  isAppleSignInAvailable, 
  signInWithApple, 
  signInWithGoogle,
  configureGoogleSignIn,
  SocialSignInCredential 
} from '../gatz/auth';
import { Color as GatzColor } from '../gatz/styles';
import { NetworkButton } from './NetworkButton';

interface SocialSignInButtonsProps {
  onSignIn: (credential: SocialSignInCredential) => Promise<void>;
  isLoading?: boolean;
}

export const SocialSignInButtons: React.FC<SocialSignInButtonsProps> = ({
  onSignIn,
  isLoading = false,
}) => {
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const checkAppleSignInAvailability = async () => {
      const available = await isAppleSignInAvailable();
      setIsAppleAvailable(available);
    };

    configureGoogleSignIn();
    checkAppleSignInAvailability();
  }, []);

  const handleAppleSignIn = async () => {
    if (isLoading || isAppleLoading) return;
    
    setIsAppleLoading(true);
    try {
      const credential = await signInWithApple();
      await onSignIn(credential);
    } catch (error) {
      console.error('Apple Sign-In failed:', error);
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    
    setIsGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      await onSignIn(credential);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isLoading || isAppleLoading || isGoogleLoading;

  return (
    <View style={styles.container}>
      {isAppleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}
      
      {/* Google Sign-In temporarily disabled due to package compatibility issues */}
      {/* 
      <NetworkButton
        title="Continue with Google"
        onPress={handleGoogleSignIn}
        state={isGoogleLoading ? "loading" : "idle"}
        isDisabled={isAnyLoading}
      />
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
});