import { Dimensions, Platform } from "react-native";

const MIN_VERSION_WITH_HOME_INDICATOR = 11;
const HOME_INDICATOR = 34;

const { height: screenHeight } = Dimensions.get("window");

const majorVersionNumber = typeof Platform.Version === "number" ? Platform.Version : parseInt(Platform.Version, 10);

// Estimate if the device has a home indicator
const hasHomeIndicator =
  screenHeight > 800 &&
  majorVersionNumber >= MIN_VERSION_WITH_HOME_INDICATOR;

export const homeIndicatorHeight = hasHomeIndicator ? HOME_INDICATOR : 0;
