import React, { useEffect, useState, useCallback, useContext, useMemo } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { useAsync } from "react-async-hook";

import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { useProductAnalytics } from "../sdk/posthog";

import * as T from "../gatz/types";
import { SessionContext } from "../context/SessionProvider";
import { ClientContext } from "../context/ClientProvider";

import GiftedAvatar from "../gifted/GiftedAvatar";
import { assertNever, isMobile } from "../util";
import { useDebouncedRouter } from "../context/debounceRouter";

import { Row as ContactRow } from "../components/contacts";
import TouchableOpacityItem from "../components/TouchableOpacityItem";
import { UniversalHeader } from "../components/Header";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { FrontendDBContext } from "../context/FrontendDBProvider";

// Profile URLs

const PROFILE_ICONS = {
  Name: "person",
  Website: "insert-link",
  Twitter: "alternate-email"
} as const;

const PROFILE_ICONS_SIZE = {
  Name: 20,
  Website: 20,
  Twitter: 18
} as const;

type ProfileType = keyof typeof PROFILE_ICONS;

const FullName = ({ text }: { text: string }) => {
  const colors = useThemeColors();
  if (!text) return null;
  return (
    <View style={[styles.spacedRow, { marginBottom: 12 }]}>
      <MaterialIcons
        size={PROFILE_ICONS_SIZE.Name}
        name={PROFILE_ICONS.Name}
        color={colors.primaryText}
      />
      <Text style={{ fontSize: 16, color: colors.primaryText }}>
        {text}
      </Text>
    </View>
  );
}

const ProfileUrl = ({ type, value }: { type: ProfileType; value?: string }) => {
  const colors = useThemeColors();

  if (!value) return null;
  return (
    <View style={[styles.spacedRow, { marginBottom: 12 }]}>
      <MaterialIcons
        size={PROFILE_ICONS_SIZE[type]}
        name={PROFILE_ICONS[type]}
        color={colors.primaryText}
      />
      <TouchableOpacity
        onPress={() => {
          const url = type === "Twitter"
            ? `https://twitter.com/${value.replace('@', '')}`
            : value.startsWith("http") ? value : `https://${value}`;
          Linking.openURL(url);
        }}
      >
        <Text style={{ fontSize: 16, color: colors.active, textDecorationLine: "underline" }}>
          {value}
        </Text>
      </TouchableOpacity>
    </View>
  );
};


const BigContactCard = ({ contact }: { contact: T.Contact }) => {
  const colors = useThemeColors();
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          marginRight: 4,
          alignItems: "center",
        }}
      >
        <GiftedAvatar user={contact} size="hero" />
        <Text
          style={[
            {
              marginLeft: 12,
              fontWeight: "600",
              fontSize: 24,
              color: colors.primaryText,
            },
          ]}
        >
          {contact.name}
        </Text>
      </View>
    </View>
  );
};

const keyExtractor = (item: T.Contact) => item.id;

