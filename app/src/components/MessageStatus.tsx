import React, { useEffect } from 'react';
import { 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

export type MessageStatusType = {
  retryCount: number;
  failureReason: "network" | "server";
  isRetrying: boolean;
  lastRetryTime?: number;
};

export const areMessageStatusesEqual = (a: MessageStatusType | undefined, b: MessageStatusType | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.retryCount === b.retryCount &&
    a.failureReason === b.failureReason &&
    a.isRetrying === b.isRetrying &&
    a.lastRetryTime === b.lastRetryTime;
};

interface MessageStatusProps {
  status: MessageStatusType;
  onRetryPress: () => void;
  isSuccess: boolean;
}

const STATUS_COLOR = '#FF8400';

export const MessageStatus: React.FC<MessageStatusProps> = ({ 
  status, 
  onRetryPress,
  isSuccess 
}) => {
  // Animation for fade out after success
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (isSuccess) {
      // Keep visible for 3 seconds then fade out
      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 2700); // Start fading 300ms before the 3s mark
      
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, opacity]);

  // Don't show anything if no status
  if (!status && !isSuccess) {
    return null;
  }

  // Success state
  if (isSuccess) {
    return (
      <Animated.View 
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(300)}
        style={[styles.container, animatedStyle]}
      >
        <Text style={styles.statusText}>Success!</Text>
      </Animated.View>
    );
  }

  // Error states
  const failureText = status.failureReason === 'network' 
    ? 'No connection' 
    : 'Failed to send';

  const isRetryable = !status.isRetrying;
  
  const statusMessage = status.isRetrying 
    ? `${failureText} • Retrying...`
    : `${failureText} • Tap to retry`;

  if (isRetryable) {
    return (
      <TouchableOpacity onPress={onRetryPress}>
        <Animated.View 
          entering={FadeIn.duration(200)}
          style={styles.container}
        >
          <Text style={styles.statusText}>{statusMessage}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      style={styles.container}
    >
      <Text style={styles.statusText}>{statusMessage}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  statusText: {
    color: STATUS_COLOR,
    fontSize: 12,
    fontWeight: Platform.select({ ios: '400', android: '300', web: '300' }),
    lineHeight: 16,
  },
});