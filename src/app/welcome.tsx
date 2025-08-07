import { useState, useEffect } from "react";
import {
  StatusBar,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Platform,
} from "react-native";
import { Asset } from "expo-asset";

import { Styles as GatzStyles, Color as GatzColor } from "../gatz/styles";

import { Logo } from "../components/logo";
import { useDebouncedRouter } from "../context/debounceRouter";

const backgroundImageUrl = require("../../assets/img/gentleman_centered_background.png");
// const beigeLogoUrl = require("../../assets/img/beige_logo.png");
import {
  MobileScreenWrapper,
  CONTENT_WIDTH,
} from "../components/MobileScreenWrapper";

export default function Welcome() {
  const router = useDebouncedRouter();
  const toSignIn = () => router.push("/sign-in");
  const [backgroundSource, setBackgroundSource] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      const asset = Asset.fromModule(backgroundImageUrl);
      await asset.downloadAsync();
      setBackgroundSource({ uri: asset.localUri });
    };
    loadImage();
  });

  return (
    <MobileScreenWrapper backgroundColor={GatzColor.introBackground}>
      <View style={{ flex: 1 }}>
        {backgroundSource && (
          <Image
            style={styles.backgroundImage}
            resizeMethod="resize"
            source={backgroundSource}
          />
        )}
        <View style={styles.container}>
          <TouchableOpacity onPress={toSignIn}>
            <View style={[styles.logoBox]}>
              <Logo fontSize={120} color={GatzColor.introTitle} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={toSignIn}
            style={{ justifyContent: "space-around" }}
          >
            <Text style={styles.subtitle}>Sign in or Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </MobileScreenWrapper>
  );
}

const ANDROID_STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight : 0;

const styles = StyleSheet.create({
  bottomRow: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
  },
  backgroundImage: {
    position: "absolute",
    flex: 1,
    width: CONTENT_WIDTH,
    height: GatzStyles.screen.height + ANDROID_STATUS_BAR_HEIGHT,
    top: 0,
    left: 0,
  },
  subtitle: {
    fontSize: 28,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
  },
  logoBox: {
    display: "flex",
    flexDirection: "column",
  },
  heavyDropShadow: {
    // iOS shadow properties
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,

    // Android shadow property
    elevation: 6,
  },
});
