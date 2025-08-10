export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CANCELLED = 'CANCELLED', 
  INVALID_TOKEN = 'INVALID_TOKEN',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_CONFLICT = 'ACCOUNT_CONFLICT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_CODE = 'INVALID_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  SMS_SENDING_FAILED = 'SMS_SENDING_FAILED',
  APPLE_SIGNIN_FAILED = 'APPLE_SIGNIN_FAILED',
  GOOGLE_SIGNIN_FAILED = 'GOOGLE_SIGNIN_FAILED',
  USERNAME_INVALID = 'USERNAME_INVALID',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  PHONE_INVALID = 'PHONE_INVALID',
  PHONE_TAKEN = 'PHONE_TAKEN',
  SIGNUP_DISABLED = 'SIGNUP_DISABLED',
  EMAIL_INVALID = 'EMAIL_INVALID',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  APPLE_EMAIL_TAKEN = 'APPLE_EMAIL_TAKEN',
  GOOGLE_EMAIL_TAKEN = 'GOOGLE_EMAIL_TAKEN',
  EMAIL_SENDING_FAILED = 'EMAIL_SENDING_FAILED',
  EMAIL_SIGNIN_FAILED = 'EMAIL_SIGNIN_FAILED'
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorType, string> = {
  [AuthErrorType.NETWORK_ERROR]: "Please check your internet connection and try again",
  [AuthErrorType.CANCELLED]: "Sign-in was cancelled. Please try again when you're ready",
  [AuthErrorType.INVALID_TOKEN]: "Authentication failed. Please try signing in again",
  [AuthErrorType.ACCOUNT_NOT_FOUND]: "No account found. Please sign up first",
  [AuthErrorType.ACCOUNT_CONFLICT]: "This Google or Apple ID is already used in Gatz",
  [AuthErrorType.SERVICE_UNAVAILABLE]: "Authentication service is temporarily unavailable",
  [AuthErrorType.RATE_LIMITED]: "Too many attempts. Please wait before trying again",
  [AuthErrorType.UNKNOWN_ERROR]: "Something went wrong. Please contact support if this continues",
  [AuthErrorType.INVALID_CODE]: "Invalid verification code. Please check and try again",
  [AuthErrorType.CODE_EXPIRED]: "Verification code has expired. Please request a new one",
  [AuthErrorType.SMS_SENDING_FAILED]: "Failed to send verification code. Please try again",
  [AuthErrorType.APPLE_SIGNIN_FAILED]: "Apple Sign-In failed. Please try again",
  [AuthErrorType.GOOGLE_SIGNIN_FAILED]: "Google Sign-In failed. Please try again", 
  [AuthErrorType.USERNAME_INVALID]: "Please enter a valid username",
  [AuthErrorType.USERNAME_TAKEN]: "This username is already taken. Please choose another",
  [AuthErrorType.PHONE_INVALID]: "Please enter a valid phone number",
  [AuthErrorType.PHONE_TAKEN]: "This phone number is already registered",
  [AuthErrorType.SIGNUP_DISABLED]: "Sign up is currently disabled",
  [AuthErrorType.EMAIL_INVALID]: "Please enter a valid email address",
  [AuthErrorType.EMAIL_TAKEN]: "This email address is already registered",
  [AuthErrorType.APPLE_EMAIL_TAKEN]: "The email associated with this Apple ID is already registered with another account",
  [AuthErrorType.GOOGLE_EMAIL_TAKEN]: "The email associated with this Google account is already registered with another account",
  [AuthErrorType.EMAIL_SENDING_FAILED]: "Unknown error, please try again",
  [AuthErrorType.EMAIL_SIGNIN_FAILED]: "Email sign-in failed. Please try again"
};

export interface AuthError {
  type: AuthErrorType;
  message: string;
  canRetry: boolean;
  retryDelay?: number;
  originalError?: Error;
}

export const createAuthError = (
  type: AuthErrorType,
  originalError?: Error,
  customMessage?: string,
  canRetry: boolean = true,
  retryDelay?: number
): AuthError => ({
  type,
  message: customMessage || AUTH_ERROR_MESSAGES[type],
  canRetry,
  retryDelay,
  originalError
});

