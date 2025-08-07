import * as React from "react";
import PropTypes from "prop-types";
import { StyleSheet, Text, View, ViewStyle, TextStyle } from "react-native";
import dayjs from "dayjs";

import { TIME_FORMAT } from "./Constant";
import { StylePropType } from "./utils";
import { useChatContext } from "./GiftedChatContext";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const styles = StyleSheet.create({
  container: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 5,
  },
  text: {
    fontSize: 10,
    backgroundColor: "transparent",
    textAlign: "right",
  },
});

const Time = ({
  position = "left",
  containerStyle,
  currentMessage,
  timeFormat = TIME_FORMAT,
  timeTextStyle,
}) => {
  const { getLocale } = useChatContext();
  const colors = useThemeColors();

  if (currentMessage == null) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.appBackground },
        containerStyle && containerStyle[position],
      ]}
    >
      <Text
        style={[
          styles.text,
          position === "left" ? { color: colors.secondaryText } : { color: colors.primaryText },
          timeTextStyle && timeTextStyle[position],
        ]}
      >
        {dayjs(currentMessage.created_at).locale(getLocale()).format(timeFormat)}
      </Text>
    </View>
  );
};

Time.propTypes = {
  position: PropTypes.oneOf(["left", "right"]),
  currentMessage: PropTypes.object,
  containerStyle: PropTypes.shape({
    left: StylePropType,
    right: StylePropType,
  }),
  timeFormat: PropTypes.string,
  timeTextStyle: PropTypes.shape({
    left: StylePropType,
    right: StylePropType,
  }),
};

export default Time;