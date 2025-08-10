import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthError, AuthErrorType, isRetryableError } from '../gatz/auth-errors';
import { Color as GatzColor, Styles as GatzStyles } from '../gatz/styles';

interface AuthErrorDisplayProps {
  error: AuthError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  style?: any;
}

export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetryButton = true,
  style
}) => {
  const canShowRetry = showRetryButton && isRetryableError(error) && onRetry;
  
  const getErrorIcon = (errorType: AuthErrorType): string => {
    switch (errorType) {
      case AuthErrorType.NETWORK_ERROR:
        return 'wifi-off';
      case AuthErrorType.CANCELLED:
        return 'cancel';
      case AuthErrorType.INVALID_TOKEN:
      case AuthErrorType.INVALID_CODE:
        return 'lock';
      case AuthErrorType.ACCOUNT_NOT_FOUND:
        return 'person-search';
      case AuthErrorType.ACCOUNT_CONFLICT:
      case AuthErrorType.USERNAME_TAKEN:
      case AuthErrorType.PHONE_TAKEN:
      case AuthErrorType.EMAIL_TAKEN:
      case AuthErrorType.APPLE_EMAIL_TAKEN:
      case AuthErrorType.GOOGLE_EMAIL_TAKEN:
        return 'error';
      case AuthErrorType.SERVICE_UNAVAILABLE:
        return 'cloud-off';
      case AuthErrorType.RATE_LIMITED:
        return 'schedule';
      default:
        return 'warning';
    }
  };

  const getErrorColor = (errorType: AuthErrorType): string => {
    switch (errorType) {
      case AuthErrorType.CANCELLED:
        return GatzColor.introTitle;
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.SERVICE_UNAVAILABLE:
        return '#FF9500'; // Orange for service issues
      case AuthErrorType.RATE_LIMITED:
        return '#FF9500'; // Orange for temporary issues
      default:
        return '#FF3B30'; // Red for errors
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.errorContent}>
        <MaterialIcons
          name={getErrorIcon(error.type)}
          size={24}
          color={getErrorColor(error.type)}
          style={styles.errorIcon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.errorMessage, { color: getErrorColor(error.type) }]}>
            {error.message}
          </Text>
          {error.type === AuthErrorType.RATE_LIMITED && error.retryDelay && (
            <Text style={styles.retryInfo}>
              Try again in {Math.ceil(error.retryDelay / 1000)} seconds
            </Text>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <MaterialIcons name="close" size={20} color={GatzColor.strongerGrey} />
          </TouchableOpacity>
        )}
      </View>
      
      {canShowRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <MaterialIcons name="refresh" size={18} color={GatzColor.introTitle} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: GatzStyles.tagline.fontFamily,
    lineHeight: 22,
  },
  retryInfo: {
    fontSize: 14,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
    marginTop: 4,
    opacity: 0.7,
  },
  dismissButton: {
    padding: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  retryText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
    fontWeight: '500',
  },
});