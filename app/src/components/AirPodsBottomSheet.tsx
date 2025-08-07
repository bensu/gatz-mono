import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AirPodsBottomSheetProps = {
  title: ReactNode;
  description: ReactNode;
  actionButtonText: string;
  onAction: () => void;
  onClose: () => void;
  visible: boolean;
};

const ANIMATION_DURATION = 100;

export const AirPodsBottomSheet: React.FC<AirPodsBottomSheetProps> = ({
  title,
  description,
  actionButtonText,
  onAction,
  onClose,
  visible,
}) => {
  const colors = useThemeColors();
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
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {title}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={styles.descriptionContainer}>
            {description}
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.active }]}
            onPress={onAction}
          >
            <Text style={[styles.actionButtonText, { color: colors.activeBackgroundText }]}>
              {actionButtonText}
            </Text>
          </TouchableOpacity>
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
  closeButton: {
    padding: 4,
    paddingRight: 0,
    marginLeft: 'auto',
  },
  descriptionContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  actionButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
}); 