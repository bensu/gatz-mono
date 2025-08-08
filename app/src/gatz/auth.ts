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
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  
  if (!webClientId) {
    console.error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
    return;
  }

  let config = {
    // Web client ID is used for web platform and also needed for Android
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
  // For Android, use the Android-specific client ID if available
  else if (Platform.OS === 'android' && androidClientId) {
    config = {
      ...config,
      webClientId: androidClientId,
    };
  }

  GoogleSignin.configure(config);
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

export const signInWithGoogle = async (): Promise<GoogleSignInCredential> => {
  try {
    // Use web-specific implementation on web platform
    if (Platform.OS === 'web') {
      return await signInWithGoogleWeb();
    }
    
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
    
    // Use the appropriate client ID based on platform
    let clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
    if (Platform.OS === 'android' && process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) {
      clientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    } else if (Platform.OS === 'ios' && process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
      clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    }

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
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await GoogleSignin.signOut();
    }
    // For web, just clear any stored tokens/state if needed
  } catch (error) {
    console.error('Google Sign-Out error:', error);
  }
};