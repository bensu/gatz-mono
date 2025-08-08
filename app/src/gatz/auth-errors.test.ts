import {
  AuthErrorType,
  AUTH_ERROR_MESSAGES,
  createAuthError,
  mapErrorToAuthError,
  isRetryableError,
  getRetryDelay
} from './auth-errors';

describe('@auth-errors @error-handling Auth Error Handling', () => {
  describe('createAuthError', () => {
    it('should create auth error with default message', () => {
      const error = createAuthError(AuthErrorType.NETWORK_ERROR);
      
      expect(error.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(error.message).toBe(AUTH_ERROR_MESSAGES[AuthErrorType.NETWORK_ERROR]);
      expect(error.canRetry).toBe(true);
    });

    it('should create auth error with custom message', () => {
      const customMessage = 'Custom error message';
      const error = createAuthError(AuthErrorType.UNKNOWN_ERROR, undefined, customMessage);
      
      expect(error.message).toBe(customMessage);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original error');
      const error = createAuthError(AuthErrorType.NETWORK_ERROR, originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('mapErrorToAuthError', () => {
    it('should handle null/undefined errors', () => {
      const error1 = mapErrorToAuthError(null);
      const error2 = mapErrorToAuthError(undefined);
      
      expect(error1.type).toBe(AuthErrorType.UNKNOWN_ERROR);
      expect(error2.type).toBe(AuthErrorType.UNKNOWN_ERROR);
    });

    it('should handle string errors', () => {
      const error = mapErrorToAuthError('Network failed');
      
      expect(error.type).toBe(AuthErrorType.UNKNOWN_ERROR);
      expect(error.message).toBe('Network failed');
    });

    it('should map network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const error = mapErrorToAuthError(networkError);
      
      expect(error.type).toBe(AuthErrorType.NETWORK_ERROR);
    });

    it('should map cancelled errors correctly', () => {
      const cancelError = new Error('Operation was cancelled');
      const error = mapErrorToAuthError(cancelError);
      
      expect(error.type).toBe(AuthErrorType.CANCELLED);
      expect(error.canRetry).toBe(false);
    });

    it('should map HTTP status codes correctly', () => {
      const errors = [
        { status: 401, expectedType: AuthErrorType.INVALID_TOKEN },
        { status: 404, expectedType: AuthErrorType.ACCOUNT_NOT_FOUND },
        { status: 409, expectedType: AuthErrorType.ACCOUNT_CONFLICT },
        { status: 429, expectedType: AuthErrorType.RATE_LIMITED },
        { status: 503, expectedType: AuthErrorType.SERVICE_UNAVAILABLE }
      ];

      errors.forEach(({ status, expectedType }) => {
        const httpError = {
          response: { status, headers: {} }
        };
        const error = mapErrorToAuthError(httpError);
        
        expect(error.type).toBe(expectedType);
      });
    });

    it('should handle rate limiting with retry-after header', () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' }
        }
      };
      const error = mapErrorToAuthError(rateLimitError);
      
      expect(error.type).toBe(AuthErrorType.RATE_LIMITED);
      expect(error.retryDelay).toBe(60000); // 60 seconds in ms
    });

    it('should map backend error codes correctly', () => {
      const backendErrors = [
        { error: 'invalid_token', expectedType: AuthErrorType.INVALID_TOKEN },
        { error: 'username_taken', expectedType: AuthErrorType.USERNAME_TAKEN },
        { error: 'phone_taken', expectedType: AuthErrorType.PHONE_TAKEN },
        { error: 'signup_disabled', expectedType: AuthErrorType.SIGNUP_DISABLED },
        { error: 'apple_id_taken', expectedType: AuthErrorType.ACCOUNT_CONFLICT }
      ];

      backendErrors.forEach(({ error: backendError, expectedType }) => {
        const httpError = {
          response: {
            status: 400,
            data: { error: backendError },
            headers: {}
          }
        };
        const error = mapErrorToAuthError(httpError);
        
        expect(error.type).toBe(expectedType);
      });
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors correctly', () => {
      const retryableErrors = [
        AuthErrorType.NETWORK_ERROR,
        AuthErrorType.SERVICE_UNAVAILABLE,
        AuthErrorType.RATE_LIMITED,
        AuthErrorType.SMS_SENDING_FAILED
      ];

      retryableErrors.forEach(type => {
        const error = createAuthError(type);
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors correctly', () => {
      const nonRetryableErrors = [
        AuthErrorType.CANCELLED,
        AuthErrorType.ACCOUNT_NOT_FOUND,
        AuthErrorType.ACCOUNT_CONFLICT,
        AuthErrorType.USERNAME_TAKEN,
        AuthErrorType.PHONE_TAKEN,
        AuthErrorType.INVALID_TOKEN,
        AuthErrorType.SIGNUP_DISABLED
      ];

      nonRetryableErrors.forEach(type => {
        const error = createAuthError(type);
        expect(isRetryableError(error)).toBe(false);
      });
    });

    it('should respect canRetry flag', () => {
      const error = createAuthError(AuthErrorType.NETWORK_ERROR, undefined, undefined, false);
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should use custom retry delay when provided', () => {
      const error = createAuthError(AuthErrorType.RATE_LIMITED, undefined, undefined, true, 5000);
      const delay = getRetryDelay(error, 0);
      
      expect(delay).toBe(5000);
    });

    it('should use exponential backoff for retry delays', () => {
      const error = createAuthError(AuthErrorType.NETWORK_ERROR);
      
      const delay0 = getRetryDelay(error, 0);
      const delay1 = getRetryDelay(error, 1);
      const delay2 = getRetryDelay(error, 2);
      
      expect(delay0).toBe(1000);  // 1s
      expect(delay1).toBe(2000);  // 2s
      expect(delay2).toBe(4000);  // 4s
    });

    it('should cap retry delay at maximum', () => {
      const error = createAuthError(AuthErrorType.NETWORK_ERROR);
      const delay = getRetryDelay(error, 10); // Very high attempt number
      
      expect(delay).toBe(30000); // 30s max
    });
  });

  describe('AUTH_ERROR_MESSAGES', () => {
    it('should have messages for all error types', () => {
      Object.values(AuthErrorType).forEach(errorType => {
        expect(AUTH_ERROR_MESSAGES[errorType]).toBeTruthy();
        expect(typeof AUTH_ERROR_MESSAGES[errorType]).toBe('string');
        expect(AUTH_ERROR_MESSAGES[errorType].length).toBeGreaterThan(0);
      });
    });

    it('should have user-friendly messages', () => {
      // Verify messages are helpful and don't contain technical jargon
      const messages = Object.values(AUTH_ERROR_MESSAGES);
      
      messages.forEach(message => {
        expect(message).not.toMatch(/\berror\b/i); // Avoid saying "error" to user
        expect(message).not.toMatch(/\bfail(ed)?\b/i); // Avoid saying "failed"
        expect(message.length).toBeLessThan(100); // Keep messages concise
      });
    });
  });
});