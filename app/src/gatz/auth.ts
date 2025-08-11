import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, ConfigureParams, GoogleOneTapSignIn } from '@react-native-google-signin/google-signin';
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

// Export additional Google One Tap functions for advanced usage
export { signInWithGoogleOneTap, signInWithGoogleManual, revokeGoogleAccess };

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
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  
  if (!webClientId) {
    console.error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
    return;
  }

  let config: ConfigureParams = {
    // React Native Google Sign-In library REQUIRES Web Client ID, even on Android
    webClientId,
    // Request offline access for refresh tokens
    offlineAccess: true,
  };

  // For iOS, use iOS client ID as the main webClientId to ensure tokens are issued with correct audience
  if (Platform.OS === 'ios' && iosClientId) {
    config = {
      ...config,
      webClientId: iosClientId,
      iosClientId: iosClientId,
    };
  }
  if (Platform.OS === 'android' && androidClientId) {
    // For Android, must use param name webClientId
    console.log('Android client ID:', androidClientId);
    config = {
      ...config,
      webClientId: androidClientId,
    };
  }

  // Configure both regular Google Sign-in and One Tap Sign-in
  GoogleSignin.configure(config);
  
  // Configure Google One Tap Sign-in with automatic client ID detection
  GoogleOneTapSignIn.configure({
    webClientId: 'autoDetect', // Recommended automatic detection
  });
};

const signInWithGoogleWeb = async (): Promise<GoogleSignInCredential> => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google Web Client ID not configured');
  }

  // Use the main origin as redirect URI to avoid routing issues
  const redirectUri = window.location.origin;
  const scope = 'openid profile email';
  const responseType = 'id_token token';
  const nonce = Math.random().toString(36).substring(2, 15);
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', responseType);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl.toString(), 'google-signin', 'width=500,height=600,scrollbars=yes');
    
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Google Sign-In popup was closed'));
      }
    }, 1000);

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data?.state === state) {
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', messageHandler);
        
        const { idToken, user } = event.data;
        resolve({
          type: 'google',
          idToken,
          clientId,
          user,
        });
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR' && event.data?.state === state) {
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', messageHandler);
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageHandler);

    // Poll the popup URL to detect when it reaches our callback
    const pollInterval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.includes('#') && popupUrl.includes('id_token=')) {
          clearInterval(pollInterval);
          
          // Extract tokens from URL fragment
          const fragment = popupUrl.split('#')[1];
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const idToken = params.get('id_token');
            const receivedState = params.get('state');
            
            if (idToken && receivedState === state) {
              try {
                // Decode JWT to get user info
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                
                clearInterval(checkClosed);
                popup?.close();
                window.removeEventListener('message', messageHandler);
                
                resolve({
                  type: 'google',
                  idToken,
                  clientId,
                  user: {
                    id: payload.sub,
                    name: payload.name,
                    email: payload.email,
                  },
                });
              } catch (e) {
                clearInterval(checkClosed);
                popup?.close();
                window.removeEventListener('message', messageHandler);
                reject(new Error('Failed to decode Google ID token'));
              }
            }
          }
        }
      } catch (e) {
        // Ignore cross-origin errors during polling
      }
    }, 500);
  });
};

// Google One Tap Sign-in (automatic sign-in attempt)
export const signInWithGoogleOneTap = async (): Promise<GoogleSignInCredential> => {
  try {
    // Use web-specific implementation on web platform
    if (Platform.OS === 'web') {
      return await signInWithGoogleWeb();
    }

    // Check Play Services availability for Android
    await GoogleOneTapSignIn.checkPlayServices();
    
    // Attempt One Tap sign-in
    const signInResponse = await GoogleOneTapSignIn.signIn();
    
    if (signInResponse.type === 'success') {
      const { idToken, user } = signInResponse.data;
      
      if (!idToken) {
        throw new Error('Google One Tap Sign-In failed: no ID token received');
      }
      
      // Must use the same client ID that was used to configure the Google Sign-In library
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
      
      // Use the same logic as configureGoogleSignIn to determine which client ID was used
      const clientId = Platform.OS === 'ios' && iosClientId ? iosClientId : webClientId;

      return {
        type: 'google',
        idToken,
        clientId,
        user: user ? {
          id: user.id,
          name: user.name || undefined,
          email: user.email,
        } : undefined,
      };
    } else if (signInResponse.type === 'noSavedCredentialFound') {
      // No saved credentials - fallback to manual sign-in flow
      throw new Error('NO_SAVED_CREDENTIALS');
    } else {
      throw new Error('Google One Tap Sign-In cancelled or failed');
    }
  } catch (error) {
    console.error('Google One Tap Sign-In error:', error);
    throw error;
  }
};

