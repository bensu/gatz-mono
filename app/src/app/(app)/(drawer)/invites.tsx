import React, { useState, useContext, useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Share,
  ActivityIndicator,
  FlatList,
  TextInput,
} from "react-native";
import { useAsync } from "react-async-hook";

import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";

import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useDebouncedRouter } from "../../../context/debounceRouter";

import { useProductAnalytics } from "../../../sdk/posthog";
import { Styles as GatzStyles } from "../../../gatz/styles";
import * as T from "../../../gatz/types";

import { ClientContext } from "../../../context/ClientProvider";
import { FrontendDBContext } from "../../../context/FrontendDBProvider";
import { UniversalHeader, HeaderTitleWithIcon } from "../../../components/Header";

import { QRModal } from "../../../components/QRButton";
import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { SessionContext } from "../../../context/SessionProvider";
import { GroupRow } from "../../../components/contacts";
import { multiPlatformAlert } from "../../../util";

type MaterialIconsName = keyof typeof MaterialIcons.glyphMap;

const DEFAULT_ICON: MaterialIconsName = Platform.select({
  web: "content-copy",
  default: "ios-share",
});

const Button = ({
  title,
  onPress,
  icon,
}: {
  title: string;
  onPress?: () => void;
  icon?: MaterialIconsName;
}) => {
  const colors = useThemeColors();

  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          buttonStyles.pressable,
          { backgroundColor: colors.appBackground },
        ]}
        onPress={onPress}
      >
        <Text style={[buttonStyles.text, { color: colors.primaryText }]}>
          {title}
        </Text>
        <MaterialIcons
          name={icon || DEFAULT_ICON}
          color={colors.primaryText}
          size={20}
        />
      </TouchableOpacity>
    );
  } else {
    return (
      <View
        style={[
          buttonStyles.pressable,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <Text style={[buttonStyles.text, { color: colors.primaryText }]}>
          {title}
        </Text>
        <MaterialIcons
          name={icon || DEFAULT_ICON}
          color={colors.primaryText}
          size={20}
        />
      </View>
    );
  }
};

const buttonStyles = StyleSheet.create({
  text: { fontSize: 16, fontWeight: "400" },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 100,
    minHeight: 40,
    borderRadius: 8,
    padding: 8,
  },
});

const InviteToGroup = ({ groups }: { groups: T.Group[] }) => {
  const {
    session: { userId },
  } = useContext(SessionContext);
  const colors = useThemeColors();
  const router = useDebouncedRouter();
  const navToNewGroup = useCallback(
    // () => router.push("/new-group?withCrewInvite=true"),
    () => router.push("/new-group"),
    [router.push],
  );

  const onPressGroup = useCallback(
    (group: T.Group) => {
      router.push(`/group/${group.id}`);
    },
    [router.push],
  );

  const adminGroups = useMemo(() => {
    return groups.filter((group) => group.admins.includes(userId));
  }, [groups, userId]);

  const renderGroup = useCallback(
    ({ item, index, lastIndex }) => {
      return (
        <TouchableOpacity
          key={item.id}
          onPress={() => onPressGroup(item)}
          style={{ borderRadius: 10, backgroundColor: colors.appBackground }}
        >
          <GroupRow index={index} item={item} lastIndex={lastIndex} />
        </TouchableOpacity>
      );
    },
    [onPressGroup, colors.rowBackground],
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.primaryText }]}>
        Invite to a Group
      </Text>
      <View style={{ marginBottom: 12 }}>
        <Text
          style={[
            styles.notice,
            { marginVertical: 4, color: colors.secondaryText },
          ]}
        >
          They won't become your friend if they join a group.
        </Text>
        <Text
          style={[
            styles.notice,
            { marginVertical: 4, color: colors.secondaryText },
          ]}
        >
          They'll see Group posts from the last month.
        </Text>
      </View>
      <Button
        title="Create new Group"
        icon="arrow-forward"
        onPress={navToNewGroup}
      />
      <View style={{ marginTop: 12 }}>
        <FlatList
          data={adminGroups}
          renderItem={({ item, index }) =>
            renderGroup({ item, index, lastIndex: adminGroups.length - 1 })
          }
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );
};

const shareableMessage = ({ code, url }: { code: string, url?: string }) => {
  if (url) {
    return `Download Gatz with this link and then enter this invite code ${code}\n\n${url}`;
  } else {
    return `Download Gatz with this link and then enter this invite code ${code}`;
  }
};

