import { View, TouchableOpacity, StyleSheet, Text } from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";

export type NetworkState = "idle" | "loading" | "success" | "error";

const stateToIcon = {
  idle: null,
  loading: "hourglass-bottom",
  success: "check",
  error: "error",
};

export const NetworkButton = ({
  title,
  onPress,
  state,
  isDisabled = false,
}: {
  title: string;
  onPress: () => void;
  state: NetworkState;
  isDisabled?: boolean;
}) => {
  const icon = stateToIcon[state];
  return (
    <TouchableOpacity
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
    >
      <View style={styles.container}>
        <Text style={styles.buttonText}>{title}</Text>
        {icon && (
          <MaterialIcons
            style={{ marginLeft: 8 }}
            name={icon}
            size={32}
            color={GatzColor.introBackground}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: GatzColor.introTitle,
    borderWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    minHeight: 50,
    borderRadius: 8,
    padding: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 22,
    lineHeight: 22,
    color: GatzColor.introBackground,
    fontWeight: "500",
  },
});