const Button = ({
  title, onPress, color, icon,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  color?: string;
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.buttonContainer,
        { backgroundColor: colors.appBackground },
      ]}
    >
      {icon && (
        <MaterialIcons
          size={20}
          name={icon}
          color={color || colors.primaryText}
        />
      )}
      <Text style={[styles.buttonText, { color: color || colors.primaryText }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const CollapseNotice = ({ children, title }: { title: React.JSX.Element; children: React.ReactNode; }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
        {title}
      </TouchableOpacity>
      {isOpen && children}
    </View>
  );
};

const ContactRequest = ({ contactId, state, makeRequest, toFeed, toDM, }: {
  contactId: string;
  state: T.ContactRequestState;
  makeRequest: (request_action: T.ContactRequestActionType) => Promise<any>;
  toFeed: () => void;
  toDM: () => void;
}) => {
  const colors = useThemeColors();
  const { session: { userId } } = useContext(SessionContext);
  const isSelf = userId === contactId;

  if (isSelf) {
    return null;
  }

  switch (state) {
    case "none": {
      return (
        <View style={styles.sectionOuter}>
          <Button
            title="Request friend"
            color={colors.active}
            onPress={() => makeRequest("requested")}
          />
        </View>
      );
    }
    case "accepted": {
      return (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", }}          >
            <MaterialIcons name="check" size={18} color={colors.greyText} />
            <Text style={{ marginLeft: 4, color: colors.primaryText }}>
              They are one of your friends
            </Text>
          </View>
          <View style={styles.sectionOuter}>
            <View style={[styles.buttonRow, { gap: 24 }]}>
              <View style={{ flex: 1 }}>
                <Button title="View posts" onPress={toFeed} />
              </View>
              <View style={{ flex: 1 }}>
                <Button icon="email" title="Direct Message" onPress={toDM} />
              </View>
            </View>
          </View>
        </>
      );
    }
    case "response_pending_from_viewer": {
      return (
        <View style={styles.sectionOuter}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Friend request
          </Text>
          <View style={styles.buttonRow}>
            <View style={styles.buttonGap}>
              <Button
                title="Ignore"
                color={colors.secondaryText}
                onPress={() => makeRequest("ignored")}
              />
            </View>
            <View style={styles.buttonGap}>
              <Button
                title="Accept"
                color={colors.active}
                onPress={() => makeRequest("accepted")}
              />
            </View>
          </View>
          <CollapseNotice
            title={
              <Text style={{ fontSize: 16, color: colors.primaryText }}>
                What does this mean?
              </Text>
            }
          >
            <Text style={{ marginTop: 8, color: colors.primaryText }}>
              If you accept this request, you'll be able to include each other
              on posts.
            </Text>
            <Text style={{ marginTop: 8, color: colors.primaryText }}>
              They won't be notified whether you accept or ignore this request.
            </Text>
            <Text style={{ marginTop: 8, color: colors.primaryText }}>
              You can always silently remove them from your friends or mute
              them if you regret this.
            </Text>
          </CollapseNotice>
        </View>
      );
    }
    case "viewer_awaits_response": {
      return null;
    }
    case "viewer_ignored_response": {
      return null;
    }
    case "self" as any: {
      return null;
    }
    default:
      assertNever(state);
  }
};

export const PressableContactRow = (
  { lastIndex, index, contact, onPressAvatar, }:
    {
      lastIndex: number;
      index: number;
      contact: T.Contact;
      onPressAvatar: (contactId: T.Contact["id"]) => void;
    }) => {
  return (
    <TouchableOpacityItem onPress={() => onPressAvatar(contact.id)}>
      <ContactRow lastIndex={lastIndex} index={index} item={contact} />
    </TouchableOpacityItem>
  );
};

export const ContactList = (
  { contacts, onPressAvatar, }: {
    contacts: T.Contact[];
    onPressAvatar: (contactId: T.Contact["id"]) => void;
  }
) => {
  const colors = useThemeColors();
  const renderContact = useCallback(
    ({ item, index, lastIndex, }: { item: T.Contact; index: number; lastIndex: number; }) => (
      <PressableContactRow contact={item} onPressAvatar={onPressAvatar} lastIndex={lastIndex} index={index} />
    ),
    [onPressAvatar],
  );

  const sortedContacts = useMemo(() => contacts.sort((a, b) => a.name.localeCompare(b.name)), [contacts]);
  const lastIndex = sortedContacts.length - 1

  return (
    <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
      <FlatList<T.Contact>
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        data={sortedContacts}
        renderItem={({ item, index }) => renderContact({ item, index, lastIndex })}
      />
    </View>
  );
};

export const ContactScreen = ({ uid, onDesktopClose }: { uid?: string; onDesktopClose?: () => void } = {}) => {
  const params = useLocalSearchParams();
  const contactId = uid || (params.uid as string);

  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);

  const analytics = useProductAnalytics();

  useEffect(() => {
    analytics.capture("contact.viewed", { contact_id: contactId });
  }, [analytics, contactId]);

  const { session: { userId } } = useContext(SessionContext);
  const isSelf = userId === contactId;

  const [state, setState] = useState<T.ContactRequestState>();
  const [isHidden, setIsHidden] = useState(false);
  const [isLoadingHidden, setIsLoadingHidden] = useState(false);

  const { result, loading, error } = useAsync(async () => {
    const r = await gatzClient.getContact(contactId);
    if (r.contact_request_state) {
      if (r.contact_request_state === "accepted") {
        db.addUser(r.contact)
        db.addContactId(contactId);
      }
      if (r.settings.posts_hidden) {
        setIsHidden(true);
      }
      setState(r.contact_request_state);
    }
    return r;
  }, [gatzClient, contactId, setState, db]);

  const onToggleMute = useCallback(async () => {
    try {
      setIsLoadingHidden(true);
      if (isHidden) {
        await gatzClient.unhideContact(contactId);
        setIsHidden(false);
      } else {
        await gatzClient.hideContact(contactId);
        setIsHidden(true);
      }
    } catch (e) {
      Alert.alert(
        "Error",
        "Failed to update mute settings. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoadingHidden(false);
    }
  }, [isHidden, contactId, gatzClient, db]);

  const renderMuteButton = () => (
    <View style={styles.sectionOuter}>
      <Button
        icon={isLoadingHidden ? "refresh" : isHidden ? "visibility" : "visibility-off"}
        title={isLoadingHidden ? "Loading..." : isHidden ? "Show their posts" : "Hide their posts"}
        color={isLoadingHidden ? colors.strongGrey : isHidden ? colors.active : colors.strongGrey}
        onPress={onToggleMute}
      />
      {isHidden && (
        <Text style={{ fontSize: 16, marginTop: 8, color: colors.secondaryText }}>
          Their posts are hidden. You won't see them on your feed.
        </Text>
      )}
    </View>
  );

  const onPressAvatar = useCallback(
    (userId: T.Contact["id"]) => router.push(`/contact/${userId}`),
    [router],
  );

  const renderContact = useCallback(
    ({
      item,
      index,
      lastIndex,
    }: {
      item: T.Contact;
      index: number;
      lastIndex: number;
    }) => (
      <TouchableOpacityItem onPress={() => onPressAvatar(item.id)}>
        <ContactRow lastIndex={lastIndex} index={index} item={item} />
      </TouchableOpacityItem>
    ),
    [onPressAvatar],
  );

  // XXX: this is not being debounced properly
  const toFeed = useCallback(
    () => router.push(`/contact/${contactId}/feed`),
    [router.push, contactId],
  );

  const toDM = useCallback(
    () => router.push(`/post?contact_id=${contactId}`),
    [router.push, contactId],
  );

  // TODO: if there was an error, show it
  // TODO: show the new state, whatever that is
  const makeRequest = useCallback(
    async (request_action: T.ContactRequestActionType) => {
      const r = await gatzClient.makeContactRequest(contactId, request_action);
      if (r.error) {
        Alert.alert(
          "There was an error",
          r.error,
          [{ text: "Ok", onPress: () => { } }],
          { cancelable: true },
        );
      } else {
        const { state: new_state } = r;
        setState(new_state);
        db.removePendingContactRequest(r.id);
      }
      return r;
    },
    [gatzClient, contactId, setState],
  );

  const blockUser = useCallback(async () => {
    await gatzClient.blockUser(contactId);
    try {
      Alert.alert(
        "User blocked",
        "They won't be able to contact you again or see your posts.",
        [{ text: "Ok", onPress: () => router.replace("/") }],
      );
      router.replace("/");
    } catch (e) {
      Alert.alert(
        "There was an unknown error",
        "Please try again later",
        [{ text: "Ok", onPress: () => { } }],
        { cancelable: true },
      );
    }
  }, [gatzClient, contactId, router]);

  const colors = useThemeColors();

  const onBlockUser = useCallback(() => {
    Platform.select({
      web: () => {
        if (confirm("Are you sure?")) {
          blockUser();
        }
      },
      default: () => {
        Alert.alert(
          "Are you sure you want to block them?",
          "They won't be able to contact you again or see your posts.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Block", style: "destructive", onPress: () => blockUser(), },
          ],
          { cancelable: true },
        );
      },
    })();
  }, [blockUser]);

  const onRemoveFromFriends = useCallback(() => {
    Platform.select({
      web: () => {
        if (confirm("Are you sure?")) {
          makeRequest("removed");
        }
      },
      default: () => {
        Alert.alert(
          "Are you sure?",
          "If you want to re-add them, you'll have to request to be their friend",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => makeRequest("removed"), },
          ],
          { cancelable: true },
        );
      },
    })();
  }, [makeRequest]);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return (
      <View style={{ flex: 1 }}>
        <UniversalHeader 
          title="Profile"
          headerLeft={
            !isMobile() && onDesktopClose
              ? () => (
                <TouchableOpacity onPress={onDesktopClose}>
                  <MaterialIcons
                    name="close"
                    color={colors.strongGrey}
                    size={24}
                  />
                </TouchableOpacity>
              )
              : undefined
          }
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: colors.primaryText }}>There was an error</Text>
        </View>
      </View>
    );
  }

  const { contact, their_contacts, in_common: { contacts } } = result;

  return (
    <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
      <UniversalHeader 
        title="Profile"
        headerLeft={
          !isMobile() && onDesktopClose
            ? () => (
              <TouchableOpacity onPress={onDesktopClose}>
                <MaterialIcons
                  name="close"
                  color={colors.strongGrey}
                  size={24}
                />
              </TouchableOpacity>
            )
            : undefined
        }
      />
      <ScrollView>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={styles.spacedRow}>
            <BigContactCard contact={contact} />
          </View>
          <View style={styles.sectionOuter}>
            <View>
              <FullName text={contact.profile?.full_name} />
            </View>
            <View>
              <ProfileUrl type="Website" value={contact.profile?.urls?.website} />
            </View>
            <View>
              <ProfileUrl type="Twitter" value={contact.profile?.urls?.twitter} />
            </View>
          </View>

          {renderMuteButton()}

          <ContactRequest
            contactId={contactId}
            state={state}
            makeRequest={makeRequest}
            toFeed={toFeed}
            toDM={toDM}
          />

          {contacts.length > 0 ? (
            <View style={styles.sectionOuter}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                {isSelf
                  ? "Friends"
                  : `Friends in common (${contacts.length})`}
              </Text>
              <ContactList contacts={contacts} onPressAvatar={onPressAvatar} />
            </View>
          ) : (
            <View style={styles.sectionOuter}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                No common friends
              </Text>
            </View>
          )}

          {!isSelf && their_contacts && their_contacts.length > 0 ? (
            <View style={styles.sectionOuter}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Their friends ({their_contacts.length})
              </Text>
              <ContactList contacts={their_contacts} onPressAvatar={onPressAvatar} />
            </View>
          ) : null}

          {!isSelf && state === "accepted" && (
            <View style={styles.sectionOuter}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Danger
              </Text>
              <Button
                title="Remove from friends"
                color={colors.danger}
                onPress={onRemoveFromFriends}
              />
              <Text style={{ marginTop: 8, marginBottom: 18, color: colors.primaryText }}              >
                If you remove them, you can add them back later but they'll have
                to accept your request.
              </Text>
              <Button title="Block" color={colors.danger} onPress={onBlockUser} />
              <Text style={{ marginTop: 8, marginBottom: 18, color: colors.primaryText }}>
                If you block them, they won't be able to contact you again and
                you won't see their posts or comments.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flatListContainer: {
    borderRadius: 10,
  },
  sectionOuter: { marginVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  buttonGap: { marginRight: 12, flex: 1 },
  buttonContainer: {
    minWidth: 100,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    justifyContent: "center",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
  },
  spacedRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
});
