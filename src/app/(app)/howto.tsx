import { useState, useEffect } from "react";
import {
  Platform,
  Image,
  StatusBar,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { Stack } from "expo-router";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";

import { Styles as GatzStyles, Color as GatzColor } from "../../gatz/styles";

import { IntroNetworkButton } from "../../components/IntroNetworkButton";
import { useDebouncedRouter } from "../../context/debounceRouter";

const backgroundImageUrl = require("../../../assets/img/lady_and_captain_background.png");
import { MobileScreenWrapper } from "../../components/MobileScreenWrapper";

const FLASH_SUCCESS = 2000;

export default function HowTo() {
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
  const toCheckInvite = () => router.push("/check-invite");

  return (
    <MobileScreenWrapper backgroundColor={GatzColor.introBackground}>
      <View style={styles.container}>
        <Stack.Screen options={{ header: () => null }} />
        {backgroundSource && (
          <Image
            style={styles.backgroundImage}
            resizeMethod="resize"
            source={backgroundSource}
          />
        )}
        <View style={styles.bottomColumn}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "transparent"]}
            locations={[0, 0.6, 1]}
            style={styles.radialOverlay}
          />
          <View style={styles.innerContainer}>
            <View style={styles.textContainer}>
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.message}>Like in Twitter,</Text>
                <Text style={styles.message}>post what's interesting</Text>
              </View>
              <View>
                <Text style={styles.message}>Like in chats,</Text>
                <Text style={styles.message}>reply when interested</Text>
              </View>
            </View>
            <IntroNetworkButton
              title="Got it"
              state={"idle"}
              onPress={toCheckInvite}
            />
            <View style={[styles.skipContainer, styles.hidden]}>
              <Text style={[styles.skipMessage]}>Skip</Text>
            </View>
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
  bottomColumn: {
    flex: 1,
    width: "100%",
    padding: 32,
    justifyContent: "flex-end",
    flexDirection: "column",
  },
  innerContainer: {
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
