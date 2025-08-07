import { useMemo, useState, useContext, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useAsync } from "react-async-hook";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { useProductAnalytics } from "../../../sdk/posthog";

import { Styles as GatzStyles } from "../../../gatz/styles";
import * as T from "../../../gatz/types";

import { useDebouncedRouter } from "../../../context/debounceRouter";
import { ClientContext } from "../../../context/ClientProvider";
import { FrontendDBContext } from "../../../context/FrontendDBProvider";

import { SearchBar } from "../../../components/SearchInput";
import { UniversalHeader, HeaderTitleWithIcon } from "../../../components/Header";
import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { ContactList, ContactScreen } from "../../../components/ContactScreen";
import { isMobile } from "../../../util";
import { DesktopFlexibleLayout } from "../../../components/DesktopFlexibleLayout";

export default function Contacts() {
  const { gatzClient } = useContext(ClientContext);
  const analytics = useProductAnalytics();
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const selectedContactId = params.uid as string | undefined;

  const { error, loading, result } = useAsync(async () => {
    analytics.capture("contacts.viewed");
    const r = await gatzClient.getContacts();
    if (r.user) {
      db.storeMeResult({
        user: r.user,
        contacts: r.contacts,
        contact_requests: r.contact_requests,
      });
    }
    return r;
  }, [gatzClient, db]);

  const router = useDebouncedRouter();
  const onPressContact = useCallback(
    (userId: T.Contact["id"]) => {
      if (isMobile()) {
        router.push(`/contact/${userId}`);
      } else {
        router.replace(`/friends?uid=${userId}`);
      }
    },
    [router],
  );
  
  const onDesktopClose = useCallback(() => router.replace("/friends"), [router]);

  const sortedContacts: T.Contact[] | undefined = useMemo(() => {
    if (result && result.contacts) {
      return result.contacts.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [result]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts: T.Contact[] | undefined = useMemo(() => {
    if (sortedContacts) {
      return sortedContacts.filter((contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }, [sortedContacts, searchTerm]);

  const filteredFriendsOfFriends: T.Contact[] | undefined = useMemo(() => {
    if (result && result.friends_of_friends) {
      return result.friends_of_friends.filter((contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }, [result, searchTerm]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}  >
        <Text style={{ color: colors.primaryText }}>Loading error</Text>
        <Text style={{ color: colors.primaryText }}>
          Please try again later
        </Text>
      </View>
    );
  }

  const { contact_requests, friends_of_friends } = result;

  const FriendsList = () => (
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
        <HeaderTitleWithIcon title="Friends" iconName="people-outline" />
      </UniversalHeader>
      <ScrollView>
        {contact_requests && contact_requests.length > 0 && (
          <View style={styles.sections}>
            <View style={styles.section}>
              <Text style={[styles.title, { color: colors.primaryText }]}>
                Friend requests ({contact_requests.length})
              </Text>
              <ContactList
                contacts={contact_requests.map(({ contact }) => contact)}
                onPressAvatar={onPressContact}
              />
            </View>
          </View>
        )}

        <View style={styles.sections}>
          <View style={{ marginBottom: 20 }}>
            <SearchBar
              placeholder="Search"
              onChangeText={setSearchTerm}
              onClear={() => setSearchTerm("")}
              value={searchTerm}
            />
          </View>
          {filteredContacts && filteredContacts.length > 0 ? (
            <View style={[styles.section, styles.flatListContainer]}>
              <View style={[styles.sectionRow]}>
                <MaterialIcons name="person" size={24} color={colors.primaryText} />
                <Text style={[styles.simpleTitle, { color: colors.primaryText }]}>
                  Friends ({filteredContacts.length})
                </Text>
              </View>
              <ContactList contacts={filteredContacts} onPressAvatar={onPressContact} />
            </View>
          ) : searchTerm.length > 0 ?
            <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
              No friends matching "{searchTerm}"
            </Text>
            : (
              <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                No friends yet
              </Text>
            )
          }
          {filteredFriendsOfFriends && filteredFriendsOfFriends.length > 0 ? (
            <View style={[styles.section, styles.flatListContainer]}>
              <View style={[styles.sectionRow]}>
                <MaterialIcons name="people-alt" size={24} color={colors.primaryText} />
                <Text style={[styles.simpleTitle, { color: colors.primaryText }]}>
                  Friends of friends ({filteredFriendsOfFriends.length})
                </Text>
              </View>
              <ContactList contacts={filteredFriendsOfFriends} onPressAvatar={onPressContact} />
            </View>
          ) : searchTerm.length > 0 ?
            <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
              No friends of friends matching "{searchTerm}"
            </Text>
            : (
              <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                No friends of friends yet
              </Text>
            )
          }
        </View>
      </ScrollView>
    </View>
  );

  if (isMobile()) {
    return <FriendsList />;
  } else {
    return (
      <DesktopFlexibleLayout
        selectedId={selectedContactId}
        onClose={onDesktopClose}
        renderRightPanel={(uid) => <ContactScreen key={uid} uid={uid} onDesktopClose={onDesktopClose} />}
        emptyStateMessage="Select a friend to view their profile"
      >
        <FriendsList />
      </DesktopFlexibleLayout>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  leftColumn: {
    maxWidth: 600,
    borderRightColor: GatzStyles.platformSeparator.backgroundColor,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flatListContainer: { borderRadius: 10 },
  sectionRow: {
    flex: 1,
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    minHeight: 40,
    gap: 4,
  },
  section: {
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
  },
  simpleTitle: { fontSize: 18, fontWeight: "bold" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 16 },
  sections: {
    display: "flex",
    flexDirection: "column",
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
    borderRadius: 12,
    padding: 4,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
