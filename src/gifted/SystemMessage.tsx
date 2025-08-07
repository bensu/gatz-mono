import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const styles = StyleSheet.create({
  outerContainer: {
    justifyContent: "flex-start",
    flex: 1,
    marginBottom: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: "300",
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
});

export type SMessage = {
  icon?: string;
  text: string;
  system: boolean;
  created_at: string;
};

export interface SystemMessageProps {
  currentMessage?: SMessage;
}

export function SystemMessage({ currentMessage }: SystemMessageProps) {
  const colors = useThemeColors();

  if (currentMessage == null || currentMessage.system == false) {
    return null;
  }
  const { icon, text } = currentMessage;

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.appBackground }]}>
      <View style={[styles.row, { backgroundColor: colors.rowBackground }]}>
        {icon && (
          <MaterialIcons 
            name={icon as React.ComponentProps<typeof MaterialIcons>["name"]} 
            size={18} 
            color={colors.greyText} 
          />
        )}
        <Text style={[styles.text, { color: colors.secondaryText }]}>{text}</Text>
      </View>
    </View>
  );
}

SystemMessage.propTypes = {
  currentMessage: PropTypes.object,
};