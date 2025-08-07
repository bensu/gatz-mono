import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

import dayjs from "dayjs";

import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import { SessionContext } from "../context/SessionProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { ClientContext } from "../context/ClientProvider";
import { useDebouncedRouter } from "../context/debounceRouter";

import { SimpleBottomSheet } from "./BottomSheet";
import { Row as ContactRow, GroupRow } from "./contacts";
import { isStillOpen } from "../util";
import TouchableOpacityItem from "./TouchableOpacityItem";
import { Platform } from "expo-modules-core";

const SettingsButton = ({
  onPress,
  title,
  icon,
  iconColor,
}: {
  title: string;
  icon: "notifications-active" | "notifications-off" | "loading";
  onPress?: () => void;
  iconColor: string;
}) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.appBackground }]}
      onPress={onPress}
    >
      {icon === "loading" ? (
        <ActivityIndicator size="small" color={colors.activityIndicator} />
      ) : (
        <MaterialIcons
          name={icon}
          size={20}
          color={iconColor || colors.active}
        />
      )}
      <Text style={[styles.buttonText, { color: colors.secondaryText }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const keyExtractor = (item: T.Contact) => item.id;

type Props = {
  discussion: T.Discussion;
  onClose: () => void;
  onPressAvatar: (userId: T.Contact["id"]) => void;
  isVisible: boolean;
  users: T.Contact[];
  group?: T.Group;
};

export const ContactsSheet = ({
  discussion,
  onClose,
  onPressAvatar,
  isVisible,
  users,
  group,
}: Props) => {
  const colors = useThemeColors();
  const did = discussion.id;
  const { session: { userId } } = useContext(SessionContext);
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const router = useDebouncedRouter();

  const myContacts = db.getMyContacts();

  const [user, setLocalUser] = useState<T.User | undefined>(db.getMe());
  const setUser = useCallback(
    (user: T.User) => {
      db.addUser(user);
      setLocalUser(user);
    },
    [db, setLocalUser],
  );

  useEffect(() => {
    const lid = db.addMeListener(setLocalUser);
    if (!user) {
      gatzClient.getMe().then((response) => {
        db.storeMeResult(response);
        setUser(response.user);
      });
    }
    return () => {
      db.removeMeListener(lid);
    }
  }, [user, db, gatzClient, setUser]);

  // ---------------------------
  // Subscribed to notifications

  const isSubscribed = useMemo(() => {
    return discussion.subscribers.filter((s) => s === userId).length > 0;
  }, [discussion.subscribers, userId]);

  const [isLoadingSubscribed, setIsLoadingSubscribed] = useState(false);

  const subscribedState = isLoadingSubscribed
    ? "loading"
    : isSubscribed
      ? "subscribed"
      : "unsubscribed";

  const alertToSettings = useCallback(() => {
    Alert.alert(
      "You need to enable notifications",
      "Please go to settings and enable notifications to subscribe to discussions.",
      [
        {
          text: "Go to settings",
          onPress: () => {
            onClose();
            router.push("/settings");
          },
        },
        { style: "cancel", text: "Cancel", onPress: () => { } },
      ],
      { cancelable: true },
    );
  }, [router.push]);

  const navToGroup = useCallback(() => {
    if (group) {
      onClose();
      router.push(`/group/${group.id}`);
    }
  }, [onClose, router.push, group]);

  const onToggleSubscribe = useCallback(async () => {
    if (subscribedState === "loading") {
      return;
    }
    try {
      setIsLoadingSubscribed(true);
      if (isSubscribed) {
        const r = await gatzClient.unsubscribeFromDiscussion(did);
        db.addDiscussion(r.discussion);
      } else {
        if (!user?.push_tokens?.expo) {
          alertToSettings();
          return;
        }
        const r = await gatzClient.subscribeToDiscussion(did);
        db.addDiscussion(r.discussion);
      }
    } finally {
      setIsLoadingSubscribed(false);
    }
  }, [user, subscribedState, gatzClient, setIsLoadingSubscribed]);

  const renderNotificationsButton = () => {
    switch (subscribedState) {
      case "subscribed":
        return (
          <SettingsButton
            icon="notifications-active"
            title="You get notified on every reply"
            iconColor={colors.active}
            onPress={onToggleSubscribe}
          />
        );
      case "loading":
        return (
          <SettingsButton
            iconColor={colors.strongGrey}
            icon="loading"
            title="Loading"
            onPress={onToggleSubscribe}
          />
        );

      case "unsubscribed":
        return (
          <SettingsButton
            iconColor={colors.strongGrey}
            icon="notifications-off"
            title="Muted"
            onPress={onToggleSubscribe}
          />
        );
    }
  };

  // ------------
  // Render users


  const [activeMembers, audienceInContacts, audienceNotInContacts] = useMemo(() => {
    const active = new Set(discussion.active_members);

    const nonMeUsers = users
      .filter((u) => u.id !== userId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const audience = nonMeUsers.filter((u) => !active.has(u.id));
    const audienceWithMe = active.has(userId) ? audience : [user, ...audience];

    const activeMembers = nonMeUsers.filter((u) => active.has(u.id));
    const activeMembersWithMe = !active.has(userId) ? [user, ...activeMembers] : activeMembers;

    const audienceInContacts = audienceWithMe.filter((c) => myContacts.has(c.id) || c.id == userId);

    const audienceNotInContacts = audienceWithMe.filter((c) => !myContacts.has(c.id) && c.id !== userId);

    return [activeMembersWithMe, audienceInContacts, audienceNotInContacts];
  }, [users, userId, discussion.active_members]);


  const renderContact = ({
    lastIndex,
    item,
    index,
  }: {
    lastIndex: number;
    item: T.Contact;
    index: number;
  }) => (
    <TouchableOpacityItem onPress={() => onPressAvatar(item.id)}>
      <ContactRow
        // onPress={() => onPressAvatar(item.id)}
        lastIndex={lastIndex}
        index={index}
        item={item}
      />
    </TouchableOpacityItem>
  );
  const isOpen = isStillOpen(discussion);

  let systemText = "";
  if (isOpen) {
    const today = dayjs();
    const daysToClose: number = dayjs(discussion.open_until).diff(
      today,
      "days",
    );
    const days =
      daysToClose === 7
        ? "week"
        : daysToClose <= 1
          ? "day"
          : `${daysToClose} days`;
    systemText = group
      ? `For the next ${days}, new ${group.name} members will join this chat. After that, it will be closed.`
      : discussion.member_mode === "friends_of_friends"
        ? `For the next ${days}, friends of friends of ${user.name} will join this chat. After that, it will be closed.`
        : `For the next ${days}, new friends of ${user.name} will join this chat. After that, it will be closed.`;
  }

  const title = discussion.public_mode === "public" ? "Public Discussion" : "Discussion"

  return (
    <SimpleBottomSheet isVisible={isVisible} onClose={onClose} title={title}>
      <View style={[styles.innerContainer, { backgroundColor: colors.rowBackground }]}>
        {Platform.OS !== "web" && (
          <View style={[styles.sectionOuter, { backgroundColor: colors.rowBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              Notifications
            </Text>
            <View style={[styles.subSection]}>
              {renderNotificationsButton()}
            </View>
          </View>
        )}
        {group && (
          <View style={[styles.sectionOuter]}>
            <Text style={[styles.sectionTitle, { marginBottom: 8, color: colors.primaryText }]}>
              Group
            </Text>
            <TouchableOpacity
              onPress={navToGroup}
              style={{ borderRadius: 10, backgroundColor: colors.appBackground, }}
            >
              <GroupRow index={0} item={group} lastIndex={0} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.sectionOuter, { backgroundColor: colors.rowBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Audience ({users.length})
          </Text>
          {isOpen && (
            <View style={styles.subSection}>
              <View style={styles.noticeRow}>
                <MaterialCommunityIcons
                  name="lock-open-variant-outline"
                  size={24}
                  color={colors.strongGrey}
                />
                <Text style={[styles.noticeText, { color: colors.secondaryText }]}>
                  {systemText}
                </Text>
              </View>
            </View>
          )}
          {activeMembers.length > 0 && (
            <View style={styles.subSection}>
              <Text style={[styles.subSectionTitle, { color: colors.primaryText }]}>
                Participating ({activeMembers.length})
              </Text>
              <View
                style={[
                  styles.flatListContainer,
                  { backgroundColor: colors.appBackground, borderRadius: 8 },
                ]}
              >
                <FlatList<T.Contact>
                  scrollEnabled={false}
                  keyExtractor={keyExtractor}
                  data={activeMembers}
                  renderItem={({ index, item }) =>
                    renderContact({ index, item, lastIndex: activeMembers.length - 1, })
                  }
                />
              </View>
            </View>
          )}
          {audienceNotInContacts.length !== 0 && (
            <View style={styles.subSection}>
              <Text style={[styles.subSectionTitle, { color: colors.primaryText }]}>
                Friends of friends ({audienceNotInContacts.length})
              </Text>
              <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
                <FlatList<T.Contact>
                  scrollEnabled={false}
                  keyExtractor={keyExtractor}
                  data={audienceNotInContacts}
                  renderItem={({ index, item }) =>
                    renderContact({ index, item, lastIndex: audienceNotInContacts.length - 1, })
                  }
                />
              </View>
            </View>
          )}
          {audienceInContacts.length !== 0 && (
            <View style={styles.subSection}>
              <Text style={[styles.subSectionTitle, { color: colors.primaryText }]}>
                Your friends ({audienceInContacts.length})
              </Text>
              <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}              >
                <FlatList<T.Contact>
                  scrollEnabled={false}
                  keyExtractor={keyExtractor}
                  data={audienceInContacts}
                  renderItem={({ index, item }) =>
                    renderContact({ index, item, lastIndex: audienceInContacts.length - 1, })
                  }
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </SimpleBottomSheet>
  );
};

const styles = StyleSheet.create({
  noticeText: {
    lineHeight: 18,
    flexShrink: 1,
  },
  noticeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    width: "100%",
  },
  sectionOuter: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 2 },
  subSectionTitle: { fontSize: 16, marginBottom: 6 },
  subSection: { marginVertical: 8 },
  container: { flex: 1, marginTop: 50 },
  innerContainer: { display: "flex", flexDirection: "column", flex: 1 },
  flatListContainer: { borderRadius: 10 },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,

    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: { marginLeft: 8, fontSize: 16 },
});
