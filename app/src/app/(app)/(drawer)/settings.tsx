import React, { useState, useContext, useCallback, useEffect, useRef } from "react";
import {
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  View,
  Switch,
  ActivityIndicator,
  Share,
  Platform,
  TextInput,
  TextInputSubmitEditingEventData,
  NativeSyntheticEvent,
} from "react-native";

import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useProductAnalytics } from "../../../sdk/posthog";

import * as T from "../../../gatz/types";

import { SessionContext } from "../../../context/SessionProvider";
import { ClientContext } from "../../../context/ClientProvider";

import { registerForPushNotificationsAsync } from "../../../push";
import { pickImages, uploadPicture, prepareFile } from "../../../mediaUtils";
import GiftedAvatar from "../../../gifted/GiftedAvatar";
import { TouchableOpacity } from "react-native-gesture-handler";
import { UniversalHeader, HeaderTitleWithIcon } from "../../../components/Header";
import { ThemeContext } from "../../../context/ThemeProvider";
import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { ThemeType } from "../../../context/ThemeProvider";
import { multiPlatformAlert } from "../../../util";

import * as Sync from "../../../../vendor/shared/npm-package";
import { GatzClient } from "../../../gatz/client";
import { useLocationPermission } from "../../../hooks/useLocationPermission";
import { AccountLinkingSection, AccountLinkingModal, useAccountLinking } from "../../../components/AccountLinking";

// type ThemeSelection = 'light' | 'auto' | 'dark';

const labelStylesLabels = StyleSheet.create({
  row: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueText: { fontSize: 18, fontWeight: "bold" },
  labelText: { fontSize: 18 },
});

const Label = ({ icon, value }: { icon: React.JSX.Element; value: string }) => {
  const colors = useThemeColors();

  return (
    <View
      style={[labelStylesLabels.row, { backgroundColor: colors.appBackground }]}
    >
      <Text
        style={[labelStylesLabels.valueText, { color: colors.primaryText }]}
      >
        @{value}
      </Text>
      <View>{icon}</View>
    </View>
  );
};

const labelStylesRow = StyleSheet.create({
  row: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueText: { fontSize: 18, fontWeight: "bold" },
  labelText: { fontSize: 18 },
});

const SwitchRow = ({
  onPress,
  title,
  isEnabled,
}: {
  title: string;
  onPress?: () => void;
  isEnabled: boolean;
}) => {
  const colors = useThemeColors();

  return (
    <View
      style={[labelStylesRow.row, { backgroundColor: colors.appBackground }]}
    >
      <Text style={[labelStylesRow.labelText, { color: colors.primaryText }]}>
        {title}
      </Text>
      <Switch
        ios_backgroundColor={colors.switchBackground}
        onValueChange={onPress}
        value={isEnabled}
      />
    </View>
  );
};

const LocationSection = ({ gatzClient, location, syncEngine }: { gatzClient: GatzClient, location: T.LocationSettings, syncEngine: Sync.SyncEngine }) => {
  const colors = useThemeColors();
  const { requestLocationPermission, getLocation } = useLocationPermission();

  const locationEnabled = location.enabled;

  const toggleLocation = useCallback(async () => {
    try {
      const newSetting = !locationEnabled;
      if (newSetting) {
        const isGranted = await requestLocationPermission();
        if (!isGranted) {
          return;
        }
        Sync.set_location_setting(syncEngine, true);
        const location = await getLocation();
        if (location) {
          gatzClient.markLocation(location);
        }
      } else {
        Sync.set_location_setting(syncEngine, false);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Unexpected error",
        "We don't know what happened:\n\n" + e.message,
        [
          {
            text: "Ok, I'll try again later",
            onPress: () => console.log("Cancel Pressed"),
          },
        ],
      );
    }
  }, [gatzClient, locationEnabled, syncEngine, requestLocationPermission, getLocation]);

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.primaryText }]}>
        Cities
      </Text>
      <SwitchRow
        title={locationEnabled ? "Location enabled" : "Location disabled"}
        isEnabled={!!locationEnabled}
        onPress={toggleLocation}
      />
    </View>
  );
};



