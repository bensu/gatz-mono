import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import { SocialSignInButtons } from './SocialSignInButtons';
import { EmailSignInComponent } from './EmailSignInComponent';
import { AuthErrorDisplay } from './AuthErrorDisplay';
import { SocialSignInCredential } from '../gatz/auth';
import { AuthError, AuthErrorType } from '../gatz/auth-errors';
import { GatzClient } from '../gatz/client';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MigrationScreenProps {
  visible: boolean;
  onClose: () => void;
  onRemindLater: () => void;
  onMigrationSuccess: () => void;
  onLinkAccount: (credential: SocialSignInCredential) => Promise<void>;
  gatzClient?: GatzClient; // Optional for email linking
}

const ANIMATION_DURATION = 100;

export const MigrationScreen: React.FC<MigrationScreenProps> = ({
  visible,
  onClose,
  onRemindLater,
  onMigrationSuccess,
  onLinkAccount,
  gatzClient,
}) => {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(false);
  const [currentError, setCurrentError] = useState<AuthError | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
        mass: 0.5,
      });
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
    }
  }, [visible]);

  const handleContactSupport = useCallback(async () => {
    const supportEmail = 'sbensu@gmail.com';
    const subject = 'Migration Help Request';
    const body = 'I need help migrating my account to Apple/Google Sign-In.';
    
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback to showing email address
        if (Platform.OS === 'web') {
          alert(`Please contact us at: ${supportEmail}`);
        } else {
          Alert.alert(
            'Contact Support',
            `Please contact us at: ${supportEmail}`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
    } catch (error) {
      console.error('Failed to open mail client:', error);
      if (Platform.OS === 'web') {
        alert(`Please contact us at: ${supportEmail}`);
      } else {
        Alert.alert(
          'Contact Support',
          `Please contact us at: ${supportEmail}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
  }, []);

  const handleSocialSignIn = useCallback(async (credential: SocialSignInCredential) => {
    setIsLoading(true);
    setCurrentError(null);
    
    try {
      const result = await onLinkAccount(credential);
      
      // Check if result indicates an error (API returns error object for 400 status)
      if (result && typeof result === 'object' && 'type' in result && result.type === 'error') {
        throw new Error(result.message || 'Failed to link account');
      }
      
      setShowSuccess(true);
      
      // Hide success state and close modal after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onMigrationSuccess();
      }, 3000);
    } catch (error) {
      console.error('Migration failed:', error);
      
      // Extract error message from different error types
      let errorMessage = 'Failed to link your account. Please try again or contact support.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        if ('response' in error && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      
      setCurrentError({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: errorMessage,
        canRetry: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [onLinkAccount, onMigrationSuccess]);

  const handleRemindLater = useCallback(() => {
    onRemindLater();
    onClose();
  }, [onRemindLater, onClose]);

  const handleLinkEmail = useCallback(async (email: string, code: string) => {
    if (!gatzClient) {
      throw new Error('No authenticated client available for email linking');
    }

    setIsLoading(true);
    setCurrentError(null);
    
    try {
      const result = await gatzClient.linkEmail(email, code);
      
      // Check if result indicates an error
      if (result && typeof result === 'object' && 'type' in result && result.type === 'error') {
        throw new Error(result.message || 'Failed to link email');
      }
      
      setShowSuccess(true);
      
      // Hide success state and close modal after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onMigrationSuccess();
      }, 3000);
    } catch (error) {
      console.error('Email linking failed:', error);
      
      // Extract error message from different error types
      let errorMessage = 'Failed to link your email. Please try again or contact support.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        if ('response' in error && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      
      setCurrentError({
        type: AuthErrorType.EMAIL_SIGNIN_FAILED,
        message: errorMessage,
        canRetry: true
      });
      
      throw error; // Re-throw to let EmailSignInComponent handle it
    } finally {
      setIsLoading(false);
    }
  }, [gatzClient, onMigrationSuccess]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.blurContainer, overlayStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView
            tint={colors.theme === "dark" ? "light" : "dark"}
            intensity={Platform.select({ android: 20, default: 5 })}
            style={StyleSheet.absoluteFill}
          />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[styles.container, containerStyle, { backgroundColor: colors.appBackground }]}>
        <View style={styles.content}>
          {showSuccess ? (
            /* Success View */
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              </View>
              <Text style={[styles.successTitle, { color: colors.primaryText }]}>
                Account Linked Successfully!
              </Text>
              <Text style={[styles.successDescription, { color: colors.secondaryText }]}>
                You can now sign in with your linked account.
              </Text>
            </View>
          ) : (
            /* Normal Content */
            <>
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { color: colors.primaryText }]}>
                    Link to Google ID, Apple ID, or your email
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={[styles.description, { color: colors.secondaryText }]}>
                  Gatz can no longer use SMS and we will deprecate that soon.
                </Text>
              </View>

              {/* Auth Buttons */}
              <View style={styles.authSection}>
                <SocialSignInButtons
                  onSignIn={handleSocialSignIn}
                  isLoading={isLoading}
                />
                
                {/* Email Fallback Option */}
                <View style={styles.fallbackSection}>
                  <Text style={[styles.fallbackTitle, { color: colors.secondaryText }]}>
                    Or link your email address
                  </Text>
                  <EmailSignInComponent
                    onEmailVerified={async () => {}} // Not used for linking
                    onLinkEmail={handleLinkEmail}
                    isLoading={isLoading}
                  />
                </View>
              </View>

              {/* Error Display */}
              {currentError && (
                <AuthErrorDisplay
                  error={currentError}
                  onRetry={() => {
                    setCurrentError(null);
                  }}
                  onDismiss={() => setCurrentError(null)}
                />
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={handleContactSupport}
                  disabled={isLoading}
                >
                  <Text style={[styles.supportText, { color: colors.buttonActive }]}>
                    Contact Support
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.remindLaterButton}
                  onPress={handleRemindLater}
                  disabled={isLoading}
                >
                  <Text style={[styles.remindLaterText, { color: colors.secondaryText }]}>
                    Remind Me Later
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Account for iOS home indicator
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    paddingRight: 0,
    marginLeft: 'auto',
  },
  descriptionContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
  },
  authSection: {
    marginBottom: 24,
  },
  fallbackSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  fallbackTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    alignItems: 'center',
    gap: 16,
  },
  supportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  remindLaterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  remindLaterText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});