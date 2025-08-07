import React from "react";
import {
  Dimensions,
  View,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  KeyboardAvoidingView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useThemeColors } from "../gifted/hooks/useThemeColors";

const isWeb = Platform.OS === "web";

type SmallSheetProps = {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const FADE_IN_MS = 200;

const useModalAnimation = (isVisible: boolean) => {
  const animationProgress = useSharedValue(0);

  React.useEffect(() => {
    if (isVisible) {
      animationProgress.value = withTiming(1, { duration: FADE_IN_MS });
    } else {
      animationProgress.value = withTiming(0, { duration: FADE_IN_MS });
    }
  }, [isVisible]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: animationProgress.value,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            animationProgress.value,
            [0, 1],
            [FADE_IN_MS, 0],
            { extrapolateRight: Extrapolation.CLAMP },
          ),
        },
      ],
    };
  });

  return { modalStyle, overlayStyle };
};

export const SmallSheet = ({
  isVisible,
  onClose,
  children,
  title,
}: SmallSheetProps) => {
  const { modalStyle, overlayStyle } = useModalAnimation(isVisible);
  const colors = useThemeColors();

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[styles.centeredView, overlayStyle]}
          >
            <BlurView
              tint={colors.theme === "dark" ? "light" : "dark"}
              style={StyleSheet.absoluteFill}
              intensity={Platform.select({ android: 20, default: 5 })}
            />
            <Animated.View
              style={[
                modalStyle,
                styles.smallModalView,
                isWeb && styles.webModalView,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <TouchableWithoutFeedback >
                <View style={[styles.buttonBar, { padding: 8, paddingBottom: 0 }]}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.title, { color: colors.primaryText }]}>
                      {title}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.button} onPress={onClose}>
                    <MaterialIcons
                      name="close"
                      size={32}
                      color={colors.greyText}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback style={{ padding: 8, paddingTop: 0 }}>
                <View style={{ padding: 8, paddingTop: 0 }}>{children}</View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};


export const ScrollableSmallSheet = ({
  isVisible,
  onClose,
  children,
  title,
}: SmallSheetProps) => {
  const { modalStyle, overlayStyle } = useModalAnimation(isVisible);
  const colors = useThemeColors();

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[styles.centeredView, overlayStyle]}
          >
            <BlurView
              tint={colors.theme === "dark" ? "light" : "dark"}
              style={StyleSheet.absoluteFill}
              intensity={Platform.select({ android: 20, default: 5 })}
            />
            <Animated.View
              style={[
                modalStyle,
                styles.smallModalView,
                isWeb && styles.webModalView,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <TouchableWithoutFeedback >
                <View style={[styles.buttonBar, { padding: 8, paddingBottom: 0 }]}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.title, { color: colors.primaryText }]}>
                      {title}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.button} onPress={onClose}>
                    <MaterialIcons
                      name="close"
                      size={32}
                      color={colors.greyText}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator
                contentContainerStyle={styles.scrollViewContent}
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
              >
                <TouchableWithoutFeedback style={{ padding: 8, paddingTop: 0 }}>
                  <View style={{ padding: 8, paddingTop: 0 }}>{children}</View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};


const SimpleButtonBar = ({ onClose, title }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.simpleBottomSheetButtonBar}>
      <TouchableOpacity
        onPress={onClose}
        style={[styles.button, { position: "absolute", left: 0, top: 0 }]}
      >
        <MaterialIcons name="close" size={24} color={colors.greyText} />
      </TouchableOpacity>
      <Text style={[styles.title, { fontSize: 24, color: colors.primaryText }]}>
        {title}
      </Text>
    </View>
  );
};

const BaseBottomSheet = ({
  isVisible,
  onClose,
  children,
  buttonBar,
}: {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  buttonBar: React.ReactNode;
}) => {
  const { modalStyle, overlayStyle } = useModalAnimation(isVisible);
  const colors = useThemeColors();
  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
    >
      <Animated.View
        style={[styles.centeredView, styles.backgroundOpacity, overlayStyle]}
      >
        <Animated.View
          style={[
            styles.modalView,
            isWeb && styles.webModalView,
            modalStyle,
            { backgroundColor: colors.rowBackground },
          ]}
        >
          <View style={[styles.outerHPadding, { paddingTop: 8 }]}>
            {buttonBar}
          </View>
          <ScrollView style={[styles.outerHPadding]}>{children}</ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const SimpleBottomSheet = ({
  title,
  isVisible,
  onClose,
  children,
}: {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      buttonBar={<SimpleButtonBar onClose={onClose} title={title} />}
    >
      {children}
    </BaseBottomSheet>
  );
};

type Props = {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  onNext?: () => void;
  children: React.ReactNode;
  leftButtonText?: string;
  rightButtonText?: string;
};

const ComplexButtonBar = ({
  onNext,
  onClose,
  title,
  leftButtonText = "Done",
  rightButtonText = "Create",
}: {
  onNext: () => void;
  onClose: () => void;
  title: string;
  rightButtonText?: string;
  leftButtonText?: string;
}) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.buttonBar, { paddingTop: 4, paddingBottom: 8 }]}>
      <TouchableOpacity style={styles.button} onPress={onClose}>
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>
          {leftButtonText}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
      {onNext ? (
        <TouchableOpacity onPress={onNext}>
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {rightButtonText}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ opacity: 0 }}></View>
      )}
    </View>
  );
};

export const BottomSheet = ({
  title,
  isVisible,
  onClose,
  onNext,
  children,
  leftButtonText,
  rightButtonText,
}: Props) => {
  const buttonBar = (
    <ComplexButtonBar
      onNext={onNext}
      onClose={onClose}
      title={title}
      leftButtonText={leftButtonText}
      rightButtonText={rightButtonText}
    />
  );

  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      buttonBar={buttonBar}
    >
      {children}
    </BaseBottomSheet>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  title: {
    alignContent: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  backgroundOpacity: { backgroundColor: "rgba(0,0,0,0.5)", },
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  smallModalView: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  innerPadding: { padding: 8 },
  outerHPadding: { paddingHorizontal: 16 },
  modalView: {
    width: "100%",
    height: SCREEN_HEIGHT - Platform.select({ android: 100, default: 50 }),
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  // Limit the width on web
  webModalView: { maxWidth: 500 },
  buttonBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignContent: "center",
  },
  simpleBottomSheetButtonBar: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  button: { paddingVertical: 0, paddingHorizontal: 0 },
  buttonText: { fontSize: 16, },
  scrollViewContent: { flexGrow: 1, },
});
