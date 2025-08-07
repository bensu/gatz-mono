import { useCallback, useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Text,
  TextStyle,
  StyleProp,
  Dimensions,
} from "react-native";

import { Stack, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";
import { DrawerButton } from "./DrawerButton";
import { isMobile } from "../util";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { shouldShowDrawerButton } from "../util/layout";

// Reusable component for header title with icon
export const HeaderTitleWithIcon = ({
  title,
  iconName,
  iconSize = 22
}: {
  title: string,
  iconName: keyof typeof Ionicons.glyphMap,
  iconSize?: number
}) => {
  const colors = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons
        name={iconName}
        size={iconSize}
        color={colors.primary}
        style={{ marginRight: 6 }}
      />
      <Text style={{
        fontSize: 18,
        fontWeight: "500",
        color: colors.primaryText
      }}>
        {title}
      </Text>
    </View>
  );
};

export const HEADER_BUTTON_SIZE = GatzStyles.header.height;

// get andriod status bar height
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight : null;

export const headerStyles = StyleSheet.create({
  pressableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 8,
  },
  headerBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  header: {
    minHeight: GatzStyles.header.minHeight,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "500",
    justifyContent: "center",
  },
  bigHeaderText: { fontSize: 24 },
  gatzFont: {
    fontFamily: GatzStyles.header.fontFamily,
    fontSize: GatzStyles.header.fontSize,
  },
  middleTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonCircle: {
    backgroundColor: GatzColor.active,
    borderRadius: GatzStyles.header.height,
    height: GatzStyles.header.height,
  },

  headerContainer: Platform.select({
    default: {},
    android: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      paddingBottom: 8,
      paddingHorizontal: 0, // Remove default padding
    },
  }),
  headerLeft: Platform.select({
    default: {},
    android: {
      marginLeft: 0, // Remove default margin
      paddingLeft: 4, // Add small padding for touch target
    },
  }),
  headerCenter: { flex: 1, alignItems: "center" },
  headerRight: Platform.select({ android: { marginRight: 4 }, default: {} }),
});

export const NavLink = ({
  disabled = false,
  onPress,
  title,
  textStyle,
}: {
  disabled?: boolean;
  title: string;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
}) => {
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[navLinkStyles.outer, disabled ? navLinkStyles.disabled : null]}
      onPress={onPress}
    >
      <Text style={[navLinkStyles.textStyle, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const navLinkStyles = StyleSheet.create({
  outer: {},
  disabled: { opacity: 0.5 },
  textStyle: { fontSize: 18 },
});

// Universal Header

export const UniversalHeader = ({
  children,
  onBack,
  onNew,
  onSearch,
  headerLeft,
  headerRight,
  title,
  withBorder = false,
  inDrawer = false,
}: {
  children?: React.ReactNode;
  onBack?: () => void;
  onNew?: () => void;
  onSearch?: () => void;
  headerLeft?: () => React.ReactNode;
  headerRight?: () => React.ReactNode;
  title?: string;
  inDrawer?: boolean;
  withBorder?: boolean;
}) => {
  const router = useRouter();
  const colors = useThemeColors();
  const [showDrawerBtn, setShowDrawerBtn] = useState(shouldShowDrawerButton());

  // Listen for dimension changes
  useEffect(() => {
    const handleResize = () => {
      const shouldShow = shouldShowDrawerButton();
      if (shouldShow !== showDrawerBtn) {
        setShowDrawerBtn(shouldShow);
      }
    };

    // Set up event listener
    const subscription = Dimensions.addEventListener('change', handleResize);

    // Clean up event listener
    return () => subscription.remove();
  }, [showDrawerBtn]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  // the default button is different depending on whether this in the drawer or not
  const defaultLeftButton = useCallback(
    () =>
      inDrawer ? (
        <DrawerButton />
      ) : (
        <TouchableOpacity onPress={onBack || goBack}>
          <MaterialIcons name="chevron-left" color={colors.active} size={32} />
        </TouchableOpacity>
      ),
    [router, inDrawer, onBack, goBack, colors.active],
  );

  if (!headerLeft) {
    // Use state-based value that updates with window size
    // Always show drawer button for mobile in drawer context
    if (isMobile() && inDrawer) {
      headerLeft = () => <DrawerButton />;
    } else if (inDrawer && showDrawerBtn) {
      headerLeft = defaultLeftButton;
    } else if (!inDrawer && isMobile()) {
      headerLeft = defaultLeftButton;
    } else {
      headerLeft = () => <View />;
    }
  }

  if (!headerRight) {
    headerRight = () => (
      <View style={{ flexDirection: "row" }}>
        {onSearch && (
          <TouchableOpacity key="search" style={[{ marginRight: 12 }]} onPress={onSearch} >
            <Ionicons name="search" size={HEADER_BUTTON_SIZE} color={colors.greyText} />
          </TouchableOpacity>
        )}
        {onNew && (
          <TouchableOpacity
            key="add"
            style={[headerStyles.buttonCircle, isMobile() && { marginRight: 4 }]}
            onPress={onNew}
          >
            <MaterialIcons name="add" size={HEADER_BUTTON_SIZE} color={colors.newPostIcon} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!children && title) {
    children = (
      <Text style={[headerStyles.headerText, { color: colors.primaryText }]}>
        {title}
      </Text>
    );
  }

  const Header = ({ navigation, route, options }) => (
    <SafeAreaView style={{ backgroundColor: colors.appBackground }}>
      {STATUS_BAR_HEIGHT > 0 && <View style={{ height: STATUS_BAR_HEIGHT }} />}
      <View style={headerStyles.headerContainer}>
        <View style={headerStyles.headerLeft}>
          {headerLeft && headerLeft()}
        </View>
        <View style={headerStyles.headerCenter}>{children}</View>
        <View style={headerStyles.headerRight}>
          {headerRight && headerRight()}
        </View>
      </View>
    </SafeAreaView>
  );

  if (isMobile()) {
    if (Platform.OS === "android") {
      return (
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: colors.appBackground },
            headerTitleAlign: "center",
            headerShadowVisible: false,
            header: Header,
          }}
        />
      );
    } else {
      return (
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: colors.appBackground },
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerTitle: () => children,
            headerLeft,
            headerRight,
          }}
        />
      );
    }
  } else {
    return (
      <SafeAreaView
        style={[
          {
            backgroundColor: colors.appBackground,
            borderBottomColor: colors.rowBackground,
          },
          withBorder && headerStyles.headerBorder,
        ]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        {STATUS_BAR_HEIGHT && <View style={{ height: STATUS_BAR_HEIGHT }} />}
        <View style={[headerStyles.header]}>
          {headerLeft && headerLeft()}
          {children}
          {headerRight && headerRight()}
        </View>
      </SafeAreaView>
    );
  }
};
