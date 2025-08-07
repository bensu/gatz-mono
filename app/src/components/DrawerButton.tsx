import { Platform, StyleSheet } from "react-native";
import * as React from "react";

import { MaterialIcons } from "@expo/vector-icons";

import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { PlatformPressable } from "@react-navigation/elements";
import {
  DrawerActions,
  ParamListBase,
  useNavigation,
} from "@react-navigation/native";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

type Props = {
  accessibilityLabel?: string;
  pressColor?: string;
  pressOpacity?: number;
  tintColor?: string;
};

export function DrawerButton({ tintColor, ...rest }: Props) {
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
  const colors = useThemeColors();

  return (
    <PlatformPressable
      {...rest}
      accessible
      accessibilityRole="button"
      android_ripple={{ borderless: true }}
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.touchable}
      hitSlop={Platform.select({
        ios: undefined,
        default: { top: 16, right: 16, bottom: 16, left: 16 },
      })}
    >
      <MaterialIcons name="menu" size={30} color={colors.drawerIcon} />
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    height: 24,
    width: 24,
    margin: 3,
    resizeMode: "contain",
  },
  touchable: { padding: 10 },
});
