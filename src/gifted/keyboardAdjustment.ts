import { NativeModules, Dimensions, Platform } from "react-native";

const { StatusBarManager } = NativeModules;

export interface KeyboardAdjustment {
  homeIndicatorHeight: number;
  statusBarHeight: number;
}

const MIN_VERSION_WITH_HOME_INDICATOR = 11;
const HOME_INDICATOR = 34;

export const getDeviceSpecificAdjustments = (): Promise<KeyboardAdjustment> => {
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      StatusBarManager.getHeight((statusBarFrameData: { height: number }) => {
        const { height: statusBarHeight } = statusBarFrameData;
        const { height: screenHeight } = Dimensions.get("window");

        // Estimate if the device has a home indicator
        let majorVersionNumber: number;
        if (typeof Platform.Version === "number") {
          majorVersionNumber = Platform.Version;
        } else {
          majorVersionNumber = parseInt(Platform.Version, 10);
        }
        const hasHomeIndicator =
          screenHeight > 800 &&
          majorVersionNumber >= MIN_VERSION_WITH_HOME_INDICATOR;
        const homeIndicatorHeight = hasHomeIndicator ? HOME_INDICATOR : 0;

        resolve({ homeIndicatorHeight, statusBarHeight });
      });
    } else {
      // For Android, we don't need these adjustments
      resolve({ homeIndicatorHeight: 0, statusBarHeight: 0 });
    }
  });
};

export var cachedDeviceHeights: KeyboardAdjustment = undefined;

if (!cachedDeviceHeights) {
  getDeviceSpecificAdjustments().then((k) => {
    cachedDeviceHeights = k;
  });
}
