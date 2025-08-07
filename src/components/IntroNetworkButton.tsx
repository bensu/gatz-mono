import { View, TouchableOpacity, StyleSheet, Text } from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";

export type IntroNetworkState = "idle" | "loading" | "success" | "error";

const stateToIcon = {
  idle: null,
  loading: "hourglass-bottom",
  success: "check",
  error: "error",
};

export const IntroNetworkButton = ({
  title,
  onPress,
  state,
  isDisabled = false,
}: {
  title: string;
  onPress: () => void;
  state: IntroNetworkState;
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
    flex: 1,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    flex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: GatzColor.introTitle,
    alignItems: "center",
    minHeight: 48,
    borderRadius: 8,
    padding: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 24,
    color: GatzColor.introBackground,
    fontWeight: "700",
    // fontFamily: GatzStyles.title.fontFamily,
  },
});