const InviteFriends = ({
  user,
  inviteLinkData,
}: {
  user: T.User;
  inviteLinkData: T.InviteLinkScreenData;
}) => {
  const colors = useThemeColors();
  const { gatzClient } = useContext(ClientContext);
  const {
    is_global_invites_enabled,
    can_user_invite,
    total_friends_needed,
    required_friends_remaining,
    current_number_of_friends,
  } = inviteLinkData;
  const canInvite = can_user_invite && is_global_invites_enabled;

  const [successShareIcon, setSuccessShareIcon] = useState(false);

  const shareCrewInviteLink = useCallback(async () => {
    const { url, code } = await gatzClient.postCrewShareLink();
    Platform.select({
      web: async () => {
        const isSuccess = await Clipboard.setStringAsync(url);
        if (isSuccess) {
          setSuccessShareIcon(true);
          setTimeout(() => {
            setSuccessShareIcon(false);
          }, 3000);
        } else {
          alert("There was an error fetching the invite. Try again later");
        }
      },
      android: () => {
        Share.share({
          title: "Join Gatz",
          url,
          message: shareableMessage({ code, url }),
        });
      },
      ios: () => {
        Share.share({
          title: "Join Gatz",
          url,
          message: shareableMessage({ code }),
        });
      },

    })();
  }, [gatzClient]);

  return (
    <View style={styles.section}>
      <Text
        style={[styles.title, { marginBottom: 12, color: colors.primaryText }]}
      >
        Invite friends to Gatz
      </Text>
      {canInvite ? (
        <>
          <View style={{ marginBottom: 8 }}>
            <Button
              title="Share invite link"
              onPress={shareCrewInviteLink}
              icon={successShareIcon ? "check" : undefined}
            />
            {Platform.OS !== "web" && (
              <View style={{ marginTop: 8 }}>
                <QRModal
                  title={"@" + user.name}
                  fetchUrl={() => gatzClient.postCrewShareLink()}
                >
                  <Button title="Get QR code" icon="qr-code" />
                </QRModal>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.notice,
              { marginTop: 4, color: colors.secondaryText },
            ]}
          >
            Those that join with the same link will become friends with each
            other.
          </Text>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            They will see your posts and your friends' posts from the last
            month.
          </Text>
        </>
      ) : is_global_invites_enabled ? (
        <View>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            You can't invite friends yet.
          </Text>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            For them to have a good experience when they join, you need to have
            at least {total_friends_needed} friends yourself.
          </Text>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            You currently have {current_number_of_friends} friends, so you need{" "}
            {required_friends_remaining} more friends.
          </Text>
        </View>
      ) : (
        <View>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            Invites are currently disabled for everyone on Gatz.
          </Text>
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            When they are enabled again, you will see that here.
          </Text>
        </View>
      )}
    </View>
  );
};

export default function Invites() {
  const { gatzClient } = useContext(ClientContext);
  const analytics = useProductAnalytics();
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();

  const { error, loading, result } = useAsync(async () => {
    analytics.capture("invites.viewed");
    const r = await gatzClient.getInviteScreen();
    if (r.user) {
      db.storeMeResult(r);
    }
    return r;
  }, [gatzClient, db]);

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
        <Text style={{ color: colors.primaryText }}>Loading error</Text>
        <Text style={{ color: colors.primaryText }}>
          Please try again later
        </Text>
      </View>
    );
  }

  const user = result.user;
  const groups = result.groups;

  return (
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
        <HeaderTitleWithIcon title="Invites" iconName="mail-outline" />
      </UniversalHeader>
      <ScrollView>
        <View style={styles.sections}>
          <InviteFriends
            user={result.user}
            inviteLinkData={result.invite_screen}
          />
          <InviteByCode />
          <InviteToGroup groups={groups} />
        </View>
      </ScrollView>
    </View>
  );
}

const InviteByCode = () => {
  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);
  const colors = useThemeColors();

  const [inviteCode, setInviteCode] = useState("");

  const [successShareIcon, setSuccessShareIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCodeReady = useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const r = await gatzClient.getInviteByCode(code);
        const id = r?.invite_link?.id;
        if (id) {
          setSuccessShareIcon(true);
          setTimeout(() => {
            router.push(`/invite-link/${id}`);
          }, 2000);
        } else {
          setError("We couldn't find that invite");
        }
      } catch (e) {
        console.error(e);
        multiPlatformAlert(
          "There was an error fetching the invite. Try again later",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [gatzClient],
  );

  const onCodeChange = useCallback(
    (code: string) => {
      setInviteCode(code);
      setError(null);
      setIsLoading(false);
      if (code.length === 6) {
        onCodeReady(code);
      }
    },
    [onCodeReady],
  );

  return (
    <View style={styles.section}>
      <Text
        style={[styles.title, { marginBottom: 12, color: colors.primaryText }]}
      >
        Someone gave me a code
      </Text>
      <View style={styles.codeInputContainer}>
        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.appBackground,
              color: colors.primaryText,
              borderColor: colors.platformSeparatorDefault,
            },
          ]}
          placeholder="ABCDEF"
          placeholderTextColor={colors.greyText}
          value={inviteCode}
          onChangeText={onCodeChange}
          maxLength={6}
          autoCapitalize="characters"
        />
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          successShareIcon && (
            <MaterialIcons name="check" size={24} color={colors.primaryText} />
          )
        )}
      </View>
      {error ? (
        <Animated.View
          entering={FadeInUp.duration(250)}
          exiting={FadeOutDown.duration(250)}
        >
          <Text style={[styles.notice, { color: colors.secondaryText }]}>
            {error}
          </Text>
        </Animated.View>
      ) : (
        <Text style={[styles.notice, { color: colors.secondaryText }]}>
          Enter the code to join them
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  codeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    // maxWidth: 120,
    width: Platform.select({ ios: 100, default: 100 }),
    letterSpacing: 2,
    fontSize: 16,
    textTransform: "uppercase",
  },
  container: { flex: 1 },
  leftColumn: {
    maxWidth: 600,
    borderRightColor: GatzStyles.platformSeparator.backgroundColor,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sectionRow: {
    flex: 1,
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  section: {
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  notice: { marginVertical: 4 },
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    padding: 4,
  },
  codeInputContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
});
