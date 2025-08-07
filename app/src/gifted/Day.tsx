import * as React from "react";
import PropTypes from "prop-types";
import { StyleSheet, Text, View, TextProps } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import dayjs from "dayjs";

import Color from "./Color";
import { isSameDay, isSameDayJs } from "./utils";
import { DATE_FORMAT } from "./Constant";

import * as T from "../gatz/types";

import { useChatContext } from "./GiftedChatContext";
import { shouldShowLastSeen } from "../util";
import { useThemeColors } from "./hooks/useThemeColors";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  text: {
    backgroundColor: Color.backgroundTransparent,
    color: Color.defaultColor,
    fontSize: 12,
    fontWeight: "600",
  },
});

export interface DayProps {
  discussion?: T.Discussion;
  user?: T.Contact;
  currentMessage?: T.Message;
  previousMessage?: T.Message;
  textProps?: TextProps;
  dateFormat?: string;
  inverted?: boolean;
  isLastSeen?: boolean;
}

export const renderDateText = (
  date: Date | string,
  locale = "en",
  dateFormat = DATE_FORMAT,
): string => {
  if (isSameDayJs(dayjs(date), dayjs(new Date()))) {
    return "Today";
  } else {
    return dayjs(date).locale(locale).format(dateFormat);
  }
};

export function Day({
  dateFormat,
  currentMessage,
  previousMessage,
  discussion,
  user,
}: DayProps) {
  const { getLocale } = useChatContext();
  const colors = useThemeColors();

  if (currentMessage) {
    // Note:
    // if you change this, be careful that the memoization rules
    // for discussion at Message.tsx match what causes a re-render here
    // As of 2024/05/16, isLastSeen is the only state that depends on
    // the discussion
    const isLastSeen = shouldShowLastSeen(
      previousMessage && previousMessage.id,
      discussion,
      user.id,
    );

    if (isSameDay(currentMessage, previousMessage)) {
      return isLastSeen ? <LastSeen /> : null;
    } else {
      return (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[styles.container, { backgroundColor: colors.rowBackground }]}
        >
          <View
            style={[
              isLastSeen && lastSeenStyles.line,
              { backgroundColor: colors.rowBackground },
            ]}
          >
            <Text style={[styles.text, { color: colors.softGrey }]}>
              {renderDateText(
                currentMessage.created_at,
                getLocale(),
                dateFormat,
              )}
            </Text>
          </View>
        </Animated.View>
      );
    }
  } else {
    return null;
  }
}

Day.propTypes = {
  currentMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  inverted: PropTypes.bool,
  dateFormat: PropTypes.string,
};

export const LastSeen = () => {
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[
        styles.container,
        lastSeenStyles.container,
        { backgroundColor: colors.rowBackground },
      ]}
    >
      <View style={[lastSeenStyles.line, { backgroundColor: colors.active }]}>
        <Text
          style={[
            lastSeenStyles.innerText,
            {
              color: colors.active,
              backgroundColor: colors.rowBackground,
            },
          ]}
        >
          New
        </Text>
      </View>
    </Animated.View>
  );
};

const lastSeenStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  line: {
    width: "100%",
    height: 1,
    marginHorizontal: 4,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  innerText: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: "auto",
    zIndex: 2,
    paddingHorizontal: 8,
    position: "absolute",
  },
});
