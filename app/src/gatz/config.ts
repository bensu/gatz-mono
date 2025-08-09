// Frontend configuration constants for SMS authentication restrictions
// This file allows easy toggling of SMS restrictions for development and testing

export interface AuthConfig {
  // SMS signup restriction configuration
  smsSignupRestricted: boolean;
}

/**
 * Get authentication configuration based on environment
 * For now, we use hardcoded values but this could be extended
 * to read from environment variables or remote config
 */
export const getAuthConfig = (): AuthConfig => {
  // In development, allow SMS signup for testing
  // In production, restrict SMS signup to existing users only (Phase 2)
  const isDev = __DEV__ || process.env.NODE_ENV === 'development';
  
  return {
    smsSignupRestricted: !isDev, // Restrict SMS signup in production, allow in dev
  };
};

export default getAuthConfig;