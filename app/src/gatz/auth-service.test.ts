import { AuthService, AuthResult } from './auth-service';
import { AuthErrorType } from './auth-errors';
import * as T from './types';

// Mock dependencies
jest.mock('./client');
jest.mock('./auth');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

const mockClient = {
  verifyPhone: jest.fn(),
  verifyCode: jest.fn(),
  checkUsername: jest.fn(),
  appleSignIn: jest.fn(),
  googleSignIn: jest.fn(),
  signUp: jest.fn(),
  appleSignUp: jest.fn()
};

const mockAuth = {
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn()
};

// Mock the OpenClient constructor to return our mock
jest.doMock('./client', () => ({
  OpenClient: jest.fn(() => mockClient)
}));

jest.doMock('./auth', () => mockAuth);

describe('@auth-service @error-handling Authentication Service', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('verifyPhone', () => {
    it('should return success for valid phone verification', async () => {
      const mockResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'pending',
        attemps: 0
      };
      mockClient.verifyPhone.mockResolvedValue(mockResponse);

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(true);
      expect(result.requiresCode).toBe(true);
      expect(mockClient.verifyPhone).toHaveBeenCalledWith('+1234567890');
    });

    it('should handle existing user in phone verification', async () => {
      const mockUser: T.User = {
        id: 'user-123',
        name: 'Test User',
        phone_number: '+1234567890',
        avatar: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        clock: { counter: 1, node: 'node-1', ts: '2023-01-01' }
      };

      const mockResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'pending',
        user: mockUser,
        attemps: 0
      };
      mockClient.verifyPhone.mockResolvedValue(mockResponse);

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(true);
      expect(result.existingUser).toEqual(mockUser);
    });

    it('should handle network errors in phone verification', async () => {
      mockClient.verifyPhone.mockRejectedValue(new Error('Network error'));

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.NETWORK_ERROR);
    });
  });

  describe('verifyCode', () => {
    it('should return success for existing user', async () => {
      const mockUser: T.User = {
        id: 'user-123',
        name: 'Test User',
        phone_number: '+1234567890',
        avatar: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        clock: { counter: 1, node: 'node-1', ts: '2023-01-01' }
      };

      const mockResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'approved',
        user: mockUser,
        token: 'auth-token-123',
        attemps: 1
      };
      mockClient.verifyCode.mockResolvedValue(mockResponse);

      const result = await authService.verifyCode('+1234567890', '1234');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('auth-token-123');
    });

    it('should handle new user requiring signup', async () => {
      const mockResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'approved',
        attemps: 1
      };
      mockClient.verifyCode.mockResolvedValue(mockResponse);

      const result = await authService.verifyCode('+1234567890', '1234');

      expect(result.success).toBe(true);
      expect(result.requiresSignup).toBe(true);
    });

    it('should handle wrong code error', async () => {
      const mockResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'wrong_code',
        attemps: 1
      };
      mockClient.verifyCode.mockResolvedValue(mockResponse);

      const result = await authService.verifyCode('+1234567890', '0000');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.INVALID_CODE);
      expect(result.error?.canRetry).toBe(false);
    });
  });

  describe('checkUsername', () => {
    it('should return username availability', async () => {
      const mockResponse: T.CheckUsernameAPIResponse = {
        username: 'testuser',
        available: true
      };
      mockClient.checkUsername.mockResolvedValue(mockResponse);

      const result = await authService.checkUsername('testuser');

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
    });

    it('should handle username check errors', async () => {
      mockClient.checkUsername.mockRejectedValue(new Error('Network error'));

      const result = await authService.checkUsername('testuser');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.NETWORK_ERROR);
    });
  });

  describe('signInWithApple', () => {
    it('should handle successful Apple sign-in', async () => {
      const mockCredential = {
        type: 'apple' as const,
        identityToken: 'apple-token',
        user: 'apple-user-id'
      };

      const mockUser: T.User = {
        id: 'user-123',
        name: 'Test User',
        phone_number: '+1234567890',
        avatar: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        clock: { counter: 1, node: 'node-1', ts: '2023-01-01' }
      };

      const mockResponse: T.AppleSignInAPIResponse = {
        type: 'sign_in',
        user: mockUser,
        token: 'auth-token-123'
      };

      mockAuth.signInWithApple.mockResolvedValue(mockCredential);
      mockClient.appleSignIn.mockResolvedValue(mockResponse);

      const result = await authService.signInWithApple();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('auth-token-123');
    });

    it('should handle Apple sign-in requiring signup', async () => {
      const mockCredential = {
        type: 'apple' as const,
        identityToken: 'apple-token',
        user: 'apple-user-id'
      };

      const mockResponse: T.AppleSignInAPIResponse = {
        requires_signup: true,
        apple_id: 'apple-user-id',
        email: 'user@example.com',
        full_name: 'Test User'
      };

      mockAuth.signInWithApple.mockResolvedValue(mockCredential);
      mockClient.appleSignIn.mockResolvedValue(mockResponse);

      const result = await authService.signInWithApple();

      expect(result.success).toBe(true);
      expect(result.requiresSignup).toBe(true);
      expect(result.signupData?.apple_id).toBe('apple-user-id');
      expect(result.signupData?.email).toBe('user@example.com');
    });

    it('should handle Apple sign-in errors', async () => {
      mockAuth.signInWithApple.mockRejectedValue(new Error('Apple Sign-In failed'));

      const result = await authService.signInWithApple();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.APPLE_SIGNIN_FAILED);
    });

    it('should handle cancelled Apple sign-in', async () => {
      const cancelError = new Error('Sign-in was cancelled');
      mockAuth.signInWithApple.mockRejectedValue(cancelError);

      const result = await authService.signInWithApple();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.APPLE_SIGNIN_FAILED);
    });
  });

  describe('signUp', () => {
    it('should handle successful SMS signup', async () => {
      const mockUser: T.User = {
        id: 'user-123',
        name: 'testuser',
        phone_number: '+1234567890',
        avatar: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        clock: { counter: 1, node: 'node-1', ts: '2023-01-01' }
      };

      const mockResponse: T.SignUpAPIResponse = {
        type: 'sign_up',
        user: mockUser,
        token: 'auth-token-123'
      };

      mockClient.signUp.mockResolvedValue(mockResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('auth-token-123');
    });

    it('should handle successful Apple signup', async () => {
      const mockUser: T.User = {
        id: 'user-123',
        name: 'testuser',
        phone_number: '+1234567890',
        avatar: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        clock: { counter: 1, node: 'node-1', ts: '2023-01-01' }
      };

      const mockResponse: T.AppleSignInAPIResponse = {
        type: 'sign_up',
        user: mockUser,
        token: 'auth-token-123'
      };

      mockClient.appleSignUp.mockResolvedValue(mockResponse);

      const result = await authService.signUp('testuser', undefined, {
        apple_id: 'apple-user-id',
        id_token: 'apple-token'
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('auth-token-123');
    });

    it('should handle username taken error', async () => {
      const mockResponse: T.SignUpAPIResponse = {
        type: 'error',
        error: 'username_taken'
      };

      mockClient.signUp.mockResolvedValue(mockResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.USERNAME_TAKEN);
      expect(result.error?.canRetry).toBe(false);
    });

    it('should handle signup disabled error', async () => {
      const mockResponse: T.SignUpAPIResponse = {
        type: 'error',
        error: 'signup_disabled'
      };

      mockClient.signUp.mockResolvedValue(mockResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.SIGNUP_DISABLED);
      expect(result.error?.canRetry).toBe(false);
    });
  });

  describe('retry mechanism', () => {
    it('should retry retryable errors', async () => {
      // First call fails with network error, second succeeds
      mockClient.verifyPhone
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          phone_number: '+1234567890',
          status: 'pending',
          attemps: 0
        });

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(true);
      expect(mockClient.verifyPhone).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const cancelError = new Error('Operation was cancelled');
      mockClient.verifyPhone.mockRejectedValue(cancelError);

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(false);
      expect(mockClient.verifyPhone).toHaveBeenCalledTimes(1);
    });
  });
});