import React from "react";
import { StyleSheet, View, TextInput, TouchableOpacity } from "react-native";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { MaterialIcons } from "@expo/vector-icons";

export const SearchBar = ({
  placeholder,
  onChangeText,
  onClear,
  value,
}: {
  placeholder?: string;
  value?: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: colors.appBackground, color: colors.primaryText },
        ]}
        placeholder={placeholder || "Search"}
        placeholderTextColor={colors.secondaryText}
        onChangeText={onChangeText}
        value={value}
      />
      {onClear && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear}
        >
          <MaterialIcons name="close" size={20} color={colors.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    height: 44,
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
});
