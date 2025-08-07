import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Text,
  Linking,
  StyleSheet,
} from "react-native";
import { useAsync } from "react-async-hook";
import * as Clipboard from "expo-clipboard";
import { MaterialIcons } from "@expo/vector-icons";

import dayjs from "dayjs";

import * as T from "../gatz/types";

import { ClientContext } from "../context/ClientProvider";
import { SessionContext } from "../context/SessionProvider";
import { APP_STORE_LINKS } from "../context/VersionProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { useDebouncedRouter } from "../context/debounceRouter";

import { BigGroupCard, UsernameWithAvatar } from "../gifted/GiftedAvatar";
import { Row as ContactRow, NonSelectableRow } from "../components/contacts";
import { UniversalHeader } from "../components/Header";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const buttonStyles = StyleSheet.create({
  touchable: {
    minWidth: 100,
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  text: {
    justifyContent: "center",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
  }
});

const Button = ({
  title, onPress, color, icon,
}: {
  color?: string;
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        buttonStyles.touchable,
        { backgroundColor: colors.settingsButtonBackground }
      ]}
    >
      <Text style={[buttonStyles.text, { color }]}      >
        {title}
      </Text>
      {icon}
    </TouchableOpacity >
  );
};

export const DATE_FORMAT = "ll";

const renderDateText = (
  date: Date | string,
  locale = "en",
  dateFormat = DATE_FORMAT,
): string => {
  return dayjs(date).locale(locale).format(dateFormat);
};

const CrewInvite = ({
  invite_link, invited_by, members,
}: {
  invite_link: T.InviteLink;
  invited_by: T.Contact;
  members: T.Contact[];
}) => {
  const colors = useThemeColors();
  const router = useDebouncedRouter();
  const { session: { userId } } = useContext(SessionContext);

  const { result, error, loading, execute } = useJoinInvite(invite_link.id);

  useEffect(() => {
    if (error) {
      if (Platform.OS === "web") {
        alert("There was an error accepting this invite");
      } else {
        Alert.alert("Error", "There was accepting this invite");
      }
    }
  }, [error]);

  useEffect(() => {
    if (result) {
      router.replace(`/`);
    }
  }, [result, router]);

  const hasJoined = members.map((c) => c.id).includes(userId);
  const inviteFriends = useMemo(
    () => {
      const allMembers = [invited_by, ...members];
      const seenMemberIds = new Set<T.Contact["id"]>();
      const uniqueMembers = [];
      for (const member of allMembers) {
        if (!seenMemberIds.has(member.id)) {
          uniqueMembers.push(member);
          seenMemberIds.add(member.id);
        }
      }
      return uniqueMembers.sort((a, b) => a.name.localeCompare(b.name));
    },
    [invited_by, members],
  );

  const [isCopying, setIsCopying] = useState(false);
  const copyInviteCode = useCallback(() => {
    setIsCopying(true);
    Clipboard.setStringAsync(invite_link.code);
    setTimeout(() => {
      setIsCopying(false);
    }, 2000);
  }, [invite_link.code]);

  return (
    <View style={{ backgroundColor: colors.rowBackground, flex: 1 }}>
      <UniversalHeader title="Invite to Gatz" />
      <View style={{ padding: 16 }}>
        <View style={{ marginTop: 8, marginBottom: 20 }}>
          <Text style={[styles.message, { marginVertical: 16, color: colors.primaryText }]}>
            <Text>You've been invited to Gatz by </Text>
            <Text style={{ fontWeight: "600" }}>@{invited_by.name}</Text>
          </Text>
          <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.message, { color: colors.primaryText }]}>
              <Text style={{ color: colors.primaryText }}>
                The invite code is{' '}
              </Text>
              <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
                {invite_link.code}
              </Text>
            </Text>
            <TouchableOpacity onPress={copyInviteCode}>
              {isCopying ? (
                <MaterialIcons name="check" size={18} color={colors.primaryText} />
              ) : (
                <MaterialIcons name="content-copy" size={18} color={colors.primaryText} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.message, { color: colors.primaryText }]}>
            If you join this invite, you will become friends with:
          </Text>
        </View>
        <View style={[
          styles.flatListContainer,
          {
            minHeight: 50,
            marginBottom: 12,
            backgroundColor: colors.appBackground,
            justifyContent: "center",
          }
        ]}>
          <NonSelectableRow title="New people that accept this invite" />
        </View>
        <View style={[
          styles.flatListContainer,
          { marginBottom: 12, backgroundColor: colors.appBackground },
        ]}>
          {inviteFriends.map((c, i) => {
            return <ContactRow key={c.id} index={i} item={c} lastIndex={members.length - 1} />;
          })}
        </View>
        <View style={{ marginTop: 8, marginBottom: 24 }}>
          <Text style={[styles.message, { marginTop: 4, marginBottom: 12, color: colors.primaryText }]}>
            You’ll see their posts and their friends’ posts from the last month
          </Text>
          <Text style={[styles.message, { color: colors.primaryText }]}>
            They'll see your posts and your friends’ posts from the last month
          </Text>
        </View>
        <View>
          {hasJoined ?
            <Text style={[styles.message, { marginTop: 12, color: colors.primaryText }]}>
              You've already accepted their invite
            </Text>
            : loading ? (
              <ActivityIndicator size="large" color={colors.active} />
            ) : (
              <Button title="Join them" color={colors.active} onPress={execute} />
            )}
        </View>
        <Text style={[
          styles.message,
          {
            marginTop: 24,
            marginBottom: 12,
            color: colors.secondaryText,
          }
        ]}>
          This invite expires on {renderDateText(invite_link.expires_at)}
        </Text>
      </View>
    </View>
  );
};

