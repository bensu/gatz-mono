import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import { NetworkButton, NetworkState } from './NetworkButton';
import { AuthError, AuthErrorType, createAuthError } from '../gatz/auth-errors';
import { AuthErrorDisplay } from './AuthErrorDisplay';
import { AuthService } from '../gatz/auth-service';

interface EmailSignInComponentProps {
  onEmailVerified: (email: string) => Promise<void>;
  onLinkEmail: (email: string, code: string) => Promise<void>;
  isLoading?: boolean;
  useModalStyling?: boolean;
}

type Step = 'enter_email' | 'verify_code';

const isEmailValid = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isCodeValid = (code: string): boolean => {
  return code.length === 6 && /^\d+$/.test(code);
};

export const EmailSignInComponent: React.FC<EmailSignInComponentProps> = ({
  onEmailVerified,
  onLinkEmail,
  isLoading = false,
  useModalStyling = false,
}) => {
  const colors = useThemeColors();
  const [step, setStep] = useState<Step>('enter_email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [currentError, setCurrentError] = useState<AuthError | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);
  const [authService] = useState(() => new AuthService());

  const handleSendCode = async () => {
    if (!isEmailValid(email)) {
      setCurrentError(createAuthError(AuthErrorType.EMAIL_INVALID));
      return;
    }

    setIsCodeLoading(true);
    setCurrentError(null);

    try {
      const result = await authService.sendEmailCode(email);
      
      if (result.success) {
        setStep('verify_code');
      } else {
        setCurrentError(result.error || createAuthError(AuthErrorType.EMAIL_SENDING_FAILED));
      }
    } catch (error) {
      console.error('Failed to send email code:', error);
      setCurrentError(createAuthError(AuthErrorType.EMAIL_SENDING_FAILED));
    } finally {
      setIsCodeLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isCodeValid(code)) {
      setCurrentError(createAuthError(AuthErrorType.INVALID_CODE));
      return;
    }

    setIsVerificationLoading(true);
    setCurrentError(null);

    try {
      await onLinkEmail(email, code);
    } catch (error) {
      console.error('Failed to link email:', error);
      setCurrentError(createAuthError(AuthErrorType.EMAIL_SIGNIN_FAILED));
    } finally {
      setIsVerificationLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('enter_email');
    setCode('');
    setCurrentError(null);
  };

  const getSendCodeButtonState = (): NetworkState => {
    if (isCodeLoading) return 'loading';
    if (isLoading) return 'loading';
    return 'idle';
  };

  const getVerifyCodeButtonState = (): NetworkState => {
    if (isVerificationLoading) return 'loading';
    if (isLoading) return 'loading';
    return 'idle';
  };

  const isButtonDisabled = isLoading || isCodeLoading || isVerificationLoading;

  const renderButton = (title: string, onPress: () => void, isDisabled: boolean, state: NetworkState) => {
    if (useModalStyling) {
      return (
        <TouchableOpacity
          style={[
            styles.modalButton, 
            { 
              backgroundColor: colors.buttonActive,
              opacity: (isDisabled || state === 'loading') ? 0.6 : 1
            }
          ]}
          onPress={onPress}
          disabled={isDisabled || state === 'loading'}
        >
          <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
            {state === 'loading' ? 'Loading...' : title}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <NetworkButton
        title={title}
        onPress={onPress}
        state={state}
        isDisabled={isDisabled}
      />
    );
  };

  return (
    <View style={styles.container}>
      {step === 'enter_email' ? (
        <>
          <View style={styles.inputContainer}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={colors.secondaryText} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.textInput, { 
                color: colors.primaryText, 
                borderColor: colors.border 
              }]}
              placeholder="Enter your email address"
              placeholderTextColor={colors.secondaryText}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setCurrentError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isButtonDisabled}
            />
          </View>
          
          {renderButton(
            "Send Verification Code",
            handleSendCode,
            !email.trim() || isButtonDisabled,
            getSendCodeButtonState()
          )}
        </>
      ) : (
        <>
          <View style={styles.codeStep}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackToEmail}
              disabled={isButtonDisabled}
            >
              <Ionicons name="arrow-back" size={20} color={colors.buttonActive} />
              <Text style={[styles.backText, { color: colors.buttonActive }]}>
                {email}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.inputContainer}>
              <Ionicons 
                name="key-outline" 
                size={20} 
                color={colors.secondaryText} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { 
                  color: colors.primaryText, 
                  borderColor: colors.border 
                }]}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.secondaryText}
                value={code}
                onChangeText={(text) => {
                  // Only allow digits and limit to 6 characters
                  const cleanText = text.replace(/\D/g, '').slice(0, 6);
                  setCode(cleanText);
                  setCurrentError(null);
                  
                  // Auto-verify when 6 digits are entered
                  if (cleanText.length === 6) {
                    // Small delay to show the complete code before verification
                    setTimeout(() => {
                      if (cleanText === code) return; // Prevent double verification
                      handleVerifyCode();
                    }, 100);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isButtonDisabled}
                autoFocus
              />
            </View>
            
            {renderButton(
              "Link Email",
              handleVerifyCode,
              !isCodeValid(code) || isButtonDisabled,
              getVerifyCodeButtonState()
            )}
          </View>
        </>
      )}

      {/* Error Display */}
      {currentError && (
        <View style={styles.errorContainer}>
          <AuthErrorDisplay
            error={currentError}
            showRetryButton={false}
            onDismiss={() => setCurrentError(null)}
            style={useModalStyling ? styles.modalErrorStyle : undefined}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  codeStep: {
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalErrorStyle: {
    backgroundColor: 'transparent',
    padding: 0,
    marginTop: 8,
  },
});