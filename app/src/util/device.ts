import { Platform, Dimensions } from "react-native";

import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Locales from "expo-localization";

export const collectDeviceInfo = async () => {
  const deviceType = Device.getDeviceTypeAsync();
  const installationTime = Application.getInstallationTimeAsync();

  const deviceId = Platform.select({
    ios: () => Application.getIosIdForVendorAsync(),
    android: () => Promise.resolve(Application.getAndroidId()),
    default: () => Promise.resolve(null),
  })();

  const deviceInfo = {
    // Device Make and Model
    brand: Device.brand,
    modelName: Device.modelName,

    // OS Information
    os: Platform.OS,
    osVersion: Platform.Version,

    // App Information
    appVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,

    // Screen Information
    screenWidth: Dimensions.get("window").width,
    screenHeight: Dimensions.get("window").height,

    // Device ID (Note: This is not guaranteed to be unique or persistent)
    deviceId: await deviceId,

    // Other Information
    installationTime: await installationTime,
    deviceType: await deviceType,

    // Locale Information
    locale: Locales.getLocales(),
    timezone: Locales.getCalendars(),
  };

  return deviceInfo;
};
