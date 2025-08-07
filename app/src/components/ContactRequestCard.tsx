import React, { useMemo, useContext, useCallback, useState } from "react";
import { TouchableOpacity, StyleSheet, View, Text, ActivityIndicator, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import * as T from "../gatz/types";
import { Styles as GatzStyles } from "../gatz/styles";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { ClientContext } from "../context/ClientProvider";
import { UsernameWithAvatar } from "../gifted/GiftedAvatar";
import { IAvatar, Participants } from "./Participants";
import { useDebouncedRouter } from "../context/debounceRouter";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { assertNever, multiPlatformAlert } from "../util";


export const AcceptedInviteCard = ({ invite, feedItem }: { invite: T.HydratedInviteLink, feedItem: T.FeedItem }) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);

  const contact = invite.contact;
  const { contacts, groups } = invite.in_common;
  const anyContent = true;

  const contactsInCommon: T.Contact[] = useMemo(() => {
    return contacts.map((id) => db.getUserById(id));
  }, [db, contacts]);

  const groupsInCommon: T.Group[] = useMemo(() => {
    return groups.map((id) => db.getGroupById(id)).filter((g) => g !== null);
  }, [db, groups]);

  const navToProfile = useCallback(() => {
    router.push(`/contact/${contact.id}`);
  }, [router.push, contact.id]);

  const [isLoading, setIsLoading] = useState(false);

  const dismiss = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await gatzClient.dismissFeedItem(feedItem.id);
      if (r.item) {
        db.addFeedItem(r.item);
      } else {
        multiPlatformAlert("Error dismissing feed item");
      }
    } finally {
      setIsLoading(false);
    }
  }, [gatzClient, feedItem]);

  const welcomeThem = useCallback(async () => {
    setIsLoading(true);
    const encodedSeedText = encodeURIComponent(`Welcome @${contact.name}!`);
    try {
      router.push(`/post?seedText=${encodedSeedText}`);
    } finally {
      setIsLoading(false);
    }
  }, [gatzClient, contact]);

  return (
    <>
      <TouchableOpacity
        onPress={navToProfile}
        style={[
          styles.container,
          { backgroundColor: colors.appBackground },
          GatzStyles.card,
          GatzStyles.thinDropShadow,
        ]}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="check-circle" size={20} color={colors.strongGrey} />
          </View>
          <View style={{ padding: 4 }}>
            <View style={{ marginBottom: anyContent ? 8 : 0 }}>
              <UsernameWithAvatar
                size="small"
                user={contact}
                andMore="accepted your invite!"
              />
            </View>
            {contactsInCommon.length > 0 ? (
              <View style={[styles.innerRow, { marginBottom: 8 }]}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {contactsInCommon.length} friend
                  {contactsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={contactsInCommon} />
              </View>
            ) : (
              <View style={[styles.innerRow, { marginBottom: 8 }]}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You are now friends.
                </Text>
              </View>
            )}
            {groupsInCommon.length > 0 && (
              <View style={[styles.innerRow, { marginBottom: 8 }]}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {groupsInCommon.length} group
                  {groupsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={groupsInCommon as IAvatar[]} />
              </View>
            )}
            <View style={[styles.innerRow, { marginBottom: 8 }]}>
              <Text style={[styles.cardText, { color: colors.primaryText }]}>
                Do you want to introduce them to your friends?
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {
        isLoading ? (
          <View style={[styles.buttonRow, styles.floatingButtonRow, { justifyContent: "center" }]}>
            <ActivityIndicator size="small" color={colors.primaryText} />
          </View>
        ) : (
          <View style={[styles.buttonRow, styles.floatingButtonRow]}>
            <Button onPress={dismiss} title="Dismiss" color={colors.strongGrey} />
            <Button onPress={welcomeThem} title="Draft a welcome post" color={colors.active} />
          </View>
        )
      }
    </>
  );
};



export const NewContactCard = (
  { contact, in_common: { contacts, groups } }:
    { contact: T.Contact, in_common: { contacts: T.Contact["id"][], groups: T.Group["id"][] } }) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const router = useDebouncedRouter();

  const anyContent = contacts.length > 0 || groups.length > 0;

  const contactsInCommon: T.Contact[] = useMemo(() => {
    return contacts.map((id) => db.getUserById(id));
  }, [db, contacts]);

  const groupsInCommon: T.Group[] = useMemo(() => {
    return groups.map((id) => db.getGroupById(id)).filter((g) => g !== null);
  }, [db, groups]);

  const navToProfile = useCallback(() => {
    router.push(`/contact/${contact.id}`);
  }, [router.push, contact.id]);

  return (
    <TouchableOpacity
      onPress={navToProfile}
      style={[
        styles.container,
        {
          marginBottom: 16,
          backgroundColor: colors.appBackground
        },
        GatzStyles.card,
        GatzStyles.thinDropShadow,
      ]}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="check-circle" size={20} color={colors.strongGrey} />
        </View>
        <View style={{ padding: 4 }}>
          <View style={{ marginBottom: anyContent ? 8 : 0 }}>
            <UsernameWithAvatar
              size="small"
              user={contact}
              andMore="is now your friend!"
            />
          </View>
          {contactsInCommon.length > 0 && (
            <View style={styles.innerRow}>
              <Text style={[styles.cardText, { color: colors.primaryText }]}>
                You have {contactsInCommon.length} friend
                {contactsInCommon.length > 1 && "s"} in common
              </Text>
              <Participants size="tiny" users={contactsInCommon} />
            </View>
          )}
          {groupsInCommon.length > 0 && (
            <View style={styles.innerRow}>
              <Text style={[styles.cardText, { color: colors.primaryText }]}>
                You have {groupsInCommon.length} group
                {groupsInCommon.length > 1 && "s"} in common
              </Text>
              <Participants size="tiny" users={groupsInCommon as IAvatar[]} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type Props = { feedItem: T.FeedItem };

const RequestedContactCard = ({ feedItem }: Props) => {
  const contact_request = feedItem.ref as T.HydratedContactRequest;
  const { contacts, groups } = contact_request.in_common;

  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const router = useDebouncedRouter();
  const colors = useThemeColors();

  const navToProfile = useCallback(() => {
    router.push(`/contact/${contact_request.from}`);
  }, [router.push, contact_request.from]);

  const fromUser: T.Contact = useMemo(() => {
    return db.getUserById(contact_request.from);
  }, [db, contact_request.from]);

  const contactsInCommon: T.Contact[] = useMemo(() => {
    return contacts.map((id) => db.getUserById(id));
  }, [db, contacts]);

  const groupsInCommon: T.Group[] = useMemo(() => {
    return groups.map((id) => db.getGroupById(id)).filter((g) => g !== null);
  }, [db, groups]);

  const [isLoading, setIsLoading] = useState(false);

  // TODO: handle errors
  const acceptRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await gatzClient.makeContactRequest(contact_request.from, "accepted");
      if ("error" in r) {
        multiPlatformAlert("Error accepting request", r.error);
      } else {
        const fi = db.getFeedItemById(feedItem.id);
        const feedItemType = fi.feed_type;
        if (feedItemType === "new_request") {
          fi.ref.state = "accepted";
        }
        db.removePendingContactRequest(contact_request.id);
        db.addFeedItem(fi);
      }
    } finally {
      setIsLoading(false);
    }
  }, [db, gatzClient, contact_request, feedItem]);

  // TODO: handle errors
  const ignoreRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await gatzClient.makeContactRequest(contact_request.from, "ignored");
      if ("error" in r) {
        multiPlatformAlert("Error ignoring request", r.error);
      } else {
        const fi = db.getFeedItemById(feedItem.id);
        const feedItemType = fi.feed_type;
        if (feedItemType === "new_request") {
          fi.ref.state = "viewer_ignored_response";
        }
        db.removePendingContactRequest(contact_request.id);
        db.addFeedItem(fi);
      }
    } finally {
      setIsLoading(false);
    }
  }, [db, gatzClient, contact_request, feedItem]);

  const anyContent = contactsInCommon.length > 0 || groupsInCommon.length > 0;
  return (
    <>
      <TouchableOpacity
        onPress={navToProfile}
        style={[
          styles.container,
          {
            marginBottom: 4,
            backgroundColor: colors.appBackground
          },
          GatzStyles.card,
          GatzStyles.thinDropShadow,
        ]}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="person-add" size={24} color={colors.strongGrey} />
          </View>
          <View style={{ padding: 4 }}>
            <View style={{ marginBottom: anyContent ? 8 : 0 }}>
              <UsernameWithAvatar
                size="small"
                user={{
                  ...fromUser,
                  name: fromUser.name,
                }}
                andMore="wants to be your friend"
              />
            </View>
            {contactsInCommon.length > 0 && (
              <View style={styles.innerRow}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {contactsInCommon.length} friend
                  {contactsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={contactsInCommon} />
              </View>
            )}
            {groupsInCommon.length > 0 && (
              <View style={styles.innerRow}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {groupsInCommon.length} group
                  {groupsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={groupsInCommon as IAvatar[]} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      {isLoading ? (
        <View style={[styles.buttonRow, styles.floatingButtonRow, { justifyContent: "center" }]}>
          <ActivityIndicator size="small" color={colors.primaryText} />
        </View>
      ) : (
        <View style={[styles.buttonRow, styles.floatingButtonRow]}>
          <Button onPress={ignoreRequest} title="Ignore" color={colors.strongGrey} />
          <Button onPress={acceptRequest} title="Become friends" color={colors.active} />
        </View>
      )}
    </>
  );
};

export const Button = ({
  title,
  onPress,
  color,
}: {
  color: string;
  title: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity style={buttonStyles.button} onPress={onPress}>
      <Text style={[buttonStyles.text, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  button: {
    flex: 1,
    padding: 6,
    paddingHorizontal: 12,
  },
  text: {
    justifyContent: "center",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
});

export const ContactRequestCard = ({ feedItem }: Props) => {
  const { db } = useContext(FrontendDBContext);

  const contact_request = feedItem.ref as T.HydratedContactRequest;
  const state = contact_request.state;

  if (state === "accepted") {
    const contact = db.getUserById(contact_request.from);
    return <NewContactCard contact={contact} in_common={contact_request.in_common} />
  } else if (state === "response_pending_from_viewer") {
    return <RequestedContactCard feedItem={feedItem} />
  } else if (state === "viewer_awaits_response") {
    return null;
  } else if (state === "viewer_ignored_response") {
    return null;
  } else if (state === "none") {
    return null;
  } else {
    assertNever(state);
  }

};

const styles = StyleSheet.create({
  floatingButtonRow: {
    height: 32,
    marginHorizontal: 4,
    marginTop: 0,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 32,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  cardText: { fontSize: 16, lineHeight: 20 },
  container: {
    position: "relative",
    flex: 1,
    marginTop: 0,
    marginHorizontal: 4,
  },
  iconContainer: {
    position: 'absolute',
    top: 6,
    right: 8,
    zIndex: 1,
  },
});
