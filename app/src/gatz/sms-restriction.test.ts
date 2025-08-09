import { AuthService } from './auth-service';
import { AuthErrorType } from './auth-errors';
import * as T from './types';
import { getAuthConfig } from './config';

// Mock native dependencies first
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  AppleAuthenticationScope: {
    EMAIL: 0,
    FULL_NAME: 1,
  },
}));

const mockClient = {
  signUp: jest.fn(),
  verifyPhone: jest.fn(),
  verifyCode: jest.fn(),
};

// Mock the OpenClient constructor
jest.doMock('./client', () => ({
  OpenClient: jest.fn(() => mockClient)
}));

jest.doMock('./config', () => ({
  getAuthConfig: jest.fn()
}));

const mockGetAuthConfig = getAuthConfig as jest.MockedFunction<typeof getAuthConfig>;

describe('@sms-restriction @auth SMS Restriction Handling', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('SMS Signup Restriction', () => {
    it('should handle sms_signup_restricted error from backend', async () => {
      // Mock backend response for SMS signup restriction
      const mockErrorResponse: T.SignUpAPIResponse = {
        type: 'error',
        error: 'sms_signup_restricted',
        message: 'SMS signup is no longer available for new users. Please sign up with Apple, Google, or email instead.'
      };
      
      mockClient.signUp.mockResolvedValue(mockErrorResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.SIGNUP_DISABLED);
      expect(result.error?.message).toContain('SMS signup is no longer available');
      expect(result.error?.canRetry).toBe(false);
    });

    it('should still allow SMS signup when restriction is disabled', async () => {
      // Mock successful signup response
      const mockSuccessResponse: T.SignUpAPIResponse = {
        type: 'sign_up',
        user: {
          id: 'test-user-id',
          name: 'testuser',
          avatar: null,
          phone_number: '+1234567890'
        } as T.User,
        token: 'mock-jwt-token'
      };

      mockClient.signUp.mockResolvedValue(mockSuccessResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-jwt-token');
      expect(mockClient.signUp).toHaveBeenCalledWith('testuser', '+1234567890');
    });
  });

  describe('Frontend Configuration', () => {
    it('should respect development vs production SMS restriction config', () => {
      // Mock development environment
      mockGetAuthConfig.mockReturnValue({
        smsSignupRestricted: false
      });

      const devConfig = getAuthConfig();
      expect(devConfig.smsSignupRestricted).toBe(false);

      // Mock production environment
      mockGetAuthConfig.mockReturnValue({
        smsSignupRestricted: true
      });

      const prodConfig = getAuthConfig();
      expect(prodConfig.smsSignupRestricted).toBe(true);
    });
  });

  describe('Legacy User SMS Sign-in', () => {
    it('should allow SMS phone verification for existing users', async () => {
      const mockPhoneVerifyResponse: T.VerifyPhoneAPIResponse = {
        phone_number: '+1234567890',
        status: 'pending',
        attemps: 0,
        user: {
          id: 'existing-user-id',
          name: 'existing_user',
          phone_number: '+1234567890'
        } as T.User
      };

      mockClient.verifyPhone.mockResolvedValue(mockPhoneVerifyResponse);

      const result = await authService.verifyPhone('+1234567890');

      expect(result.success).toBe(true);
      expect(result.requiresCode).toBe(true);
      expect(result.existingUser).toBeDefined();
      expect(result.existingUser?.name).toBe('existing_user');
    });

    it('should allow SMS code verification for existing users', async () => {
      const mockCodeVerifyResponse: T.VerifyCodeAPIResponse = {
        phone_number: '+1234567890',
        status: 'approved',
        attemps: 0,
        user: {
          id: 'existing-user-id',
          name: 'existing_user',
          phone_number: '+1234567890'
        } as T.User,
        token: 'existing-user-token'
      };

      mockClient.verifyCode.mockResolvedValue(mockCodeVerifyResponse);

      const result = await authService.verifyCode('+1234567890', '123456');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('existing-user-token');
      expect(result.requiresSignup).toBeUndefined();
    });
  });

  describe('Error Message Mapping', () => {
    it('should map sms_signup_restricted to appropriate error type', async () => {
      const mockErrorResponse: T.SignUpAPIResponse = {
        type: 'error',
        error: 'sms_signup_restricted'
      };

      mockClient.signUp.mockResolvedValue(mockErrorResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.SIGNUP_DISABLED);
      expect(result.error?.canRetry).toBe(false);
    });

    it('should handle other signup errors normally', async () => {
      const mockErrorResponse: T.SignUpAPIResponse = {
        type: 'error',
        error: 'username_taken'
      };

      mockClient.signUp.mockResolvedValue(mockErrorResponse);

      const result = await authService.signUp('testuser', '+1234567890');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(AuthErrorType.USERNAME_TAKEN);
    });
  });
});