const NotificationsSection = ({ gatzClient, notifications, syncEngine }: { gatzClient: GatzClient, notifications: T.NotificationSettings, syncEngine: Sync.SyncEngine }) => {
  const colors = useThemeColors();
  const notificationsEnabled = notifications.overall;

  // TODO: handle errors
  const toggleNotifications = useCallback(async () => {
    try {
      if (notificationsEnabled) {
        Sync.disable_notification_settings(syncEngine);
      } else {
        // if in web, don't do this
        const token = await registerForPushNotificationsAsync();
        if (token) {
          Sync.register_push_token(syncEngine, token);
        } else {
          Sync.enable_notification_settings(syncEngine);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Unexpected error",
        "We don't know what happened:\n\n" + e.message,
        [
          {
            text: "Ok, I'll try again later",
            onPress: () => console.log("Cancel Pressed"),
          },
        ],
      );
    }
  }, [gatzClient, notificationsEnabled, syncEngine]);

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.primaryText }]}>
        Notifications
      </Text>
      <SwitchRow
        title={
          notificationsEnabled
            ? "Notifications enabled"
            : "Notifications disabled"
        }
        isEnabled={!!notificationsEnabled}
        onPress={toggleNotifications}
      />
      {notifications.overall && (
        <>
          <View
            style={[
              styles.notificationOptions,
              { marginBottom: 8, marginTop: 18 },
            ]}
          >
            <View style={{ marginBottom: 8 }}>
              <SwitchRow
                title="Daily activity summary"
                isEnabled={notifications.activity === "daily"}
                onPress={async () => {
                  const newValue = notifications.activity === "daily" ? "none" : "daily";
                  Sync.set_notification_settings_field(syncEngine, "activity", newValue);
                }}
              />
            </View>
            <View style={{ marginBottom: 8 }}>
              <SwitchRow
                title="Suggestions from Gatz"
                isEnabled={notifications.suggestions_from_gatz}
                onPress={async () => {
                  const newValue = !notifications.suggestions_from_gatz;
                  Sync.set_notification_settings_field(syncEngine, "suggestions_from_gatz", newValue);
                }}
              />
            </View>
          </View>

          <Text style={{ color: colors.secondaryText, fontSize: 16, marginBottom: 8, }}          >
            When you comment on a post, you subscribe to:
          </Text>

          <View style={{ marginBottom: 8 }}>
            <SwitchRow
              title="Comments to the post"
              isEnabled={notifications.subscribe_on_comment}
              onPress={async () => {
                const newValue = !notifications.subscribe_on_comment;
                Sync.set_notification_settings_field(syncEngine, "subscribe_on_comment", newValue);
              }}
            />
          </View>
        </>
      )}
    </View>
  );
};

const themeOptions: ThemeType[] = ["light", "auto", "dark"];

const themeToName = (theme: ThemeType): string => {
  switch (theme) {
    case "light":
      return "Light";
    case "auto":
      return "System";
    case "dark":
      return "Dark";
    default:
      return "Unknown";
  }
};

const getThemeIcon = (themeOption: string) => {
  switch (themeOption) {
    case "light":
      return "wb-sunny";
    case "auto":
      return "phone-iphone";
    case "dark":
      return "brightness-3";
    default:
      return "help-outline";
  }
};

const ThemeToggle = () => {
  const colors = useThemeColors();
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <View>
      <Text style={[styles.title, { color: colors.primaryText }]}>
        Appearance
      </Text>
      <View style={[styles.row, { backgroundColor: colors.appBackground }]}>
        <Text style={[styles.labelText, { color: colors.secondaryText }]}>
          Theme
        </Text>
        <View style={styles.toggleContainer}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.toggleButton,
                {
                  backgroundColor:
                    theme === option
                      ? colors.activeBackground
                      : "transparent",
                  ...(Platform.OS === "web" && { cursor: "pointer" }), // Add cursor pointer for web
                },
              ]}
              onPress={() => setTheme(option)}
            >
              <MaterialIcons
                name={getThemeIcon(option)}
                size={18}
                color={theme === option ? colors.active : colors.greyText}
              />

              <Text
                style={[
                  styles.toggleText,
                  { color: theme === option ? colors.active : colors.greyText, },
                ]}
              >
                {themeToName(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};



const isValidName = (name: string): string | null => {
  return name.length > 0 ? name : null;
};

const isValidUrl = (urlString: string): string | null => {
  try {
    // Add https:// if no protocol is specified
    const urlToCheck = urlString.startsWith('http') ? urlString : `https://${urlString}`;
    const url = new URL(urlToCheck);

    // Check for valid protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    // Check for valid domain structure
    // Should have at least one dot and some characters after it
    const domainParts = url.hostname.split('.');
    if (domainParts.length < 2) {
      return null;
    }

    // Check if the last part (TLD) is at least 2 characters
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
      return null;
    }

    // Check if each part has valid characters and length
    const validPartRegex = /^[a-zA-Z0-9-]+$/;
    const isValid = domainParts.every(part =>
      part.length > 0 &&
      part.length <= 63 &&
      validPartRegex.test(part) &&
      !part.startsWith('-') &&
      !part.endsWith('-')
    );

    return isValid ? urlToCheck : null;
  } catch (e) {
    return null;
  }
};

