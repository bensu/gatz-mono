import * as React from "react";
import PropTypes from "prop-types";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCallbackOne } from "use-memo-one";

import { Color as GatzColor } from "../gatz/styles";

import { MaterialIcons } from "@expo/vector-icons";

import Color from "./Color";
import { TEST_ID } from "./Constant";
import { useThemeColors } from "./hooks/useThemeColors";

export const CENTER_ON_INPUT_MARGIN_BOTTOM = 4;

const styles = StyleSheet.create({
  container: {
    // height: 44,
    // marginHorizontal: 4,
    marginBottom: CENTER_ON_INPUT_MARGIN_BOTTOM,
    justifyContent: "center",
  },
  circle: {
    height: 30,
    width: 30,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
});

export interface SendProps {
  children?: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
}

export const Send = ({ children, disabled = false, onPress }: SendProps) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      testID={TEST_ID.SEND_TOUCHABLE}
      accessible
      accessibilityLabel="send"
      style={[styles.container, disabled ? styles.disabled : {}]}
      onPress={onPress}
      accessibilityRole="button"
      disabled={disabled}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: disabled ? colors.buttonDisabled : colors.active },
        ]}
      >
        <MaterialIcons
          size={24}
          color={colors.newPostIcon}
          name="arrow-upward"
        />
      </View>
    </TouchableOpacity>
  );
};

Send.propTypes = {
  text: PropTypes.string,
  onSend: PropTypes.func,
  children: PropTypes.element,
  disabled: PropTypes.bool,
};
