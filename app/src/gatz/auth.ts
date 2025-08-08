import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export interface AppleSignInCredential {
  type: 'apple';
  idToken: string;
  clientId: string;
  user?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  email?: string;
}

export interface GoogleSignInCredential {
  type: 'google';
  idToken: string;
  clientId: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface EmailSignInCredential {
  type: 'email';
  email: string;
  code: string;
}

export type SocialSignInCredential = AppleSignInCredential | GoogleSignInCredential;
export type AuthCredential = AppleSignInCredential | GoogleSignInCredential | EmailSignInCredential;

export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.warn('Apple Sign-In availability check failed:', error);
    return false;
  }
};

export const signInWithApple = async (): Promise<AppleSignInCredential> => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign-In failed: no identity token received');
    }

    return {
      type: 'apple',
      idToken: credential.identityToken,
      clientId: 'chat.gatz', // iOS bundle identifier
      user: credential.user,
      fullName: credential.fullName,
      email: credential.email,
    };
  } catch (error) {
    console.error('Apple Sign-In error:', error);
    throw error;
  }
};

export const configureGoogleSignIn = () => {
  // Google Sign-In package is not currently installed due to compatibility issues
  // This function is a placeholder for when the package is properly integrated
  console.warn('Google Sign-In is not currently available - package not installed');
};

export const signInWithGoogle = async (): Promise<GoogleSignInCredential> => {
  // TODO: Implement Google Sign-In when package is available
  // Should return: { type: 'google', idToken: string, clientId: string, user: object }
  throw new Error('Google Sign-In is not currently available. Please use Apple Sign-In or phone authentication.');
};

export const signOutGoogle = async (): Promise<void> => {
  // No-op since Google Sign-In is not available
};