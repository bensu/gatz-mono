import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Platform,
  View,
  Dimensions,
  Linking,
  StyleSheet,
  ActivityIndicator,
  AppState,
} from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";

import { SessionContext } from "../../../context/SessionProvider";

import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { ClientContext } from "../../../context/ClientProvider";
import { OpenClient } from "../../../gatz/client";
import { FrontendDBContext } from "../../../context/FrontendDBProvider";
import { ModalProvider } from "../../../context/ModalProvider";
import {
  DrawerLayoutMode,
  getDrawerLayoutMode,
  getWindowWidth
} from "../../../util/layout";

const { width } = Dimensions.get("window");
const DRAWER_LABEL_MARGIN = -24; // Consistent margin for drawer text labels

function CustomDrawerContent(props) {
  const handlePressWhyGatz = useCallback(() => {
    Linking.openURL("https://gatz.chat/why");
  }, []);

  const handlePressWebVersion = useCallback(() => {
    Linking.openURL("https://app.gatz.chat");
  }, []);

  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.appBackground }]}>
      <DrawerContentScrollView {...props}>
        <View>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>
      <View style={styles.bottomItems}>
        {Platform.OS !== "web" && (
          <DrawerItem
            labelStyle={[styles.drawerText, { color: colors.greyText }]}
            label="Web"
            onPress={handlePressWebVersion}
            icon={({ color }) => (
              <Ionicons name="globe-outline" size={22} color={color} />
            )}
            style={{ paddingLeft: 0, marginLeft: 0 }}
          />
        )}
        <DrawerItem
          labelStyle={[styles.drawerText, { color: colors.greyText }]}
          label="Why Gatz?"
          onPress={handlePressWhyGatz}
          icon={({ color }) => (
            <Ionicons name="help-circle-outline" size={22} color={color} />
          )}
          style={{ paddingLeft: 0, marginLeft: 0 }}
        />
      </View>
    </View>
  );
}

const checkForLinks = async (router, openClient: OpenClient) => {
  const path = await openClient.getInitialLink();
  if (path) {
    router.push(path);
    await openClient.removeLink(path);
  }
}

export default function Layout() {
  const colors = useThemeColors();
  const { isLoading, session } = useContext(SessionContext);
  const { openClient } = useContext(ClientContext);
  const router = useRouter();
  const { db } = useContext(FrontendDBContext);

  // Set initial layout mode based on current width
  const [layoutMode, setLayoutMode] = useState<DrawerLayoutMode>(getDrawerLayoutMode(getWindowWidth()));

  // Listen for window resize events and update layout mode only when it changes
  useEffect(() => {
    const handleResize = () => {
      const newWidth = getWindowWidth();
      const newLayoutMode = getDrawerLayoutMode(newWidth);

      // Only update state if layout mode changed
      if (newLayoutMode !== layoutMode) {
        setLayoutMode(newLayoutMode);
      }
    };

    // Set up event listener
    const subscription = Dimensions.addEventListener('change', handleResize);

    // Clean up event listener
    return () => subscription.remove();
  }, [layoutMode]);

  const [pendingContactRequestsCount, setPendingContactRequestsCount] = useState(0);
  useEffect(() => {
    const lId = db.listenToPendingContactRequestsCount(setPendingContactRequestsCount);
    return () => db.removePendingContactRequestsCountListener(lId);
  }, [db]);

  const hasPendingContactRequests = pendingContactRequestsCount > 0;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        checkForLinks(router, openClient);
      }
    });
    return () => subscription.remove();
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) {
    return <Redirect href="/welcome" />;
  }

  const isSlideDrawer = layoutMode === "SLIDE_DRAWER";

  return (
    <ModalProvider>
      <Stack.Screen options={{ title: "Home", headerShown: false }} />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          sceneContainerStyle: { backgroundColor: colors.rowBackground },
          // Only hide the drawer header on desktop to allow FeedScreen header to show in mobile
          headerShown: isSlideDrawer,
          drawerStyle: {
            ...styles.drawer,
            width: isSlideDrawer ? width * 0.45 : null,
            maxWidth: isSlideDrawer ? width * 0.45 : 200,
            backgroundColor: colors.appBackground,
            borderRightColor: colors.rowBackground,
          },
          drawerLabelStyle: [styles.drawerText],
          drawerItemStyle: {
            paddingLeft: 0,
            marginLeft: 0,
          },
          drawerContentContainerStyle: {
            paddingLeft: 8,
          },
          drawerInactiveTintColor: colors.greyText,
          drawerActiveTintColor: colors.primary,
          drawerType: isSlideDrawer ? "slide" : "permanent",
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Home",
            title: "Gatz",
            drawerIcon: ({ color }) => (
              <Ionicons name="home-outline" size={22} color={color} />
            )
          }}
        />
        <Drawer.Screen
          name="friends"
          options={{
            title: "Friends",
            drawerLabel: hasPendingContactRequests
              ? `Friends ◦`
              : "Friends",
            drawerLabelStyle: {
              fontSize: 16,
              color: hasPendingContactRequests ? colors.active : colors.greyText,
              marginLeft: DRAWER_LABEL_MARGIN, // Match the global style
            },
            drawerIcon: ({ color }) => (
              <Ionicons name="people-outline" size={22} color={hasPendingContactRequests ? colors.active : color} />
            )
          }}
        />
        <Drawer.Screen
          name="groups"
          options={{
            drawerLabel: "Groups",
            title: "Groups",
            drawerIcon: ({ color }) => (
              <Ionicons name="chatbubbles-outline" size={22} color={color} />
            )
          }}
        />
        <Drawer.Screen
          name="cities"
          options={{
            drawerLabel: "Cities",
            title: "Cities",
            drawerIcon: ({ color }) => (
              <Ionicons name="location-outline" size={22} color={color} />
            )
          }}
        />
        <Drawer.Screen
          name="invites"
          options={{
            drawerLabel: "Invites",
            title: "Invites",
            drawerIcon: ({ color }) => (
              <Ionicons name="mail-outline" size={22} color={color} />
            )
          }}
        />
        <Drawer.Screen
          name="search"
          options={{
            drawerLabel: "Search",
            title: "Search",
            drawerIcon: ({ color }) => (
              <Ionicons name="search-outline" size={22} color={color} />
            )
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: "Settings",
            title: "Settings",
            drawerIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={22} color={color} />
            )
          }}
        />
      </Drawer>
    </ModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  drawer: { flex: 0.2 },
  drawerText: {
    fontSize: 16,
    marginLeft: DRAWER_LABEL_MARGIN, // Reduce left margin of text to be closer to icon
  },
  bottomItems: {
    marginBottom: 15,
    paddingLeft: 8,
  },
});
