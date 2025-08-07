import React, {
  useRef,
  useState,
  useMemo,
  useContext,
  useCallback,
} from "react";
import {
  Alert,
  Linking,
  TextInput,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useAsync } from "react-async-hook";

import { MaterialIcons } from "@expo/vector-icons";

import PhoneInput from "../../vendor/react-native-phone-number-input/lib";
import { UniversalPhoneInput } from "../components/UniversalPhoneInput";

import { OpenClient } from "../gatz/client";
import * as T from "../gatz/types";
import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";

import { SessionContext } from "../context/SessionProvider";

import { Logo, Tagline } from "../components/logo";
import { NetworkButton, NetworkState } from "../components/NetworkButton";
import { SocialSignInButtons } from "../components/SocialSignInButtons";
import { SocialSignInCredential } from "../gatz/auth";
import { assertNever } from "../util";
import { MobileScreenWrapper } from "../components/MobileScreenWrapper";
import { SafeAreaView } from "react-native-safe-area-context";

const FLASH_SUCCESS_TIMEOUT = 2000;

const isCodeValid = (code: string): boolean => {
  return code.length === 4;
};

const availableUsernamesCache: Map<string, boolean> = new Map();

// keep in sync with gatz.db
const USERNAME_REGEX = /^[a-z0-9._-]+$/;
const ANY_SPACE_REGEX = /\s/g;
const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;

enum UsernameError {
  Short = "Username is too short",
  Long = "Username is too long",
  Lowercase = "Username must be lowercase",
  Whitespace = "No spaces allowed",
  Characters = "Only letters, numbers, and . - _ are allowed",
}

const validateUsername = (username: string): UsernameError | null => {
  if (MAX_USERNAME_LENGTH < username.length) {
    return UsernameError.Long;
  }
  if (username !== username.toLowerCase()) {
    return UsernameError.Lowercase;
  }
  if (username.match(ANY_SPACE_REGEX)) {
    return UsernameError.Whitespace;
  }
  if (!username.match(USERNAME_REGEX)) {
    return UsernameError.Characters;
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return UsernameError.Short;
  }

  return null;
};

const isUsernameValid = (username: string): boolean => {
  const error = validateUsername(username);
  return error === null;
};