export const mapErrorToAuthError = (error: any): AuthError => {
  if (!error) {
    return createAuthError(AuthErrorType.UNKNOWN_ERROR);
  }

  if (typeof error === 'string') {
    return createAuthError(AuthErrorType.UNKNOWN_ERROR, undefined, error);
  }

  if (error.message?.toLowerCase().includes('network')) {
    return createAuthError(AuthErrorType.NETWORK_ERROR, error);
  }

  if (error.message?.toLowerCase().includes('cancelled') || 
      error.message?.toLowerCase().includes('canceled')) {
    return createAuthError(AuthErrorType.CANCELLED, error, undefined, false);
  }

  if (error.response?.status === 400) {
    // First check if this is a structured backend error
    if (error.response?.data?.error) {
      const backendError = error.response.data.error;
      
      switch (backendError) {
        case 'invalid_token':
        case 'token_expired':
          return createAuthError(AuthErrorType.INVALID_TOKEN, error, undefined, false);
        case 'invalid_username':
          return createAuthError(AuthErrorType.USERNAME_INVALID, error, undefined, false);
        case 'username_taken':
          return createAuthError(AuthErrorType.USERNAME_TAKEN, error, undefined, false);
        case 'phone_taken':
          return createAuthError(AuthErrorType.PHONE_TAKEN, error, undefined, false);
        case 'signup_disabled':
          return createAuthError(AuthErrorType.SIGNUP_DISABLED, error, undefined, false);
        case 'sms_signup_restricted':
          return createAuthError(AuthErrorType.SIGNUP_DISABLED, error, error.response?.data?.message, false);
        case 'apple_id_taken':
        case 'google_id_taken':
          return createAuthError(AuthErrorType.ACCOUNT_CONFLICT, error, undefined, false);
        case 'apple_email_taken':
          return createAuthError(AuthErrorType.APPLE_EMAIL_TAKEN, error, undefined, false);
        case 'google_email_taken':
          return createAuthError(AuthErrorType.GOOGLE_EMAIL_TAKEN, error, undefined, false);
        case 'email_taken':
          return createAuthError(AuthErrorType.EMAIL_TAKEN, error, undefined, false);
        default:
          break;
      }
    }
    
    // Handle other 400 errors
    // Check if this is an email-related endpoint
    const url = error.config?.url || '';
    if (url.includes('/auth/send-email-code')) {
      return createAuthError(AuthErrorType.EMAIL_SENDING_FAILED, error, undefined, true);
    }
    return createAuthError(AuthErrorType.UNKNOWN_ERROR, error, undefined, true);
  }

  if (error.response?.status === 401) {
    return createAuthError(AuthErrorType.INVALID_TOKEN, error, undefined, false);
  }

  if (error.response?.status === 404) {
    return createAuthError(AuthErrorType.ACCOUNT_NOT_FOUND, error, undefined, false);
  }

  if (error.response?.status === 409) {
    return createAuthError(AuthErrorType.ACCOUNT_CONFLICT, error, undefined, false);
  }

  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    return createAuthError(AuthErrorType.RATE_LIMITED, error, undefined, true, retryDelay);
  }

  if (error.response?.status === 503) {
    return createAuthError(AuthErrorType.SERVICE_UNAVAILABLE, error);
  }

  return createAuthError(AuthErrorType.UNKNOWN_ERROR, error);
};

export const isRetryableError = (error: AuthError): boolean => {
  return error.canRetry && ![
    AuthErrorType.CANCELLED,
    AuthErrorType.ACCOUNT_NOT_FOUND,
    AuthErrorType.ACCOUNT_CONFLICT,
    AuthErrorType.USERNAME_TAKEN,
    AuthErrorType.PHONE_TAKEN,
    AuthErrorType.EMAIL_TAKEN,
    AuthErrorType.APPLE_EMAIL_TAKEN,
    AuthErrorType.GOOGLE_EMAIL_TAKEN,
    AuthErrorType.INVALID_TOKEN,
    AuthErrorType.SIGNUP_DISABLED
  ].includes(error.type);
};

export const isAuthError = (error: any): error is AuthError => {
  return (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'message' in error &&
    'canRetry' in error &&
    Object.values(AuthErrorType).includes(error.type)
  );
};

export const getRetryDelay = (error: AuthError, attemptNumber: number): number => {
  if (error.retryDelay) {
    return error.retryDelay;
  }
  
  const baseDelay = 1000;
  const maxDelay = 30000;
  
  return Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
};