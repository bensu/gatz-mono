import {
  TouchableOpacity,
  Platform,
  View,
  Text,
  StyleSheet,
} from "react-native";

import * as T from "../gatz/types";
import { isMobile } from "../util";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const TabButton = ({
  name,
  onPress,
  selected,
}: {
  name: string;
  onPress: (any) => void;
  selected: boolean;
}) => {
  const colors = useThemeColors();
  const isSelected = selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabButton,
        isMobile() ? styles.mobilePadding : styles.desktopPadding,
      ]}
    >
      <Text style={[
        styles.tabText,
        {
          color: isSelected ? colors.active : colors.strongGrey,
          fontWeight: isSelected ? "600" : "500"
        }
      ]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopPadding: { paddingBottom: 12, paddingTop: 12 },
  mobilePadding: {
    paddingTop: 16,
    paddingBottom: Platform.select({ ios: 32, default: 16 }),
  },
  tabText: { fontSize: 16 },
  topSeparator: { borderTopWidth: StyleSheet.hairlineWidth, },
  bottomSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, },
  row: { flexDirection: "row", alignContent: "center" },
  container: {},
});

type TabRoute = { key: T.FeedType; title: string };

const FEED_ROUTES: TabRoute[] = [
  { key: "all_posts", title: "All posts" },
  { key: "active_discussions", title: "Active chats" },
];

export function NavTabBar({
  activeRoute,
  navTo,
}: {
  activeRoute: "all_posts" | "active_discussions";
  navTo: (key: "all_posts" | "active_discussions") => void;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        isMobile() ? styles.topSeparator : styles.bottomSeparator,
        styles.row,
        styles.container,
        {
          borderColor: colors.separator,
          backgroundColor: isMobile() ? colors.blurBackground : colors.appBackground,
        }
      ]}
    >
      <TabButton
        name="All posts"
        onPress={() => navTo("all_posts")}
        selected={activeRoute === "all_posts"}
      />
      <View style={{ backgroundColor: colors.midGrey }} />
      <TabButton
        name="Active chats"
        onPress={() => navTo("active_discussions")}
        selected={activeRoute === "active_discussions"}
      />
    </View>
  );
}