const isValidTwitterUsername = (username: string): string | null => {
  // Remove @ if present
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  // Twitter username rules:
  // 1. 1-15 characters
  // 2. Only letters, numbers, and underscores
  // 3. Must start with a letter
  // 4. No consecutive underscores
  // 5. No underscore at the end
  if (cleanUsername.length === 0 || cleanUsername.length > 15) {
    return null;
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(cleanUsername)) {
    return null;
  }

  // Only alphanumeric and underscores allowed
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return null;
  }

  // No consecutive underscores
  if (cleanUsername.includes('__')) {
    return null;
  }

  // No underscore at the end
  if (cleanUsername.endsWith('_')) {
    return null;
  }

  return cleanUsername;
};

const UrlInput = ({ label, value, onSubmit, validate, cleanText = (t) => t.trim().toLowerCase() }: {
  label: string;
  value?: string;
  onSubmit: (text: string) => Promise<void>;
  validate?: (text: string) => string | null;
  cleanText?: (text: string) => string;
}) => {
  const colors = useThemeColors();
  const [text, setText] = useState(value || "");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // const [isFocused, setIsFocused] = useState(false);

  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current && value && text !== value) {
      setText(value);
    }
  }, [value])

  const handleSubmit = async (textToSubmit: string) => {
    const newText = cleanText(textToSubmit);
    try {
      setIsLoading(true);
      if (validate) {
        const validatedText = validate(newText);
        if (validatedText === null) {
          setError(true);
          return;
        }
        await onSubmit(validatedText);
      } else {
        await onSubmit(newText);
      }
      setShowSuccess(true);
      setError(false);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (e) {
      multiPlatformAlert("Failed to update", "Please try again later");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ position: 'relative', marginTop: 8 }}>
      <TextInput
        style={[
          styles.customLinkInput,
          {
            backgroundColor: colors.appBackground,
            color: colors.primaryText,
            paddingRight: 40
          },
          error && { borderColor: colors.errorFont, borderWidth: 1 },
        ]}
        placeholder={label}
        placeholderTextColor={colors.greyText}
        value={text}
        onChangeText={(newText) => {
          setText(newText);
          setError(false);
          setShowSuccess(false);
        }}
        onFocus={() => focusedRef.current = true}
        onSubmitEditing={async (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
          await handleSubmit(e.nativeEvent.text);
        }}
        onBlur={async () => {
          focusedRef.current = false;
          if (text !== value) {
            await handleSubmit(text);
          }
        }}
      />
      <View style={styles.floatingRight}>
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primaryText} />
        )}
        {showSuccess && !isLoading && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <MaterialIcons name="check-circle" size={20} color={colors.active} />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const subscribeToMe = (syncEngine: Sync.SyncEngine, refreshTrigger?: number): { user: T.User | null, error: Error | null, loading: boolean } => {
  const [user, setUser] = useState<T.User | null>(null);
  const [error, setIsError] = useState<Error | null>(null);
  const [loading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let mounted = true;
    
    try {
      setIsLoading(true);
      setIsError(null);
      
      console.log(`[Settings] Subscribing to user data with refresh trigger: ${refreshTrigger}`);
      
      const { user, unsubscribe } = Sync.subscribe_to_me(syncEngine, `settings-refresh-${refreshTrigger || 0}`, (userData) => {
        if (mounted) {
          console.log('[Settings] User data updated:', userData ? {
            id: userData.id,
            email: userData.email,
            apple_id: userData.apple_id,
            google_id: userData.google_id
          } : null);
          setUser(userData);
        }
      });
      
      user.then((userData) => {
        if (mounted) {
          console.log('[Settings] Initial user data:', userData ? {
            id: userData.id,
            email: userData.email,
            apple_id: userData.apple_id,
            google_id: userData.google_id
          } : null);
          setUser(userData);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          console.error('[Settings] Error loading user data:', e);
          setIsError(e);
          setIsLoading(false);
        }
      });
      
      return () => {
        mounted = false;
        unsubscribe();
      };
    } catch (e) {
      console.error('[Settings] Error setting up subscription:', e);
      if (mounted) {
        setIsError(e);
        setIsLoading(false);
      }
    }
  }, [syncEngine, refreshTrigger]);

  return { user, error, loading };
}

