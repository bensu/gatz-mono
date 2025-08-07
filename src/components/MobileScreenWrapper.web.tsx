import React from "react";
import { ScrollView, View, StyleSheet, Dimensions } from "react-native";
import { Styles as GatzStyles, Color as GatzColor } from "../gatz/styles";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const { width, height } = Dimensions.get("window");
export const CONTENT_WIDTH = Math.min(width, 600);

export const MobileScreenWrapper = ({
  children,
}: {
  backgroundColor?: string;
  children: React.ReactNode;
}) => {
  const colors = useThemeColors();
  return (
    <ScrollView>
      <View style={[styles.container, { backgroundColor: colors.midGrey }]}>
        <View style={styles.contentWrapper}>{children}</View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrapper: {
    width: CONTENT_WIDTH,
    minHeight: GatzStyles.screen.height,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export const getContentWidth = () => CONTENT_WIDTH;
