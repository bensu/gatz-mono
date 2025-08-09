import { Alert } from 'react-native';
import { OpenClient } from './client';
import { 
  signInWithApple, 
  signInWithGoogle, 
  SocialSignInCredential,
  AppleSignInCredential,
  GoogleSignInCredential 
} from './auth';
import * as T from './types';
import { 
  AuthError, 
  AuthErrorType, 
  createAuthError, 
  mapErrorToAuthError,
  isAuthError
} from './auth-errors';


export interface AuthResult {
  success: boolean;
  user?: T.User;
  token?: string;
  error?: AuthError;
  requiresSignup?: boolean;
  signupData?: {
    apple_id?: string;
    google_id?: string;
    email?: string;
    full_name?: string;
    id_token?: string;
  };
}

export interface SignUpResult {
  success: boolean;
  user?: T.User;
  token?: string;
  error?: AuthError;
}

export interface PhoneVerificationResult {
  success: boolean;
  requiresCode: boolean;
  existingUser?: T.User;
  error?: AuthError;
}

export interface CodeVerificationResult {
  success: boolean;
  user?: T.User;
  token?: string;
  requiresSignup?: boolean;
  error?: AuthError;
}

export interface UsernameCheckResult {
  success: boolean;
  available?: boolean;
  error?: AuthError;
}

export interface EmailVerificationResult {
  success: boolean;
  requiresCode: boolean;
  error?: AuthError;
}

export interface EmailCodeVerificationResult {
  success: boolean;
  user?: T.User;
  token?: string;
  requiresSignup?: boolean;
  error?: AuthError;
}

export class AuthService {
  private client: OpenClient;

  constructor() {
    this.client = new OpenClient();
  }