const StepInput = ({
  placeholder,
  onChangeText,
  error,
  errorDescription,
  text,
  isLoading = false,
  keyboardType = "default",
}: {
  placeholder: string;
  onChangeText: (text: string) => void;
  error?: string;
  errorDescription?: string;
  isLoading?: boolean;
  text?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
}) => {
  const icon = isLoading
    ? "hourglass-bottom"
    : error
      ? "close"
      : "chevron-right";
  return (
    <>
      <View style={[styles.inputContainer]}>
        <MaterialIcons name={icon} size={32} color={GatzColor.introTitle} />
        <View style={[styles.innerText]}>
          <TextInput
            style={[styles.inputBorder, styles.input]}
            placeholder={placeholder}
            placeholderTextColor={GatzColor.introTitle}
            selectionColor={GatzColor.introTitle}
            keyboardType={keyboardType}
            onChangeText={onChangeText}
            autoFocus
            autoCapitalize="none"
            value={text}
          />
          <View style={{ minHeight: ERROR_MARGIN }}>
            {!isLoading && error && <Text style={styles.message}>{error}</Text>}
            {!isLoading && errorDescription && (
              <Text style={styles.errorDescription}>{errorDescription}</Text>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const ERROR_MARGIN = 64;

const EnteredText = ({ text }: { text: string }) => {
  return (
    <View style={[styles.inputContainer, { opacity: 0.6 }]}>
      <MaterialIcons name="check" size={32} color={GatzColor.introTitle} />
      <View style={styles.innerText}>
        <Text style={styles.input}>{text}</Text>
      </View>
    </View>
  );
};

type Step = "enter_phone" | "verify_phone" | "enter_username";

const UNKNOW_ERROR = "Unknown error. Please try again later";

const SIGN_UP_ERROR_MESSAGES: Record<T.SignUpError, string> = {
  invalid_username: "This username is invalid",
  phone_taken: "This phone was taken",
  username_taken: "This username is taken",
  signup_disabled: "Sign up is closed",
};

export default function SignIn() {
  const { signIn } = useContext(SessionContext);
  const openClient = useMemo(() => new OpenClient(), []);

  const [step, setStep] = useState<Step>("enter_phone");

  const [phone, setPhoneText] = useState("");

  const [existingUser, setExistingUser] = useState<T.User | null>(null);

  const resetPhone = useCallback(() => {
    setPhoneText("");
    setExistingUser(null);
  }, [setPhoneText, setExistingUser]);

  const submitPhoneAsync = useCallback(
    async (text: string): Promise<null> => {
      try {
        const r = await openClient.verifyPhone(text);
        switch (r.status) {
          case "pending": {
            setStep("verify_phone");
            if (r.user) {
              const { user } = r;
              setExistingUser(user);
            }
            return null;
          }
          default: {
            throw new Error("Unknown error. Please try again later");
          }
        }
      } catch (e) {
        throw new Error("Unknown error. Please try again later");
      }
    },
    [openClient, setStep, setExistingUser],
  );

  const {
    error: phoneError,
    loading: isPhoneLoading,
    execute: submitPhone,
  } = useAsync<null>(submitPhoneAsync, [], { executeOnMount: false });

  const [_code, setCodeText] = useState("");
  const [isSignInLoading, setIsSignInLoading] = useState(false);

  const resetCode = () => {
    setCodeText("");
    setIsSignInLoading(false);
  };

  const submitCodeAsync = useCallback(
    async (latestPhone: string, latestCode: string) => {
      try {
        const r = await openClient.verifyCode(latestPhone, latestCode);
        switch (r.status) {
          case "approved": {
            if (r.user && r.token) {
              const { user, token } = r;
              const { is_admin, is_test } = user;
              setIsSignInLoading(true);
              setTimeout(
                () => signIn({ userId: user.id, token, is_admin, is_test }),
                FLASH_SUCCESS_TIMEOUT,
              );
            } else {
              setStep("enter_username");
            }
            break;
          }
          case "wrong_code": {
            throw new Error("Wrong code. Try again.");
          }
          case "failed": {
            throw new Error("Failed. Please try again later");
          }
          default: {
            throw new Error("Unknown error. Please try again later");
          }
        }
        return null;
      } catch (e) {
        console.error(e);
        throw new Error("Unknown error. Please try again later");
      }
    },
    [openClient, signIn, setStep, setIsSignInLoading],
  );

  const {
    loading: isCodeLoading,
    error: codeErrorException,
    execute: submitCode,
  } = useAsync<null>(submitCodeAsync, [], { executeOnMount: false });

  const codeError = codeErrorException && codeErrorException.message;

  const setCode = useCallback(
    async (latestCode: string) => {
      setCodeText(latestCode);
      if (isCodeValid(latestCode)) {
        submitCode(phone, latestCode);
      }
    },
    [setCodeText, submitCode, phone],
  );

  const [username, setUsernameText] = useState("");
  const [usernameErrorDescription, setUsernameErrorDescription] = useState<
    string | null
  >(null);

  const resetUsername = () => {
    setUsernameText("");
    setUsernameErrorDescription("");
  };

  const checkUsernameAsync = async (text: string) => {
    const validationError = validateUsername(text);
    const cachedResult: boolean | undefined = availableUsernamesCache.get(text);
    if (validationError === null && cachedResult == undefined) {
      try {
        const r = await openClient.checkUsername(text);
        availableUsernamesCache.set(text, r.available);
        return null;
      } catch (e) {
        throw new Error("Unknown error. Please try again later");
      }
    } else if (validationError && text.length > 3) {
      setUsernameErrorDescription(validationError);
      throw new Error("Invalid username");
    }
  };

  const { error: usernameErrorException, execute: checkUsername } =
    useAsync<null>(checkUsernameAsync, [], { executeOnMount: false });

  const usernameError =
    usernameErrorException && usernameErrorException.message;

  const isUsernameAvailable = availableUsernamesCache.get(username);

  const setUsername = async (text: string) => {
    setUsernameErrorDescription(null);
    setUsernameText(text);
    checkUsername(text);
  };

  const restart = useCallback(() => {
    setStep("enter_phone");
    resetPhone();
    resetCode();
    resetUsername();
  }, [setStep, resetPhone, resetCode, resetUsername]);

  const handleRestart = useCallback(() => {
    if (Platform.OS === "web") {
      if (confirm("Do you want to start from scratch?")) {
        restart();
      }
    } else {
      Alert.alert(
        "Do you want to start from scratch?",
        "Your progress so far will be lost",
        [
          {
            text: "Yes, restart",
            onPress: restart,
          },
          {
            text: "No, go back",
            style: "cancel",
          },
        ],
      );
    }
  }, [restart]);

  const toTOS = useCallback(async () => {
    const url = "https://gatz.chat/tos";
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log(`Don't know how to open this URL: ${url}`);
    }
  }, []);

  const onSignUpAsync = async () => {
    const r = await openClient.signUp(username, phone);
    if (r.type === "error") {
      if (r.message) {
        throw new Error(r.message);
      } else {
        const msg = SIGN_UP_ERROR_MESSAGES[r.error] || UNKNOW_ERROR;
        throw new Error(msg);
      }
    } else {
      const { user, token, is_admin = false, is_test = false } = r;
      setTimeout(() => {
        signIn(
          { userId: user.id, token, is_admin, is_test },
          {
            redirectTo: Platform.select({
              web: "/howto",
              default: "/notifications",
            }),
          },
        );
      }, FLASH_SUCCESS_TIMEOUT);
      return true;
    }
  };

  const {
    execute: onSignUp,
    loading: isSignUpLoading,
    result: signUpResult,
    error: signUpException,
  } = useAsync<boolean>(onSignUpAsync, [], { executeOnMount: false });

  const signUpErr =
    signUpException &&
    (signUpException.message || "Uknown erorr. Please try again later");

  const signUpState: NetworkState = isSignUpLoading
    ? "loading"
    : signUpErr
      ? "error"
      : signUpResult
        ? "success"
        : "idle";

  const phoneInputRef = useRef<PhoneInput>(null);

  const [isSocialSignInLoading, setIsSocialSignInLoading] = useState(false);

  const handleSocialSignIn = useCallback(
    async (credential: SocialSignInCredential) => {
      setIsSocialSignInLoading(true);
      try {
        let response: T.AppleSignInAPIResponse | T.GoogleSignInAPIResponse;
        
        if (credential.type === 'apple') {
          response = await openClient.appleSignIn(credential.identityToken);
        } else {
          // For Google, we need the web client ID from environment
          const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
          response = await openClient.googleSignIn(credential.idToken, webClientId);
        }

        if (response.type === 'error') {
          throw new Error(response.message || 'Authentication failed');
        }

        const { user, token } = response;
        const { is_admin = false, is_test = false } = user;
        
        setTimeout(
          () => signIn({ userId: user.id, token, is_admin, is_test }),
          FLASH_SUCCESS_TIMEOUT,
        );
      } catch (error) {
        console.error('Social sign-in error:', error);
        Alert.alert(
          'Sign-in Failed',
          error.message || 'Unable to sign in. Please try again.',
        );
      } finally {
        setIsSocialSignInLoading(false);
      }
    },
    [openClient, signIn],
  );

  const renderInputSection = () => {
    switch (step) {
      case "enter_phone": {
        return (
          <>
            <View
              style={{
                marginTop: 18,
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <UniversalPhoneInput
                setPhoneText={setPhoneText}
                phoneInputRef={phoneInputRef}
                submitPhone={submitPhone}
              />
              <View style={{ marginTop: 18 }}>
                <NetworkButton
                  title="Get code"
                  onPress={() => submitPhone(phone)}
                  state={isPhoneLoading ? "loading" : "idle"}
                  isDisabled={phone.length === 0}
                />
              </View>
              
              <View style={styles.socialSignInSection}>
                <Text style={styles.dividerText}>or</Text>
                <SocialSignInButtons
                  onSignIn={handleSocialSignIn}
                  isLoading={isPhoneLoading || isSocialSignInLoading}
                />
              </View>
              
              {!isPhoneLoading && phoneError && (
                <Text style={styles.message}>
                  Uknown error. Please try again later.
                </Text>
              )}
            </View>
          </>
        );
      }
      case "verify_phone": {
        return (
          <>
            <TouchableOpacity onPress={handleRestart}>
              <EnteredText text={phone} />
            </TouchableOpacity>
            {isSignInLoading ? (
              <EnteredText text={"Success! Signing you in"} />
            ) : (
              <StepInput
                placeholder="Enter code"
                onChangeText={setCode}
                error={codeError}
                isLoading={isCodeLoading}
                keyboardType="number-pad"
              />
            )}
          </>
        );
      }
      case "enter_username": {
        const err =
          usernameError ||
          (isUsernameAvailable === false ? `${username} is taken` : null);
        return (
          <>
            <TouchableOpacity onPress={handleRestart}>
              <EnteredText text={phone} />
            </TouchableOpacity>
            <EnteredText text={"Phone verified"} />
            <StepInput
              placeholder="username"
              onChangeText={setUsername}
              error={err}
              errorDescription={usernameErrorDescription}
              isLoading={false}
            />
            <View style={{ marginTop: 32 }}>
              <NetworkButton
                title="Sign Up"
                onPress={onSignUp}
                state={signUpState}
                isDisabled={!isUsernameAvailable}
              />
            </View>
            {signUpErr && (
              <View>
                <Text style={styles.message}>{signUpErr}</Text>
              </View>
            )}
            <Text style={styles.tosNotice}>
              By registering, you are agreeing to our{" "}
              <Text style={styles.link} onPress={toTOS}>
                Terms of Service
              </Text>
            </Text>
          </>
        );
      }
      default: {
        const exhaustiveCheck: never = step;
        return exhaustiveCheck;
      }
    }
  };

  let welcomeTitle: string;
  switch (step) {
    case "enter_phone": {
      welcomeTitle = "Welcome";
      break;
    }
    case "verify_phone": {
      welcomeTitle = existingUser ? "Welcome back" : "Welcome";
      break;
    }
    case "enter_username": {
      welcomeTitle = "Sign up";
      break;
    }
    default: {
      assertNever(step);
    }
  }

  return (
    <MobileScreenWrapper backgroundColor={GatzColor.introBackground}>
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, width: "100%" }}>
          <KeyboardAvoidingView
            style={styles.outerContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.innerContainer}>
              <View style={{ width: "100%" }}>
                <Text style={styles.appTitle}>{welcomeTitle}</Text>
                {renderInputSection()}
              </View>
              <View style={styles.logoFooter}>
                <Logo fontSize={36} color={GatzColor.introTitle} />
                <Tagline fontSize={24} color={GatzColor.introTitle} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </MobileScreenWrapper>
  );
}

export const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    flex: 1,
    backgroundColor: GatzColor.introBackground,
  },
  innerContainer: {
    width: "100%",
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: Platform.select({ web: 32, default: 0 }),
    backgroundColor: GatzColor.introBackground,
  },
  container: {
    width: "100%",
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
  socialSignInSection: {
    marginTop: 32,
    width: '100%',
  },
  dividerText: {
    textAlign: 'center',
    color: GatzColor.introTitle,
    fontSize: 16,
    fontFamily: GatzStyles.tagline.fontFamily,
    marginBottom: 16,
  },
});
