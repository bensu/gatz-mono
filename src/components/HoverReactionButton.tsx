import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '../gifted/hooks/useThemeColors';

interface HoverReactionButtonProps {
  onPress: () => void;
  visible: boolean;
}

export const HoverReactionButton: React.FC<HoverReactionButtonProps> = ({ onPress, visible }) => {
  const colors = useThemeColors();
  
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { opacity: visible ? 1 : 0 }]} testID="hover-reaction-container">
      <TouchableOpacity onPress={onPress} style={styles.button}>
        <MaterialIcons
          name="add-reaction"
          size={16}
          color={colors.strongGrey}
          testID="add-reaction-icon"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
  },
  button: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
    width: 20,
  },
});