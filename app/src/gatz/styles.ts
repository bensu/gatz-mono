import { Dimensions, Platform, StyleSheet, useColorScheme } from "react-native";
import { isMobile } from "../util";

const iMessageBubbleColor = "rgb(0, 120, 254)";

export const CONTAINER_BACKGROUND = "white";

const DARK_GREEN = {
  normal: "#3D5135",
  hover: "#374930",
  active: "#31412a",
};

const BEIGE = {
  normal: "#eae1d4",
  lowOpacity: "rgba(234, 225, 212, 0.7)",
};

export const GUTTER = 8;

export const Color = {
  bubbleBackground: "white",
  active: "#007AFF",
  introTitle: BEIGE.normal,
  introTitleLowOpacity: BEIGE.lowOpacity,
  introBackground: DARK_GREEN.normal,
  strongerGrey: "#777777",
  strongGrey: "#A2A2A2",
  separator: "#787C7E",
  highlightedBubble: iMessageBubbleColor,
  activityIndicator: "#0000ff",
};

const screenHeight = Dimensions.get("window").height;

export const Styles = StyleSheet.create({
  tinyAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    fontSize: 10,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    fontSize: 12,
  },
  mediumAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    fontSize: 15,
  },
  heroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    fontSize: 25,
  },
  jumboAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    fontSize: 32,
  },

  button: {
    marginTop: 4,
    fontSize: 18,
  },
  thinDropShadow: Platform.select({
    android: { elevation: 1 },
    ios: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0, // Horizontal offset
        height: 1, // Vertical offset
      },
      shadowOpacity: 0.1, // Opacity of the shadow
      shadowRadius: 1, // Blur radius of the shadow
    },
    web: {
      boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.1)", // maybe we can do better here with a consistent shadow
    },
  }),
  activeDropShadow: Platform.select({
    ios: { shadowColor: Color.active },
    android: { shadowColor: Color.active },
    web: { boxShadow: `0px 0px 4px rgba(0, 0, 255, 0.2)` },
  }),
  header: {
    minHeight: 65,
    height: 32,
    fontSize: 32,
    fontFamily: "bricolage-semibold",
  },
  screen: {
    height: screenHeight,
    width: Dimensions.get("window").width,
  },
  platformContainer: {
    borderColor: "#A2A2A2",
    borderWidth: 1,
    ...Platform.select({
      ios: {},
      android: {
        elevation: 1,
      },
    }),
  },
  logo: { fontFamily: "bricolage-medium" },
  tagline: { fontFamily: "raleway-bold" },
  title: { fontFamily: "raleway-bold" },
  platformSeparator: {
    ...Platform.select({
      ios: { height: StyleSheet.hairlineWidth, backgroundColor: "#A2A2A2" },
      android: { height: 1, backgroundColor: "#E0E0E0" },
      default: { backgroundColor: "#E0E0E0" },
    }),
  },
  card: {
    borderRadius: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  gutter: {
    paddingRight: isMobile() ? 0 : GUTTER,
    paddingLeft: isMobile() ? 0 : GUTTER,
  },
});

export const lightColors = {
  theme: "light",

  active: "#007AFF",
  activityIndicator: "#A2A2A2",
  // activeBackground: "rgba(0, 122, 255, 0.12)",
  blurBackground: "#f7f7f7",
  bubbleBackground: "#A2A2A2",
  bubbleText: "white",
  activeBackground: "#E6EFFE",
  contrastBackground: "black",
  contrastText: "white",
  introTitle: BEIGE.normal,
  introBackground: DARK_GREEN.normal,
  strongerGrey: "#777777",
  strongGrey: "#A2A2A2",
  midGrey: "#e6e6e6",
  softGrey: "rgb(178, 178, 178)",
  softFont: "#787C7E",
  separator: "#787C7E",
  highlightedBubble: iMessageBubbleColor,
  switchBackground: "#3e3e3e",
  errorFont: "red",
  settingsButtonBackground: "#FFFFFF",
  modalBackground: "white",
  newPostIcon: "white",
  overlayText: "white",
  overlayBackground: "rgba(0, 0, 0, 0.5)",
  thinBorder: "rgba(0,0,0,0.3)",
  inputToolbarBorder: "#A2A2A2",
  reactionsBg: "#b2b2b2",
  platformSeparatorDefault: "#E0E0E0",
  primaryText: "#000000",
  secondaryText: "#333333",
  buttonActive: "#007AFF",
  buttonDisabled: "#A2A2A2",
  appBackground: "#FFFFFF",
  defaultBackground: "#F2F2F2",
  rowBackground: "#F5F5F5",
  disabledText: "#A2A2A2",
  disabledIcon: "#A2A2A2",
  titleText: "#141619",
  subtitleText: "#333333",
  greyText: "#787C7E",
  danger: "#FF453A",
  drawerIcon: "black",
  contrastGrey: "#A2A2A2",
  activeBackgroundText: "white",
};

export const darkColors = {
  theme: "dark",
  active: "#0A84FF",
  activityIndicator: "white",
  // blurBackground: "#f7f7f7",
  blurBackground: "#2C2C2E",
  // activeBackground: "rgba(0, 122, 255, 0.12)",
  bubbleBackground: "#A2A2A2",
  bubbleText: "white",
  activeBackground: "#E6EFFE",
  contrastBackground: "white",
  contrastText: "black",
  introTitle: "#C7BFB2",
  introBackground: "#2A3A22",
  contrastGrey: "#A2A2A2",
  strongGrey: "#787878",
  midGrey: "#3A3A3C",
  softGrey: "rgb(100, 100, 100)",
  softFont: "#8E8E93",
  // separator: "#3A3A3C",
  separator: "#222222",
  highlightedBubble: iMessageBubbleColor,
  switchBackground: "#39393D",
  errorFont: "#FF453A",
  settingsButtonBackground: "#1C1C1E",
  modalBackground: "#1C1C1E",
  newPostIcon: "white",
  overlayText: "#E5F3ED",
  overlayBackground: "rgba(0, 0, 0, 0.8)",
  thinBorder: "rgba(255,255,255,0.3)",
  inputToolbarBorder: "#1C1C1E",
  reactionsBg: "#b2b2b2", // |#2C2C2E
  platformSeparatorDefault: "#3A3A3C",
  activeBackgroundText: "white",

  disabledText: "#A2A2A2",

  drawerIcon: "white",

  primaryText: "#FFFFFF",
  secondaryText: "#D1D1D6",
  buttonActive: "#0A84FF",
  buttonDisabled: "#636366",
  appBackground: "#1C1C1E",
  rowBackground: "#2C2C2E",
  defaultBackground: "#2C2C2E",
  disabledIcon: "#636366",
  titleText: "#E5E5E7",
  subtitleText: "#D1D1D6",
  greyText: "#AEAEB2",
  danger: "#FF453A",
};
