import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Image,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useAsync } from "react-async-hook";

import { Asset } from "expo-asset";
import { router, Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Styles as GatzStyles, Color as GatzColor } from "../../gatz/styles";

import { ClientContext } from "../../context/ClientProvider";

import { MobileScreenWrapper } from "../../components/MobileScreenWrapper";
import { multiPlatformAlert } from "../../util";

const backgroundImageUrl = require("../../../assets/img/lady_invite_background.png");

const CodeInput = () => {
  const { gatzClient } = useContext(ClientContext);

  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successShareIcon, setSuccessShareIcon] = useState(false);

  const onCodeReady = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const r = await gatzClient.getInviteByCode(code);
      const id = r?.invite_link?.id;
      if (id) {
        setSuccessShareIcon(true);
        setTimeout(() => {
          router.push(`/invite-link/${id}`);
        }, 3000);
      } else {
        setError("We couldn't find that invite");
      }
    } catch (e) {
      console.error(e);
      multiPlatformAlert("There was an error fetching the invite. Try again later");
    } finally {
      setIsLoading(false);
    }
  }, [gatzClient]);

  const onCodeChange = useCallback((code: string) => {
    const newCode = code.toUpperCase();
    setInviteCode(newCode);
    setError(null);
    setIsLoading(false);
    setSuccessShareIcon(false);
    if (newCode.length === 6) {
      onCodeReady(newCode);
    }
  }, [onCodeReady]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View>
        <View style={styles.codeInputContainer}>
          <TextInput
            style={[styles.input, styles.inputBorder, styles.message, { width: 120 }]}
            placeholder="CODE"
            placeholderTextColor={GatzColor.introTitleLowOpacity}
            selectionColor={GatzColor.introTitle}
            value={inviteCode}
            onChangeText={onCodeChange}
            maxLength={6}
            autoCapitalize="characters"
          />
          {isLoading && (
            <ActivityIndicator color={GatzColor.introTitle} />
          )}
        </View>
        <View style={{ height: 36 }}>
          {error ? (
            <Animated.View entering={FadeInUp.duration(ANIMATION_DURATION)} exiting={FadeOutDown.duration(ANIMATION_DURATION)}>
              <Text style={[styles.message, { fontSize: 24 }]}>{error}</Text>
            </Animated.View>
          ) : (
            successShareIcon && (
              <Animated.View entering={FadeInUp.duration(ANIMATION_DURATION)} exiting={FadeOutDown.duration(ANIMATION_DURATION)}>
                <Text style={[styles.message, { fontSize: 24 }]}>Success! Taking you to the invite...</Text>
              </Animated.View>
            )
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const ANIMATION_DURATION = 200;

export default function CheckInvite() {
  const [backgroundSource, setBackgroundSource] = useState(null);
  useEffect(() => {
    const loadImage = async () => {
      const asset = Asset.fromModule(backgroundImageUrl);
      await asset.downloadAsync();
      setBackgroundSource({ uri: asset.localUri });
    };
    loadImage();
  }, []);

  const router = useRouter();
  const toHome = () => router.push("/");
  const { openClient } = useContext(ClientContext);

  const { loading } = useAsync(async () => {
    const path = await openClient.getInitialLink();
    if (path) {
      router.push(path);
      await openClient.removeLink(path);
      return undefined;
    }
    return "empty";
  }, []);


  return (
    <MobileScreenWrapper backgroundColor={GatzColor.introBackground}>
      <View style={[styles.container]}>
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
            colors={["transparent", "rgba(0,0,0,0.4)", "transparent"]}
            locations={[0, 0.65, 1]}
            style={styles.radialOverlay}
          />
          <View style={styles.innerContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.appTitle}>Got an invite?</Text>
              {loading ? (
                <View style={styles.messagesContainer}>
                  <Text style={styles.message}>
                    Looking for any pending invites...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.messagesContainer}>
                    <Text style={styles.message}>
                      If you have a link, tap on it again.
                    </Text>
                  </View>
                  <View style={styles.messagesContainer}>
                    <Text style={styles.message}>
                      If you have a code, enter it below.
                    </Text>
                  </View>
                  <CodeInput />
                </>
              )}
            </View>
            <View style={styles.messagesContainer}>
              <Text style={styles.message}>
                Find your invite before proceeding, Gatz is not fun without friends.
              </Text>
            </View>
            <SkipButton onPress={toHome} />
          </View>
        </View>
      </View>
    </MobileScreenWrapper>
  );
}

const SkipButton = ({ onPress }: { onPress: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setIsVisible(true);
    }, 5000);
  }, []);
  return (
    <View style={[styles.skipContainer, { height: 48 }]}>
      {isVisible && (
        <Animated.View entering={FadeIn.duration(ANIMATION_DURATION)}>
          <TouchableOpacity onPress={onPress}>
            <Text style={[styles.skipMessage]}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
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
  hidden: { opacity: 0 },
  skipContainer: {
    marginTop: 24,
    marginBottom: 8,
    width: "100%",
    justifyContent: "center",
  },
  skipMessage: {
    fontSize: 24,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
    textAlign: "center",
    opacity: 0.6,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    // maxWidth: 120,
    letterSpacing: 2,
    fontSize: 16,
    textTransform: 'uppercase'

  },
  codeInputContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  input: {
    color: GatzColor.introTitle,
    fontSize: 24,
  },
  inputBorder: {
    borderBottomColor: GatzColor.introTitle,
    borderBottomWidth: 2,
  },
  keyboardAvoidingView: {
    width: '100%',
  },
});
