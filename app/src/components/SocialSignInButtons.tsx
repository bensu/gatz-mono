import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { 
  isAppleSignInAvailable, 
  signInWithApple, 
  signInWithGoogle,
  SocialSignInCredential 
} from '../gatz/auth';
import { Color as GatzColor, Styles as GatzStyles } from '../gatz/styles';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import { NetworkButton } from './NetworkButton';

interface SocialSignInButtonsProps {
  onSignIn: (credential: SocialSignInCredential) => Promise<void>;
  isLoading?: boolean;
  useModalStyling?: boolean;
}

export const SocialSignInButtons: React.FC<SocialSignInButtonsProps> = ({
  onSignIn,
  isLoading = false,
  useModalStyling = false,
}) => {
  const colors = useThemeColors();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const checkAppleSignInAvailability = async () => {
      const available = await isAppleSignInAvailable();
      setIsAppleAvailable(available);
    };

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
      console.log('Google Sign-In failed');
      console.error(error);
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
      
      {useModalStyling ? (
        <TouchableOpacity
          style={[styles.modalGoogleButton, { borderColor: colors.strongGrey }]}
          onPress={handleGoogleSignIn}
          disabled={isAnyLoading}
        >
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={[styles.modalGoogleButtonText, { color: colors.primaryText }]}>
            {isGoogleLoading ? 'Loading...' : 'Sign in with Google'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.signInGoogleButton, { borderColor: GatzColor.introTitle }]}
          onPress={handleGoogleSignIn}
          disabled={isAnyLoading}
        >
          <Text style={[styles.signInGoogleButtonText, { color: GatzColor.introTitle }]}>
            {isGoogleLoading ? 'Loading...' : 'Sign in with Google'}
          </Text>
        </TouchableOpacity>
      )}
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
  // Modal styling (matches EmailSignInComponent button style)
  modalGoogleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    height: 50,
  },
  modalGoogleButtonText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '500',
  },
  // Sign-in page styling (matches email button style)
  signInGoogleButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  signInGoogleButtonText: {
    fontSize: 16,
    fontFamily: GatzStyles.tagline.fontFamily,
    fontWeight: '500',
  },
});