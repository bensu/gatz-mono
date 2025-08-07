import React from "react";
import { Platform, StyleSheet } from "react-native";

import PhoneInput from "../../vendor/react-native-phone-number-input/lib";

import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";

const MobilePhoneInputInner = ({
  phoneInputRef,
  setPhoneText,
  submitPhone,
}) => {
  return (
    <PhoneInput
      containerStyle={styles.phoneInputContainer}
      textContainerStyle={styles.phoneInputContainer}
      codeTextStyle={styles.phoneInputText}
      textInputStyle={styles.phoneInputText}
      ref={phoneInputRef}
      defaultCode="US"
      layout="first"
      onChangeFormattedText={(text: string) => {
        setPhoneText(text);
        const valid = phoneInputRef.current?.isValidNumber(text);
        if (valid) {
          submitPhone(text);
        }
      }}
      withDarkTheme
      withShadow
      autoFocus
    />
  );
};

const MobilePhoneInput = React.memo(MobilePhoneInputInner);

export const UniversalPhoneInput = ({
  setPhoneText,
  phoneInputRef,
  submitPhone,
}: {
  setPhoneText: (text: string) => void;
  phoneInputRef: React.RefObject<PhoneInput>;
  submitPhone: (phone: string) => void;
}) => {
  return (
    <MobilePhoneInput
      phoneInputRef={phoneInputRef}
      setPhoneText={setPhoneText}
      submitPhone={submitPhone}
    />
  );
};

export const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: GatzColor.introBackground,
  },
  innerContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: Platform.select({ web: 32, default: 0 }),
    backgroundColor: GatzColor.introBackground,
  },
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 36,
    paddingTop: 92,
    backgroundColor: GatzColor.introBackground,
  },
  phoneInputContainer: {
    borderRadius: 8,
    backgroundColor: GatzColor.introTitle,
  },
  phoneInputText: {
    fontWeight: "600",
    fontSize: 18,
    color: GatzColor.introBackground,
  },
  appTitle: {
    color: GatzColor.introTitle,
    fontFamily: GatzStyles.title.fontFamily,
    fontSize: 36,
  },
  logoFooter: {},
  input: {
    color: GatzColor.introTitle,
    fontSize: 24,
  },
  inputBorder: {
    borderBottomColor: GatzColor.introTitle,
    borderBottomWidth: 2,
  },
  inputContainer: {
    display: "flex",
    flexDirection: "row",
    marginTop: 24,
    alignContent: "flex-start",
  },
  message: {
    marginTop: 12,
    fontSize: 20,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
  },
  errorDescription: {
    marginTop: 12,
    fontSize: 20,
    fontFamily: GatzStyles.tagline.fontFamily,
    color: GatzColor.introTitle,
  },
  tosNotice: {
    fontWeight: "500",
    fontSize: 16,
    color: GatzColor.introTitle,
    marginTop: 12,
  },
  link: {
    textDecorationLine: "underline",
  },
  innerText: { marginLeft: 8, display: "flex", flexDirection: "column" },
});