// Google manual sign-in (explicit user action)
export const signInWithGoogleManual = async (): Promise<GoogleSignInCredential> => {
  try {
    // Use web-specific implementation on web platform
    if (Platform.OS === 'web') {
      return await signInWithGoogleWeb();
    }
    
    // Use One Tap explicit sign-in for better UX
    await GoogleOneTapSignIn.checkPlayServices();
    const createResponse = await GoogleOneTapSignIn.createAccount();
    
    if (createResponse.type === 'success') {
      const { idToken, user } = createResponse.data;
      
      if (!idToken) {
        throw new Error('Google Manual Sign-In failed: no ID token received');
      }
      
      // Must use the same client ID that was used to configure the Google Sign-In library
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
      
      // Use the same logic as configureGoogleSignIn to determine which client ID was used
      const clientId = Platform.OS === 'ios' && iosClientId ? iosClientId : webClientId;

      return {
        type: 'google',
        idToken,
        clientId,
        user: user ? {
          id: user.id,
          name: user.name || undefined,
          email: user.email,
        } : undefined,
      };
    } else {
      throw new Error('Google Manual Sign-In cancelled or failed');
    }
  } catch (error) {
    console.error('Google Manual Sign-In error:', error);
    // Fallback to traditional Google Sign-in if One Tap fails
    return await signInWithGoogleFallback();
  }
};

// Fallback to traditional Google Sign-in
const signInWithGoogleFallback = async (): Promise<GoogleSignInCredential> => {
  try {
    // Use native implementation for iOS/Android
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Check for idToken in different possible locations
    // The response structure can vary - sometimes nested under 'data'
    const idToken = userInfo.idToken || userInfo.data?.idToken;
    const userData = userInfo.user || userInfo.data?.user;
    
    if (!idToken) {
      console.error('No ID token found in response:', userInfo);
      throw new Error('Google Sign-In failed: no ID token received');
    }
    
    // Must use the same client ID that was used to configure the Google Sign-In library
    // This ensures the client ID matches the token's audience claim
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
    
    // Use the same logic as configureGoogleSignIn to determine which client ID was used
    const clientId = Platform.OS === 'ios' && iosClientId ? iosClientId : webClientId;

    return {
      type: 'google',
      idToken,
      clientId,
      user: userData ? {
        id: userData.id,
        name: userData.name || undefined,
        email: userData.email,
      } : undefined,
    };
  } catch (error) {
    console.error('Google Fallback Sign-In error:', error);
    throw error;
  }
};

// Main Google Sign-in function (tries One Tap first, then manual)
export const signInWithGoogle = async (): Promise<GoogleSignInCredential> => {
  try {
    // Try One Tap sign-in first for better UX
    return await signInWithGoogleOneTap();
  } catch (error) {
    console.log('One Tap sign-in failed, falling back to manual sign-in');
    // If One Tap fails due to no saved credentials, try manual sign-in
    if (error instanceof Error && error.message === 'NO_SAVED_CREDENTIALS') {
      return await signInWithGoogleManual();
    }
    // For other errors, still try manual sign-in as fallback
    return await signInWithGoogleManual();
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      // Sign out from both regular Google Sign-in and One Tap
      await GoogleSignin.signOut();
      await GoogleOneTapSignIn.signOut();
    }
    // For web, just clear any stored tokens/state if needed
  } catch (error) {
    console.error('Google Sign-Out error:', error);
  }
};

export const revokeGoogleAccess = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      // Revoke access for both regular Google Sign-in and One Tap
      await GoogleSignin.revokeAccess();
      await GoogleOneTapSignIn.revokeAccess();
    }
    // For web, just clear any stored tokens/state if needed
  } catch (error) {
    console.error('Google Revoke Access error:', error);
  }
};