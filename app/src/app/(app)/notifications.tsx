import { useState, useContext, useEffect } from "react";
import {
  Platform,
  Image,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { Stack } from "expo-router";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";

import { ClientContext } from "../../context/ClientProvider";

import { Styles as GatzStyles, Color as GatzColor } from "../../gatz/styles";

import { registerForPushNotificationsAsync } from "../../push";

import {
  IntroNetworkState,
  IntroNetworkButton,
} from "../../components/IntroNetworkButton";
import { MobileScreenWrapper } from "../../components/MobileScreenWrapper";
import { useDebouncedRouter } from "../../context/debounceRouter";

const backgroundImageUrl = require("../../../assets/img/cant_hear_you_background.png");

const FLASH_SUCCESS = 2000;

const EmptyHeader = () => null;

export default function Notifications() {
  const [backgroundSource, setBackgroundSource] = useState(null);
  useEffect(() => {
    const loadImage = async () => {
      const asset = Asset.fromModule(backgroundImageUrl);
      await asset.downloadAsync();
      setBackgroundSource({ uri: asset.localUri });
    };
    loadImage();
  }, []);

  const router = useDebouncedRouter();
  const toHowTo = () => router.push("/howto");
  const { gatzClient } = useContext(ClientContext);

  const [notificationsState, setNotificationsState] =
    useState<IntroNetworkState>("idle");

  const [error, setError] = useState<string | null>(null);

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSetUp = async () => {
    setNotificationsState("loading");
    setError(null);
    const token = await registerForPushNotificationsAsync();
    if (token) {
      try {
        const response = await gatzClient.registerPushNotificationToken(token);
        if (response.user) {
          setNotificationsState("success");
          setError(null);
          setIsRedirecting(true);
          setTimeout(() => {
            toHowTo();
          }, FLASH_SUCCESS);
        } else {
          setNotificationsState("error");
          setError("Failed to register token with Gatz");
        }
      } catch (e) {
        setNotificationsState("error");
        setError("Failed to register token with Gatz");
      }
    } else {
      setNotificationsState("error");
      setError("Failed to get token from the device");
    }
  };

  return (
    <MobileScreenWrapper backgroundColor={GatzColor.introBackground}>
      <View style={styles.container}>
        <Stack.Screen options={{ header: EmptyHeader }} />
        {backgroundSource && (
          <Image
            style={styles.backgroundImage}
            resizeMethod="resize"
            source={backgroundSource}
          />
        )}
        <View
          style={{
            flex: 1,
            width: "100%",
            padding: 32,
            justifyContent: "flex-end",
            flexDirection: "column",
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)", "transparent"]}
            locations={[0, 0.65, 1]}
            style={styles.radialOverlay}
          />
          <View style={styles.innerContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.appTitle}>Notifications</Text>
              {isRedirecting ? (
                <View style={styles.messagesContainer}>
                  <Text style={styles.message}>That worked!</Text>
                  <Text style={styles.message}>Redirecting you to Gatz...</Text>
                </View>
              ) : notificationsState === "error" ? (
                <View style={styles.messagesContainer}>
                  <Text style={styles.message}>{error}</Text>
                  <Text style={styles.message}>Try again or skip below</Text>
                </View>
              ) : (
                <View style={styles.messagesContainer}>
                  <Text style={styles.message}>
                    You can turn them off later
                  </Text>
                </View>
              )}
            </View>
            <View style={{ height: 44 }}>
              <IntroNetworkButton
                title="Set up notifications"
                state={notificationsState}
                onPress={handleSetUp}
              />
            </View>
            <TouchableOpacity
              style={[styles.skipContainer, isRedirecting && styles.hidden]}
              disabled={isRedirecting}
              onPress={toHowTo}
            >
              <Text style={[styles.skipMessage]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </MobileScreenWrapper>
  );
}

const ANDROID_STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    backgroundColor: GatzColor.introBackground,
  },
  innerContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    width: "100%",
  },
  message: {
    marginTop: 8,
    fontSize: 28,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
  },
  messagesContainer: {
    marginTop: 4,
    marginBottom: 18,
  },
  appTitle: {
    color: GatzColor.introTitle,
    fontFamily: GatzStyles.title.fontFamily,
    fontSize: 36,
  },
  backgroundImage: {
    position: "absolute",
    flex: 1,
    width: GatzStyles.screen.width,
    height: GatzStyles.screen.height,
    top: ANDROID_STATUS_BAR_HEIGHT,
  },
  radialOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.8,
  },
  textContainer: { marginBottom: 120 },
  skipMessage: {
    fontSize: 24,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
    textAlign: "center",
    opacity: 0.6,
  },
  hidden: { opacity: 0 },
  skipContainer: {
    marginTop: 24,
    marginBottom: 8,
    width: "100%",
    justifyContent: "center",
  },
});
