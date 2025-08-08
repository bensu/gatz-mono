import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
  GoogleSignin.configure({
    // iOS client ID
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // Web client ID (also used for Android)
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Android client ID
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    offlineAccess: true,
  });
};

export const signInWithGoogle = async (): Promise<GoogleSignInCredential> => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    if (!userInfo.idToken) {
      throw new Error('Google Sign-In failed: no ID token received');
    }
    
    return {
      type: 'google',
      idToken: userInfo.idToken,
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      user: userInfo.user ? {
        id: userInfo.user.id,
        name: userInfo.user.name || undefined,
        email: userInfo.user.email,
      } : undefined,
    };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out error:', error);
  }
};