export default function Settings() {
  const colors = useThemeColors();
  const { signOut } = useContext(SessionContext);
  const { gatzClient, syncEngine } = useContext(ClientContext);
  const analytics = useProductAnalytics();

  useEffect(() => analytics.capture("settings.viewed"), [analytics]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, error, loading } = subscribeToMe(syncEngine, refreshTrigger);

  const handleUserUpdate = useCallback(() => {
    console.log('[Settings] handleUserUpdate called - triggering refresh sequence');
    
    // Force multiple refreshes to ensure we get the updated user data
    // Sometimes the backend takes time to propagate the changes
    setTimeout(() => {
      console.log('[Settings] First refresh trigger (500ms)');
      setRefreshTrigger(prev => prev + 1);
    }, 500);
    
    // Additional refresh after a longer delay
    setTimeout(() => {
      console.log('[Settings] Second refresh trigger (1500ms)');
      setRefreshTrigger(prev => prev + 1);
    }, 1500);
    
    // Final refresh to ensure we have the latest data
    setTimeout(() => {
      console.log('[Settings] Final refresh trigger (3000ms)');
      setRefreshTrigger(prev => prev + 1);
    }, 3000);
  }, []);

  const accountLinking = useAccountLinking(user || {} as T.User, gatzClient, handleUserUpdate);

  const finalDeleteAccount = useCallback(async () => {
    try {
      await gatzClient.deleteAccount();
      signOut();
    } catch (e) {
      multiPlatformAlert("Failed to delete account", "If you own any groups, please transfer them before deleting your account. Otherwise, please contact support.");
    }
  }, [gatzClient, signOut]);

  const onDeleteAccount = useCallback(async () => {
    if (Platform.OS === "web") {
      const r = confirm("Do you really want to delete your account?");
      if (r) {
        alert(
          "We'll notify the developers and delete your account. This action is irreversible.",
        );
        finalDeleteAccount();
      }
    } else {
      Alert.alert(
        "Do you really want to delete your account?",
        "We'll notify the developers and delete your account. This action is irreversible.",
        [
          {
            style: "destructive",
            text: "Yes, delete my account",
            onPress: finalDeleteAccount,
          },
          { text: "No, go back", style: "cancel" },
        ],
      );
    }
  }, [gatzClient, signOut]);

  const [loadingPicture, setLoadingPicture] = useState(false);

  const getPicture = async () => {
    try {
      setLoadingPicture(true);
      const { presigned_url, url } =
        await gatzClient.getPresignedUrl("avatars");
      const result = await pickImages({ aspect: [1, 1], allowsEditing: true });
      if (result) {
        const assets = result.assets;
        const asset = assets[0];
        const blob = await prepareFile(asset);
        const r = await uploadPicture(presigned_url, blob);
        if (r.status === 200) {
          Sync.set_profile_picture(syncEngine, url);
        } else {
          multiPlatformAlert("Failed to upload to Cloudfront", "Please try again later");
        }
      }
    } catch (e) {
      multiPlatformAlert("Failed to upload", "Please try again later");
    } finally {
      setLoadingPicture(false);
    }
  };

  const shareLinkIcon = () => {
    if (Platform.OS === "web") {
      return null;
    } else {
      return (
        <TouchableOpacity
          onPress={async () => {
            const { url } = await gatzClient.postContactShareLink();
            Share.share({ url, message: url });
          }}
        >
          <MaterialIcons name="ios-share" size={20} color={colors.greyText} />
        </TouchableOpacity>
      );
    }
  };

  const onSubmitName = useCallback(async (text: string) => {
    try {
      Sync.set_full_name(syncEngine, text);
    } catch (e) {
      multiPlatformAlert("Failed to update website", "Please try again later");
    }
  }, [syncEngine]);

  const onSubmitWebsite = useCallback(async (text: string) => {
    try {
      Sync.set_website_url(syncEngine, text);
    } catch (e) {
      multiPlatformAlert("Failed to update website", "Please try again later");
    }
  }, [syncEngine]);

  const onSubmitTwitter = useCallback(async (text: string) => {
    try {
      Sync.set_twitter_username(syncEngine, text);
    } catch (e) {
      console.error(e);
      multiPlatformAlert("Failed to update Twitter username", "Please try again later");
    }
  }, [syncEngine]);


  if (loading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.primaryText }}>
          Please try again later
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.rowBackground }]}>
      <View
        style={[
          styles.container,
          styles.leftColumn,
          {
            backgroundColor: colors.rowBackground,
            borderRightColor: colors.platformSeparatorDefault,
          },
        ]}
      >
        <UniversalHeader inDrawer>
          <HeaderTitleWithIcon title="Settings" iconName="settings-outline" />
        </UniversalHeader>
        <ScrollView>
          <View style={[styles.sections, { backgroundColor: colors.rowBackground }]} >
            {user ? (
              <View style={[styles.section, { backgroundColor: colors.rowBackground }]}>
                <Text style={[styles.title, { color: colors.primaryText }]}>
                  Profile
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.rowBackground }}
                >
                  <TouchableOpacity
                    style={{ position: "relative" }}
                    onPress={getPicture}
                  >
                    <View style={{ position: "relative" }}>
                      <View style={{ opacity: loadingPicture ? 0.2 : 1 }}>
                        <GiftedAvatar size="hero" user={{ ...user, id: user.id }} />
                      </View>
                      {loadingPicture &&
                        <View style={{ position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -10 }, { translateY: -10 }] }}>
                          <ActivityIndicator size="small" color={colors.primaryText} />
                        </View>}
                    </View>
                    {!loadingPicture && (
                      <View
                        style={[
                          styles.editIconContainer,
                          { backgroundColor: colors.buttonDisabled },
                        ]}
                      >
                        <MaterialIcons name="edit" size={12} color={colors.grey} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Label value={user.name} icon={shareLinkIcon()} />
                  </View>
                </View>
                <UrlInput
                  label="Full Name"
                  value={user.profile?.full_name}
                  validate={isValidName}
                  onSubmit={onSubmitName}
                  cleanText={(t) => t.trim()}
                />

                <UrlInput
                  label="Website"
                  value={user.profile?.urls?.website}
                  validate={isValidUrl}
                  onSubmit={onSubmitWebsite}
                />
                <UrlInput
                  label="Twitter username"
                  value={user.profile?.urls?.twitter}
                  validate={isValidTwitterUsername}
                  onSubmit={onSubmitTwitter}
                />

              </View>
            ) : (
              <View
                style={[
                  styles.sections,
                  { backgroundColor: colors.rowBackground },
                ]}
              >
                <ActivityIndicator size="large" />
              </View>
            )}

            <View
              style={[styles.section, { backgroundColor: colors.rowBackground }]}
            >
              <Text style={[styles.title, { color: colors.primaryText }]}>
                Authentication
              </Text>

              <View
                style={[
                  styles.row,
                  { marginBottom: 8, backgroundColor: colors.appBackground },
                ]}
              >
                {/* Show email if user has email AND other non-SMS auth methods, otherwise show phone */}
                {user.email && (user.apple_id || user.google_id) ? (
                  <Text style={{ fontSize: 18, color: colors.secondaryText }}>
                    {user.email}
                  </Text>
                ) : (
                  <>
                    <Text style={{ fontSize: 18, color: colors.secondaryText }}>
                      {user.phone_number}
                    </Text>
                    <Text style={{ fontSize: 16, color: colors.strongGrey }}>
                      Only used for log in
                    </Text>
                  </>
                )}
              </View>

              {/* Account Linking Section */}
              <AccountLinkingSection
                user={user}
                onOpenMigration={accountLinking.openMigration}
              />

              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.appBackground, marginTop: 8 }]}
                onPress={signOut}
              >
                <Text
                  style={[
                    styles.labelText,
                    { color: colors.errorFont, fontWeight: "400" },
                  ]}
                >
                  Log out
                </Text>
              </TouchableOpacity>
            </View>

            {false && (
              <View
                style={[
                  styles.section,
                  { backgroundColor: colors.rowBackground },
                ]}
              >
                <ThemeToggle />
              </View>
            )}

            {Platform.OS !== "web" && (user ? (
              (
                <>
                  {user.settings?.notifications && (
                    <NotificationsSection
                      gatzClient={gatzClient}
                      notifications={user.settings.notifications}
                      syncEngine={syncEngine}
                    />
                  )}
                  {user.settings?.location && (
                    <LocationSection
                      gatzClient={gatzClient}
                      location={user.settings.location}
                      syncEngine={syncEngine}
                    />
                  )}
                </>
              )
            ) : (
              <View style={[styles.sections, { backgroundColor: colors.rowBackground }]}>
                <ActivityIndicator size="large" />
              </View>
            ))}

            <View style={[styles.section, { backgroundColor: colors.rowBackground }]} >
              <Text style={[styles.title, { color: colors.primaryText }]}>
                About Gatz
              </Text>
              <View
                style={[
                  styles.row,
                  { marginBottom: 8, backgroundColor: colors.appBackground },
                ]}
              >
                <Text style={{ fontSize: 18, color: colors.primaryText }}>
                  App version
                </Text>
                <Text style={{ fontSize: 18, color: colors.secondaryText }}>
                  {Constants.expoConfig.version}
                </Text>
              </View>
            </View>
            <View style={[{ backgroundColor: colors.rowBackground }]}>
              <Text style={[styles.title, { color: colors.primaryText }]}>
                Danger
              </Text>
              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.appBackground }]}
                onPress={onDeleteAccount}
              >
                <Text style={[styles.labelText, { color: colors.errorFont, fontWeight: "400" }]}>
                  Delete account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Account Linking Modal - Rendered outside ScrollView for proper positioning */}
      {user && (
        <AccountLinkingModal
          visible={accountLinking.showMigrationModal}
          onClose={accountLinking.closeMigration}
          onMigrationSuccess={accountLinking.handleMigrationSuccess}
          onLinkAccount={accountLinking.linkAccount}
          gatzClient={gatzClient}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingRight: {
    position: 'absolute',
    right: 12,
    height: '100%',
    // paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  labelText: { fontSize: 18 },
  valueText: { fontSize: 18, fontWeight: "bold" },
  // toggleContainer: {
  //   flexDirection: 'row',
  // },
  // toggleButton: {
  //   paddingVertical: 5,
  //   paddingHorizontal: 10,
  //   borderRadius: 5,
  //   marginHorizontal: 5,
  //   // backgroundColor: '#e0e0e0',
  // },
  // activeButton: {
  //   // backgroundColor: '#007AFF',
  // },
  // toggleText: {
  //   fontSize: 16,
  //   // color: '#000',
  // },
  activeText: {
    // color: '#fff',
  },
  container: { flex: 1 },
  leftColumn: {
    maxWidth: 600,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flatListContainer: {
    borderRadius: 10,
    // backgroundColor: '#FFFFFF',
  },
  sectionRow: {
    flex: 1,
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  section: {
    marginBottom: 20,
  },
  button: {
    // backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 16 },
  sections: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    padding: 20,
  },
  notificationOptions: {
    display: "flex",
    flexDirection: "column",
  },
  editIconContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  iconText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 8,
    overflow: "hidden",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  // activeButton: {
  //   // El color de fondo se establece dinámicamente
  // },
  toggleText: {
    marginLeft: 4,
    fontSize: 14,
  },
  customLinkInput: {
    fontSize: 16,
    padding: 10,
    borderRadius: 8,
  },
});