  private async executeWithoutRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw mapErrorToAuthError(error);
    }
  }

  async verifyPhone(phoneNumber: string): Promise<PhoneVerificationResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.verifyPhone(phoneNumber)
      );

      switch (response.status) {
        case 'pending':
          return {
            success: true,
            requiresCode: true,
            existingUser: response.user || undefined
          };
        default:
          return {
            success: false,
            requiresCode: false,
            error: createAuthError(AuthErrorType.SMS_SENDING_FAILED)
          };
      }
    } catch (error) {
      return {
        success: false,
        requiresCode: false,
        error: error instanceof Error ? mapErrorToAuthError(error) : createAuthError(AuthErrorType.NETWORK_ERROR)
      };
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<CodeVerificationResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.verifyCode(phoneNumber, code)
      );

      switch (response.status) {
        case 'approved':
          if (response.user && response.token) {
            return {
              success: true,
              user: response.user,
              token: response.token
            };
          } else {
            return {
              success: true,
              requiresSignup: true
            };
          }
        case 'wrong_code':
          return {
            success: false,
            error: createAuthError(AuthErrorType.INVALID_CODE, undefined, undefined, false)
          };
        case 'failed':
          return {
            success: false,
            error: createAuthError(AuthErrorType.CODE_EXPIRED)
          };
        default:
          return {
            success: false,
            error: createAuthError(AuthErrorType.UNKNOWN_ERROR)
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? mapErrorToAuthError(error) : createAuthError(AuthErrorType.NETWORK_ERROR)
      };
    }
  }

  async checkUsername(username: string): Promise<UsernameCheckResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.checkUsername(username)
      );

      return {
        success: true,
        available: response.available
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? mapErrorToAuthError(error) : createAuthError(AuthErrorType.NETWORK_ERROR)
      };
    }
  }

  async signInWithSocial(credential: SocialSignInCredential): Promise<AuthResult> {
    try {
      let response: T.AppleSignInAPIResponse | T.GoogleSignInAPIResponse;
      
      if (credential.type === 'apple') {
        response = await this.executeWithoutRetry(
          () => this.client.appleSignIn(credential.idToken, 'chat.gatz')
        );
      } else {
        // Use the same client ID that was used to acquire the token
        response = await this.executeWithoutRetry(
          () => this.client.googleSignIn(credential.idToken, credential.clientId)
        );
      }

      if (response.type === 'error') {
        let errorType: AuthErrorType;
        switch (response.error) {
          case 'invalid_token':
          case 'token_expired':
            errorType = credential.type === 'apple' ? AuthErrorType.APPLE_SIGNIN_FAILED : AuthErrorType.GOOGLE_SIGNIN_FAILED;
            break;
          case 'apple_id_taken':
          case 'google_id_taken':
            errorType = AuthErrorType.ACCOUNT_CONFLICT;
            break;
          default:
            errorType = AuthErrorType.UNKNOWN_ERROR;
        }
        
        return {
          success: false,
          error: createAuthError(errorType, undefined, response.message)
        };
      }
      
      if ('requires_signup' in response && response.requires_signup) {
        return {
          success: true,
          requiresSignup: true,
          signupData: {
            apple_id: response.apple_id,
            google_id: response.google_id,
            email: response.email,
            full_name: response.full_name,
            id_token: credential.idToken
          }
        };
      }

      return {
        success: true,
        user: response.user,
        token: response.token
      };
    } catch (error) {
      const authError = isAuthError(error) ? error : mapErrorToAuthError(error);
      
      if (authError.type === AuthErrorType.CANCELLED) {
        return {
          success: false,
          error: authError
        };
      }
      
      return {
        success: false,
        error: createAuthError(
          credential.type === 'apple' ? AuthErrorType.APPLE_SIGNIN_FAILED : AuthErrorType.GOOGLE_SIGNIN_FAILED,
          authError.originalError,
          authError.message
        )
      };
    }
  }

  async signInWithApple(): Promise<AuthResult> {
    try {
      const credential = await signInWithApple();
      return this.signInWithSocial(credential);
    } catch (error) {
      return {
        success: false,
        error: createAuthError(AuthErrorType.APPLE_SIGNIN_FAILED, error as Error)
      };
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const credential = await signInWithGoogle();
      return this.signInWithSocial(credential);
    } catch (error) {
      return {
        success: false,
        error: createAuthError(AuthErrorType.GOOGLE_SIGNIN_FAILED, error as Error)
      };
    }
  }

  async signUp(username: string, phoneNumber?: string, socialData?: {
    apple_id?: string;
    google_id?: string;
    email?: string;
    full_name?: string;
    id_token?: string;
  }): Promise<SignUpResult> {
    try {
      let response: T.SignUpAPIResponse | T.AppleSignInAPIResponse | T.GoogleSignInAPIResponse;
      
      if (socialData?.apple_id && socialData.id_token) {
        response = await this.executeWithoutRetry(
          () => this.client.appleSignUp(socialData.id_token, username, 'chat.gatz')
        );
      } else if (socialData?.google_id && socialData.id_token) {
        response = await this.executeWithoutRetry(
          () => this.client.googleSignUp(socialData.id_token, username, socialData.google_id)
        );
      } else if (phoneNumber) {
        response = await this.executeWithoutRetry(
          () => this.client.signUp(username, phoneNumber)
        );
      } else {
        return {
          success: false,
          error: createAuthError(AuthErrorType.UNKNOWN_ERROR, undefined, 'Missing authentication method')
        };
      }

      if (response.type === 'error') {
        let errorType: AuthErrorType;
        switch (response.error) {
          case 'username_taken':
            errorType = AuthErrorType.USERNAME_TAKEN;
            break;
          case 'invalid_username':
            errorType = AuthErrorType.USERNAME_INVALID;
            break;
          case 'phone_taken':
            errorType = AuthErrorType.PHONE_TAKEN;
            break;
          case 'signup_disabled':
            errorType = AuthErrorType.SIGNUP_DISABLED;
            break;
          case 'sms_signup_restricted':
            errorType = AuthErrorType.SIGNUP_DISABLED;
            break;
          default:
            errorType = AuthErrorType.UNKNOWN_ERROR;
        }
        
        return {
          success: false,
          error: createAuthError(errorType, undefined, response.message, false)
        };
      }

      return {
        success: true,
        user: response.user,
        token: response.token
      };
    } catch (error) {
      return {
        success: false,
        error: isAuthError(error) ? error : mapErrorToAuthError(error)
      };
    }
  }

  async sendEmailCode(email: string): Promise<EmailVerificationResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.sendEmailCode(email)
      );

      if ('status' in response && response.status === 'sent') {
        return {
          success: true,
          requiresCode: true
        };
      } else {
        return {
          success: false,
          requiresCode: false,
          error: createAuthError(AuthErrorType.EMAIL_SENDING_FAILED)
        };
      }
    } catch (error) {
      return {
        success: false,
        requiresCode: false,
        error: error instanceof Error ? mapErrorToAuthError(error) : createAuthError(AuthErrorType.EMAIL_SENDING_FAILED)
      };
    }
  }

  async verifyEmailCode(email: string, code: string): Promise<EmailCodeVerificationResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.verifyEmailCode(email, code)
      );

      if ('status' in response) {
        switch (response.status) {
          case 'approved':
            if ('user' in response && 'token' in response && response.user && response.token) {
              return {
                success: true,
                user: response.user,
                token: response.token
              };
            } else {
              return {
                success: true,
                requiresSignup: true
              };
            }
          case 'wrong_code':
            return {
              success: false,
              error: createAuthError(AuthErrorType.INVALID_CODE, undefined, undefined, false)
            };
          case 'expired':
            return {
              success: false,
              error: createAuthError(AuthErrorType.CODE_EXPIRED)
            };
          case 'no_code':
            return {
              success: false,
              error: createAuthError(AuthErrorType.INVALID_CODE, undefined, 'No verification code found')
            };
          case 'max_attempts':
            return {
              success: false,
              error: createAuthError(AuthErrorType.CODE_EXPIRED, undefined, 'Too many attempts')
            };
          default:
            return {
              success: false,
              error: createAuthError(AuthErrorType.UNKNOWN_ERROR)
            };
        }
      } else if ('requires_signup' in response && response.requires_signup) {
        return {
          success: true,
          requiresSignup: true
        };
      } else {
        return {
          success: false,
          error: createAuthError(AuthErrorType.UNKNOWN_ERROR)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? mapErrorToAuthError(error) : createAuthError(AuthErrorType.NETWORK_ERROR)
      };
    }
  }

  async signInWithEmail(email: string, code: string): Promise<AuthResult> {
    try {
      const result = await this.verifyEmailCode(email, code);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      if (result.requiresSignup) {
        return {
          success: true,
          requiresSignup: true,
          signupData: {
            email: email
          }
        };
      }

      return {
        success: true,
        user: result.user,
        token: result.token
      };
    } catch (error) {
      return {
        success: false,
        error: createAuthError(AuthErrorType.EMAIL_SIGNIN_FAILED, error as Error)
      };
    }
  }

  async signUpWithEmail(email: string, username: string): Promise<SignUpResult> {
    try {
      const response = await this.executeWithoutRetry(
        () => this.client.emailSignUp(email, username)
      );

      if (response.type === 'error') {
        let errorType: AuthErrorType;
        switch (response.error) {
          case 'username_taken':
            errorType = AuthErrorType.USERNAME_TAKEN;
            break;
          case 'invalid_username':
            errorType = AuthErrorType.USERNAME_INVALID;
            break;
          case 'email_taken':
            errorType = AuthErrorType.EMAIL_TAKEN;
            break;
          case 'signup_disabled':
            errorType = AuthErrorType.SIGNUP_DISABLED;
            break;
          default:
            errorType = AuthErrorType.UNKNOWN_ERROR;
        }
        
        return {
          success: false,
          error: createAuthError(errorType, undefined, response.message, false)
        };
      }

      return {
        success: true,
        user: response.user,
        token: response.token
      };
    } catch (error) {
      return {
        success: false,
        error: isAuthError(error) ? error : mapErrorToAuthError(error)
      };
    }
  }

  logError(error: AuthError, context?: string): void {
    console.error(`Auth Error${context ? ` (${context})` : ''}:`, {
      type: error.type,
      message: error.message,
      canRetry: error.canRetry,
      originalError: error.originalError
    });
  }

  showErrorAlert(error: AuthError, title: string = 'Sign-in Failed'): void {
    Alert.alert(title, error.message);
  }
}