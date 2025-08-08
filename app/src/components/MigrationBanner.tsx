import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import { SocialSignInCredential } from '../gatz/auth';
import { AuthError, AuthErrorType } from '../gatz/auth-errors';
import { Color as GatzColor, Styles as GatzStyles } from '../gatz/styles';

interface MigrationBannerProps {
  visible: boolean;
  onDismiss: () => void;
  onMigrateNow: () => void;
  onLinkAccount: (credential: SocialSignInCredential) => Promise<void>;
}

export const MigrationBanner: React.FC<MigrationBannerProps> = ({
  visible,
  onDismiss,
  onMigrateNow,
}) => {
  const colors = useThemeColors();
  const [slideAnim] = useState(new Animated.Value(visible ? 0 : -100));
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [slideAnim, onDismiss]);

  const handleMigrateNow = useCallback(() => {
    setIsLoading(true);
    onMigrateNow();
    // Reset loading state when migration screen closes
    setTimeout(() => setIsLoading(false), 1000);
  }, [onMigrateNow]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: colors.modalBackground,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name="security" 
            size={24} 
            color={GatzColor.introTitle} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primaryText }]}>
            Upgrade Your Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Add Apple/Google Sign-In for faster access
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.migrateButton, { backgroundColor: colors.buttonActive }]}
            onPress={handleMigrateNow}
            disabled={isLoading}
          >
            {isLoading ? (
              <MaterialIcons name="hourglass-empty" size={16} color="white" />
            ) : (
              <Text style={styles.migrateButtonText}>
                Add Account
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            disabled={isLoading}
          >
            <MaterialIcons 
              name="close" 
              size={20} 
              color={colors.secondaryText} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom border line */}
      <View style={[styles.borderLine, { backgroundColor: colors.border }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: Platform.select({
      ios: 44, // Status bar height on iOS
      android: 25,
      web: 0,
    }),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: GatzStyles.title.fontFamily,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: GatzStyles.tagline.fontFamily,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  migrateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  migrateButtonText: {
    fontSize: 12,
    fontFamily: GatzStyles.tagline.fontFamily,
    fontWeight: '600',
    color: 'white',
  },
  dismissButton: {
    padding: 8,
    borderRadius: 16,
  },
  borderLine: {
    height: 0.5,
    width: '100%',
  },
});