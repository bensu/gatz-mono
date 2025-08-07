import { StyleSheet, View, Text, ViewStyle, TextStyle } from "react-native";
import { FeedSeparator } from "../gatz/feed";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const Separator = ({ separator }: { separator: FeedSeparator }) => {
  const colors = useThemeColors();
  return (
    <InnerSeparator
      withSeparator={separator.hasLine}
      text={separator.text}
      // here i left the style as is becase it uses different color in diferent cases that are defined in NEW, DATE, and OTHERS
      lineStyle={{ backgroundColor: separator.color }}
      textStyle={{
        color: separator.color,
        backgroundColor: colors.rowBackground,
      }}
    />
  );
};

const InnerSeparator = ({
  text,
  outerStyle,
  textStyle,
  lineStyle,
  withSeparator = true,
}: {
  outerStyle?: ViewStyle;
  textStyle?: TextStyle;
  lineStyle?: ViewStyle;
  text?: string;
  withSeparator?: boolean;
}) => {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.middleContainer,
        { minHeight: 12, position: "relative", backgroundColor: colors.rowBackground },
        outerStyle,
      ]}
    >
      {text && (
        <Text
          style={[
            styles.middleMessages,
            { zIndex: 2, paddingHorizontal: 8, color: colors.primaryText },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>
      )}
      {withSeparator && (
        <View
          style={[
            styles.separatorLine,
            { position: "absolute", top: 8, zIndex: 1, backgroundColor: colors.secondaryText },
            lineStyle,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  separatorLine: {
    width: "95%",
    height: 1,
  },
  middleMessages: {
    justifyContent: "center",
    fontSize: 16,
  },
  middleContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
});