const useJoinInvite = (inviteLinkId: T.InviteLink["id"]) => {
  const { gatzClient } = useContext(ClientContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T.InviteLinkResponse | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      const result = await gatzClient.joinInvite(inviteLinkId);
      setResult(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [gatzClient, inviteLinkId]);

  return { loading, error, result, execute };
}

const GroupCrewInvite = ({
  invite_link,
  invited_by,
  members,
  group,
}: {
  invite_link: T.InviteLink;
  invited_by: T.Contact;
  members: T.Contact[];
  group: T.Group;
}) => {
  const router = useDebouncedRouter();
  const { session: { userId } } = useContext(SessionContext);
  const colors = useThemeColors();

  const {
    result: hasJoinedInvite,
    error: failedToJoin,
    loading: loadingInvite,
    execute: joinInvite,
  } = useJoinInvite(invite_link.id);

  useEffect(() => {
    if (failedToJoin) {
      if (Platform.OS === "web") {
        alert("There was an error accepting this invite");
      } else {
        Alert.alert("Error", "There was accepting this invite");
      }
    }
  }, [failedToJoin]);

  const navToGroup = useCallback(() => {
    router.replace(`/group/${group.id}`);
  }, [router, group.id]);

  useEffect(() => {
    if (hasJoinedInvite) {
      // TODO: I want to go to the group first
      navToGroup();
    }
  }, [navToGroup, hasJoinedInvite]);


  const hasJoined = members.map((c) => c.id).includes(userId);

  const HasJoinedUI = () => {
    return (
      <>
        <View style={{ marginTop: 12 }}>
          <Text
            style={[
              styles.message,
              { color: colors.primaryText, marginVertical: 12 },
            ]}
          >
            <Text style={{ color: colors.primaryText }}>
              You were invited to this group by{" "}
            </Text>
            <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
              @{invited_by.name}
            </Text>
          </Text>
          <Text
            style={[
              styles.message,
              { color: colors.primaryText, marginBottom: 12 },
            ]}
          >
            You already accepted their invitation
          </Text>
        </View>
        <Button title="View group" color={colors.active} onPress={navToGroup} />
      </>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
      <UniversalHeader title={`Invite to ${group.name}`} />
      <View style={{ padding: 16 }}>
        <View style={styles.row}>
          <BigGroupCard group={group} />
        </View>
        {hasJoined ? (
          <HasJoinedUI />
        ) : (
          <>
            <View style={{ marginTop: 12 }}>
              <Text
                style={[
                  styles.message,
                  { color: colors.primaryText, marginVertical: 12 },
                ]}
              >
                <Text style={{ color: colors.primaryText }}>
                  You've been invited to this group by{" "}
                </Text>
                <Text style={{ fontWeight: "600" }}>@{invited_by.name}</Text>
              </Text>
              <Text
                style={[
                  styles.message,
                  { color: colors.primaryText, marginBottom: 12 },
                ]}
              >
                If you join this group, you will become friends with everybody
                in it.
              </Text>
            </View>
            <View>
              {loadingInvite ? (
                <ActivityIndicator size="large" color={colors.active} />
              ) : (
                <Button
                  title={`Join some new friends (${members.length})`}
                  color={colors.active}
                  onPress={joinInvite}
                />
              )}
            </View>
          </>
        )}
        <Text
          style={[
            styles.message,
            { color: colors.primaryText, marginTop: 12, marginBottom: 24 },
          ]}
        >
          New people that join the group will become your friends too.
        </Text>
        {/* <Text style={[styles.message, { marginTop: 12, marginBottom: 24 }]}>
        This invitation expires on {renderDateText(invite_link.expires_at)}
      </Text> */}

        {members.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              Members so far ({members.length})
            </Text>
            <View style={[styles.flatListContainer, { marginBottom: 12 }]}>
              {members.map((c, i) => {
                return <ContactRow key={c.id} index={i} item={c} lastIndex={members.length - 1} />;
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
const GroupInvite = ({
  group,
  invite_link,
  invited_by,
}: {
  group: T.Group;
  invite_link: T.InviteLink;
  invited_by: T.Contact;
}) => {
  const router = useDebouncedRouter();
  const colors = useThemeColors();

  const { result, error, loading, execute } = useJoinInvite(invite_link.id);

  useEffect(() => {
    if (error) {
      if (Platform.OS === "web") {
        alert("There was an error joining the group");
      } else {
        Alert.alert("Error", "There was an error joining the group");
      }
    }
  }, [error]);

  useEffect(() => {
    if (result) {
      router.replace(`/group/${group.id}`);
    }
  }, [result, router, group.id]);

  // If I am already a member, go straight to the group
  // useEffect(() => {
  //   if (group) {
  //     const members = new Set(group.members);
  //     if (members.has(userId)) {
  //       router.replace(`/group/${group.id}`);
  //     }
  //   }
  // }, [userId, router, group]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
      <UniversalHeader title="Group invite" />
      <View style={{ padding: 16 }}>
        <View style={styles.row}>
          <BigGroupCard group={group} />
        </View>
        <View style={{ marginVertical: 12 }}>
          <Text
            style={[
              styles.message,
              {
                color: colors.primaryText,
                marginVertical: 4,
                marginBottom: 24,
              },
            ]}
          >
            <Text style={styles.message}>
              You've been invited to this group by{" "}
            </Text>
            <Text style={[styles.message, { fontWeight: "600" }]}>
              @{invited_by.name}
            </Text>
          </Text>
          {/* <Text style={[styles.message, { color: colors.primaryText, marginVertical: 4 }]}>
          This invitation expires on {renderDateText(invite_link.expires_at)}
        </Text> */}
        </View>
        <View>
          {loading ? (
            <ActivityIndicator size="large" color={colors.activityIndicator} />
          ) : (
            <Button
              title="Join group"
              color={colors.active}
              onPress={execute}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const ContactInvite = ({
  contact,
  invite_link,
  invited_by,
}: {
  contact: T.Contact;
  invite_link: T.InviteLink;
  invited_by: T.Contact;
}) => {
  const router = useDebouncedRouter();
  const colors = useThemeColors();

  const { result, error, loading, execute } = useJoinInvite(invite_link.id);

  useEffect(() => {
    if (error) {
      if (Platform.OS === "web") {
        alert("There was an error joining the group");
      } else {
        Alert.alert("Error", "There was an error joining the group");
      }
    }
  }, [error]);

  useEffect(() => {
    if (result) {
      router.replace(`/contact/${contact.id}`);
    }
  }, [result, router, contact.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
      <UniversalHeader title="Friend request" />
      <View style={{ flex: 1, padding: 16 }}>
        <View style={styles.row}>
          <UsernameWithAvatar size="medium" user={contact} />
        </View>
        <View style={{ marginVertical: 12 }}>
          <Text
            style={[
              styles.message,
              {
                marginVertical: 4,
                marginBottom: 24,
                color: colors.primaryText,
              },
            ]}
          >
            <Text style={styles.message}>You've been invited to Gatz by </Text>
            <Text style={[styles.message, { fontWeight: "600" }]}>
              @{invited_by.name}
            </Text>
          </Text>

          {/* <Text style={[styles.message, { marginVertical: 4 }]}>
          This invitation expires on {renderDateText(invite_link.expires_at)}
        </Text>
         */}
        </View>
        <View>
          {loading ? (
            <ActivityIndicator size="large" color={colors.activityIndicator} />
          ) : (
            <Button
              title="Become friends"
              color={colors.active}
              onPress={execute}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export const InnerInviteLinkScreen = ({ response }: { response: T.InviteLinkResponse }) => {

  const colors = useThemeColors();

  // TODO: handle if the invitation has already expired or used
  const appStoreURL = Platform.select({
    ios: APP_STORE_LINKS["ios"],
    android: APP_STORE_LINKS["android"],
  });

  const openAppStore = () => {
    Linking.openURL(appStoreURL).catch((err) =>
      console.error("Failed to open URL:", err),
    );
  }

  switch (response.type) {
    case "group": {
      return (
        <GroupInvite
          group={response.group}
          invite_link={response.invite_link}
          invited_by={response.invited_by}
        />
      );
    }

    case "contact": {
      return (
        <ContactInvite
          contact={response.contact}
          invite_link={response.invite_link}
          invited_by={response.invited_by}
        />
      );
    }

    case "crew": {
      if (response.group) {
        return (
          <GroupCrewInvite
            group={response.group}
            invite_link={response.invite_link}
            invited_by={response.invited_by}
            members={response.members}
          />
        );
      } else {
        return (
          <CrewInvite
            invite_link={response.invite_link}
            invited_by={response.invited_by}
            members={response.members}
          />
        );
      }
    }
    default: {
      return (
        <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
          <UniversalHeader title="Unknown invite" />
          <View style={{ padding: 16 }}>
            <Text style={[styles.message, { marginVertical: 16, color: colors.primaryText }]}>
              This version of the app can't handle this type of invite
            </Text>
            <Text style={[styles.message, { marginBottom: 16, color: colors.primaryText }]}>
              Please update to the latest version of the app and try again
            </Text>
            <TouchableOpacity onPress={openAppStore}>
              <Text
                style={[
                  styles.message,
                  { color: colors.active, textDecorationLine: "underline" },
                ]}
              >
                Go to app store
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }
};

export default function InviteLinkScreen({
  linkId,
  code,
}: {
  linkId?: T.InviteLink["id"];
  code?: T.InviteLink["code"];
}) {
  const colors = useThemeColors();
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);

  const { result, error, loading } = useAsync(async () => {
    const il = linkId ? db.getInviteLinkResponseById(linkId) : null;
    if (il) {
      return il;
    } else {
      return linkId ? gatzClient.getInviteLink(linkId) : gatzClient.getInviteByCode(code);
    }
  }, [gatzClient, linkId, code]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
        <UniversalHeader title="Invite" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.activityIndicator} />
        </View>
      </View>
    );
  } else if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.contrastBackground }}>
        <UniversalHeader title="Invite" />
        <Text style={{ margin: 12, color: colors.primaryText }}>
          There was an error fetching the invite link
        </Text>
      </View>
    );
  } else {
    return <InnerInviteLinkScreen response={result} />;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  flatListContainer: { borderRadius: 10, },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  message: { fontSize: 16 },
});
