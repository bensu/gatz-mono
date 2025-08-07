import React, { useState, useEffect, useCallback } from "react";
import { Text, Alert, Linking, Platform, View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity, ActivityIndicator, AppState } from "react-native";

import Constants from "expo-constants";
import { BlurView } from "expo-blur";

import * as T from "../gatz/types";
import { OpenClient } from "../gatz/client";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const APP_STORE_LINKS = {
  ios: "https://testflight.apple.com/join/K5OnqYuP",
  android: "https://play.google.com/apps/internaltest/4701234533605084026",
};

const CURRENT_VERSION = Constants.expoConfig.version;

const getInstallLink = (manifest: T.AppManifest) => {
  const { install_links } = manifest.app;
  return install_links ? install_links[Platform.OS] : APP_STORE_LINKS[Platform.OS];
};

const checkForUpdates = async ({ openModal }: { openModal: (app: T.AppManifest) => void }) => {
  const openClient = new OpenClient();
  try {
    const manifest = await openClient.getManifest();
    const { upgrade_message, min_version, blocked_version } = manifest.app;
    const app_link = getInstallLink(manifest);

    if (blocked_version && CURRENT_VERSION <= blocked_version) {
      openModal(manifest);
      return;
    }

    const isUpdateNeeded = CURRENT_VERSION < min_version;
    if (isUpdateNeeded) {
      const message = upgrade_message ||
        (min_version
          ? `Please update to version ${min_version} or higher to continue using the app.`
          : "There is a new version of the app available. Please update to continue using the app.");
      Alert.alert(
        "Update Available",
        message,
        [
          { text: "Update Now", onPress: () => Linking.openURL(app_link), },
          {
            text: "Later",
            onPress: () => console.log("Update delayed"),
            style: "cancel",
          },
        ],
        { cancelable: false }
      );
    }
  } catch (error) {
    console.error("Failed to check app version", error);
  }
};

export type AppVersions = {
  min_version: string;
  current_version: string;
};

export const AppVersionContext = React.createContext<AppVersions>(null);

export const VersionProvider = ({ children }) => {
  const colors = useThemeColors();
  const [modalChildren, setModalChildren] = useState<React.ReactNode>(null);
  const modalOpen = !!modalChildren;
  const overlayStyle: StyleProp<ViewStyle> = modalOpen
    ? { display: "flex", pointerEvents: "auto", }
    : { display: "none" };

  const openModal = useCallback((manifest: T.AppManifest) => {
    setModalChildren(<VersionDeprecatedModal manifest={manifest} />);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkForUpdates({ openModal });
    }
  }, []);

  return (
    <AppVersionContext.Provider value={null}>
      <View style={styles.flex1}>
        <View style={styles.flex1}>
          {children}
        </View>
        {modalChildren && (
          <BlurView
            tint={colors.theme}
            style={StyleSheet.absoluteFill}
            intensity={Platform.select({ android: 100, default: 20 })}
          />
        )}
        <View style={[StyleSheet.absoluteFill, styles.modalStyles, overlayStyle]}>
          <View style={[styles.contentContainer]}>
            {modalChildren}
          </View>
        </View>
      </View>
    </AppVersionContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  modalStyles: {
    position: 'absolute',
    zIndex: 1000,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: { flex: 1, position: "relative", },
  maintenanceContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    paddingBottom: Platform.select({ ios: 40, android: 20 }), // Extra padding for iOS home indicator
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  maintenanceText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  tryAgainButton: {
    marginTop: 16,
  },
  tryAgainText: {
    fontSize: 18,
    fontWeight: '500',
  },
  overlay: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
});


const VersionDeprecatedModal = ({ manifest }: { manifest: T.AppManifest }) => {
  const colors = useThemeColors();

  const app_link = getInstallLink(manifest);

  return (
    <View style={[
      styles.maintenanceContainer,
      { backgroundColor: colors.modalBackground }
    ]}>
      <View style={styles.handle} />
      <Text style={[styles.maintenanceText, { color: colors.primaryText }]}>
        Sorry, this version of the app is deprecated.
      </Text>
      <Text style={[styles.maintenanceText, { color: colors.primaryText }]}>
        You must update to continue using the app.
      </Text>
      <View style={{ height: 50, justifyContent: "center", alignItems: "center" }}>
        <TouchableOpacity
          style={[styles.tryAgainButton]}
          onPress={() => Linking.openURL(app_link)}
        >
          <Text style={[styles.tryAgainText, { color: colors.buttonActive }]}>
            Update Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

