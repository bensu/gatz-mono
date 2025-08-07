import React, { useCallback, useContext } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";

import { useAsync } from "react-async-hook";
import { useRouter } from "expo-router";

import GiftedAvatar from "../gifted/GiftedAvatar";
import { Participants } from "./Participants";

import * as T from "../gatz/types";
import { Color as GatzColor, Styles as GatzStyles } from "../gatz/styles";

import { ClientContext } from "../context/ClientProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

/**
 * Parses contact IDs from various URL formats in text.
 * 
 * This function extracts contact IDs from different URL patterns used across
 * the Gatz chat platform (web, desktop, and app URLs).
 * 
 * Key functionality and invariants:
 * - [url-pattern-matching] Matches three distinct URL patterns for contact links
 * - [id-extraction] Extracts alphanumeric IDs (including hyphens) from matched URLs
 * - [deduplication] Returns unique IDs by converting to Set before returning
 * - [empty-text-handling] Returns empty array for null/undefined/empty input
 * - [multi-url-support] Can extract multiple IDs from a single text block
 * 
 * Supported URL patterns:
 * - Web: https://gatz.chat/contact/[id]
 * - Desktop: https://app.gatz.chat/contact/[id]
 * - App: chat.gatz///contact/[id]
 * 
 * The function is resilient to:
 * - Multiple URLs in the same text
 * - Duplicate IDs (automatically deduplicated)
 * - Mixed URL formats in the same text
 * - Invalid or malformed URLs (simply ignored)
 * 
 * @param text - The text to parse for contact URLs
 * @returns Array of unique contact IDs found in the text
 */
export const parseContactIds = (text: string): string[] => {
  if (text) { // [empty-text-handling]
    // Looks for invite urls and extracts the invite id

    let out = [];

    const webRegex = /https:\/\/gatz\.chat\/contact\/([a-zA-Z0-9-]+)/g; // [url-pattern-matching]
    // const webRegex = /https:\/\/gatz\.chat\/invite\/\?id=([a-zA-Z0-9]+)/g;
    const webMatch = text.matchAll(webRegex);
    if (webMatch) {
      for (const match of webMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }

    const desktopRegex = /https:\/\/app\.gatz\.chat\/contact\/([a-zA-Z0-9-]+)/g; // [url-pattern-matching]
    // const webRegex = /https:\/\/gatz\.chat\/invite\/\?id=([a-zA-Z0-9]+)/g;
    const desktopMatch = text.matchAll(desktopRegex);
    if (desktopMatch) {
      for (const match of desktopMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }

    const appInviteRegex = /chat\.gatz\/\/\/contact\/([a-zA-Z0-9-]+)/g; // [url-pattern-matching]
    const appMatch = text.matchAll(appInviteRegex);
    if (appMatch) {
      for (const match of appMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }
    return Array.from(new Set(out)); // [deduplication]
  } else {
    return [];
  }
};

/**
 * Parses group IDs from various URL formats in text.
 * 
 * This function extracts group IDs from different URL patterns used for
 * group links in the Gatz chat platform.
 * 
 * Key functionality and invariants:
 * - [group-url-matching] Matches two distinct URL patterns for group links
 * - [alphanumeric-id-extraction] Extracts alphanumeric group IDs from matched URLs
 * - [unique-id-guarantee] Returns deduplicated array using Set conversion
 * - [null-safe-handling] Returns empty array for falsy input
 * - [batch-extraction] Processes multiple URLs in single text input
 * 
 * Supported URL patterns:
 * - Web: https://gatz.chat/group/[id]
 * - App: chat.gatz///group/[id]
 * 
 * Pattern differences from contact parsing:
 * - Group IDs don't include hyphens (only alphanumeric)
 * - No desktop-specific URL pattern
 * - Simpler ID format constraints
 * 
 * @param text - The text to parse for group URLs
 * @returns Array of unique group IDs found in the text
 */
export const parseGroupIds = (text: string): string[] => {
  if (text) { // [null-safe-handling]
    let out = [];

    // Looks for invite urls and extracts the invite id
    const webRegex = /https:\/\/gatz\.chat\/group\/([a-zA-Z0-9]+)/g; // [group-url-matching] [alphanumeric-id-extraction]
    const webMatch = text.matchAll(webRegex);
    if (webMatch) {
      for (const match of webMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }

    const appRegex = /chat\.gatz\/\/\/group\/([a-zA-Z0-9]+)/g; // [group-url-matching] [alphanumeric-id-extraction]
    const appMatch = text.matchAll(appRegex);
    if (appMatch) {
      for (const match of appMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }
    return Array.from(new Set(out)); // [deduplication]
  } else {
    return [];
  }
};

/**
 * Parses invite IDs from various URL formats in text.
 * 
 * This function extracts invite IDs from different URL patterns used for
 * invite links across the Gatz chat platform evolution.
 * 
 * Key functionality and invariants:
 * - [invite-url-patterns] Matches three distinct URL patterns including legacy formats
 * - [query-param-parsing] Extracts IDs from query parameters (?id=) in modern format
 * - [path-based-parsing] Extracts IDs from URL paths in legacy formats
 * - [unique-guarantee] Deduplicates IDs via Set conversion before returning
 * - [graceful-empty-handling] Returns empty array for falsy input
 * - [legacy-support] Maintains backward compatibility with old invite-link URLs
 * 
 * Supported URL patterns:
 * - Modern web: https://gatz.chat/invite?id=[id]
 * - Legacy web: https://gatz.chat/invite-link/[id]
 * - App: chat.gatz///invite-link/[id]
 * 
 * Historical context:
 * - Supports both query parameter style (newer) and path style (older)
 * - Handles transition period where both formats may coexist
 * - App URLs still use the legacy path format
 * 
 * @param text - The text to parse for invite URLs
 * @returns Array of unique invite IDs found in the text
 */
export const parseInviteIds = (text: string): string[] => {
  if (text) { // [graceful-empty-handling]
    // Looks for invite urls and extracts the invite id
    const webRegex = /https:\/\/gatz\.chat\/invite\?id\=([a-zA-Z0-9]+)/g; // [invite-url-patterns] [query-param-parsing]
    // const webRegex = /https:\/\/gatz\.chat\/invite\/\?id=([a-zA-Z0-9]+)/g;
    const webMatch = text.matchAll(webRegex);
    let out = [];
    if (webMatch) {
      for (const match of webMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }

    // old web invite urls
    const oldRegex = /https:\/\/gatz\.chat\/invite-link\/([a-zA-Z0-9]+)/g; // [invite-url-patterns] [path-based-parsing] [legacy-support]
    const oldMatch = text.matchAll(oldRegex);
    if (oldMatch) {
      for (const match of oldMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }

    const appInviteRegex = /chat\.gatz\/\/\/invite-link\/([a-zA-Z0-9]+)/g; // [invite-url-patterns] [path-based-parsing] [legacy-support]
    const appMatch = text.matchAll(appInviteRegex);
    if (appMatch) {
      for (const match of appMatch) {
        out.push(match[1]); // [id-extraction] [multi-url-support]
      }
    }
    return Array.from(new Set(out)); // [deduplication]
  } else {
    return [];
  }
};

const GroupInviteCard = ({
  group,
  contacts,
  isInvite = true,
}: {
  group: T.Group;
  contacts?: T.Contact[];
  isInvite?: boolean;
}) => {
  const colors = useThemeColors();
  // Participants should show the contacts in common first, and then the number
  // of people total
  return (
    <>
      <View style={[styles.row, { width: "100%" }]}>
        <Text
          style={[groupCardStyles.subHeader, { color: colors.contrastGrey }]}
        >
          {isInvite ? "Invite to group" : "Group"}
        </Text>
        {contacts && contacts.length > 0 && (
          <Text
            style={[groupCardStyles.subHeader, { color: colors.contrastGrey }]}
          >
            Members
          </Text>
        )}
      </View>
      <View style={[groupCardStyles.row, groupCardStyles.innerRow]}>
        <View style={groupCardStyles.row}>
          <GiftedAvatar user={group} size="small" />
          <Text
            style={[groupCardStyles.smallText, { color: colors.primaryText }]}
          >
            {group.name} ({group.members.length})
          </Text>
        </View>
        {contacts && contacts.length > 0 && (
          <Participants size="tiny" users={contacts} />
        )}
      </View>
    </>
  );
};
const ContactInviteCard = ({
  contact,
  contacts,
  isInvite = true,
}: {
  contact: T.Contact;
  contacts?: T.Contact[];
  isInvite?: boolean;
}) => {
  const colors = useThemeColors();
  // Participants should show the contacts in common first, and then the number
  // of people total
  return (
    <>
      <View style={[styles.row, { width: "100%" }]}>
        <Text
          style={[groupCardStyles.subHeader, { color: colors.contrastGrey }]}
        >
          {isInvite ? "Friend request" : "Profile"}
        </Text>
        {contacts && contacts.length > 0 && (
          <Text
            style={[groupCardStyles.subHeader, { color: colors.contrastGrey }]}
          >
            Friends in common
          </Text>
        )}
      </View>
      <View style={[groupCardStyles.row, groupCardStyles.innerRow]}>
        <View style={groupCardStyles.row}>
          <GiftedAvatar user={contact} size="small" />
          <Text
            style={[groupCardStyles.smallText, { color: colors.primaryText }]}
          >
            {contact.name}
          </Text>
        </View>
        {contacts && contacts.length > 0 && (
          <Participants size="tiny" users={contacts} />
        )}
      </View>
    </>
  );
};

const GROUP_NAME_FONT_WEIGHT = "600";
const groupCardStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  innerRow: {
    width: "100%",
    flex: 1,
    justifyContent: "space-between",
    marginTop: 6,
  },
  subHeader: {
    fontSize: 12,
    color: GatzColor.strongGrey,
  },
  smallText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: GROUP_NAME_FONT_WEIGHT,
  },
});

/**
 * Component that displays a clickable group card with preview information.
 * 
 * This component fetches and displays group information including members
 * and contacts in common, providing navigation to the full group view.
 * 
 * Key functionality and invariants:
 * - [async-data-fetching] Uses useAsync hook for non-blocking group data retrieval
 * - [navigation-routing] Routes to /group/[id] on card press
 * - [contact-filtering] Shows only contacts that are in common with the user
 * - [conditional-rendering] Returns null while loading or if no data
 * - [theme-aware-styling] Adapts colors based on current theme via useThemeColors
 * - [shadow-styling] Applies consistent shadow styling for card elevation
 * 
 * Data flow:
 * 1. Fetches group data via gatzClient.getGroup
 * 2. Filters contacts to show only those in common
 * 3. Renders GroupInviteCard with isInvite=false
 * 4. Wraps in TouchableOpacity for navigation
 * 
 * Error handling:
 * - Gracefully handles missing data by returning null
 * - useAsync manages loading and error states internally
 * 
 * @param groupId - The ID of the group to display
 * @returns Group card component or null if data unavailable
 */
export const GroupCard = ({ groupId }: { groupId: string }) => {
  const { gatzClient } = useContext(ClientContext);
  const router = useRouter();
  const colors = useThemeColors(); // [theme-aware-styling]

  const navToGroup = useCallback(() => {
    router.push("/group/" + groupId); // [navigation-routing]
  }, [router, groupId]);

  const fetchGroup = async (): Promise<T.GroupResponse> => {
    const r = await gatzClient.getGroup(groupId); // [async-data-fetching]
    return r;
  };

  const { result } = useAsync(fetchGroup, [groupId]);

  if (result) { // [conditional-rendering]
    const group = result.group;
    const contactIds = new Set(result.in_common.contact_ids);
    const contacts = result.all_contacts.filter((c) => contactIds.has(c.id)); // [contact-filtering]
    return (
      <TouchableOpacity onPress={navToGroup} testID={`group-card-${groupId}`}>
        <View
          style={[
            styles.bubble,
            styles.container,
            styles.wrapperShadow, // [shadow-styling]
            { backgroundColor: colors.appBackground },
          ]}
        >
          <GroupInviteCard isInvite={false} group={group} contacts={contacts} />
        </View>
      </TouchableOpacity>
    );
  } else {
    return null; // [conditional-rendering]
  }
};

/**
 * Component that displays a clickable contact card with profile preview.
 * 
 * This component fetches and displays contact information including
 * mutual contacts, providing navigation to the full contact profile.
 * 
 * Key functionality and invariants:
 * - [contact-data-fetching] Asynchronously fetches contact details via API
 * - [profile-navigation] Routes to /contact/[id] on card interaction
 * - [mutual-contacts-display] Shows contacts in common between users
 * - [null-safe-rendering] Returns null for missing or loading data
 * - [theme-integration] Dynamically applies theme colors
 * - [consistent-card-styling] Maintains uniform shadow and spacing
 * 
 * Component behavior:
 * 1. Fetches contact data using gatzClient.getContact
 * 2. Extracts mutual contacts from response
 * 3. Renders ContactInviteCard with isInvite=false
 * 4. Enables navigation via TouchableOpacity wrapper
 * 
 * State management:
 * - No local state - relies on useAsync for data management
 * - Navigation callback memoized with useCallback
 * - Context-based client and theme access
 * 
 * @param contactId - The ID of the contact to display
 * @returns Contact card component or null if data unavailable
 */
export const ContactCard = ({ contactId }: { contactId: string }) => {
  const { gatzClient } = useContext(ClientContext);
  const router = useRouter();
  const colors = useThemeColors(); // [theme-integration]

  const navToContact = useCallback(() => {
    router.push("/contact/" + contactId); // [profile-navigation]
  }, [router, contactId]);

  const fetchInvite = async (): Promise<T.ContactResponse> => {
    const r = await gatzClient.getContact(contactId); // [contact-data-fetching]
    return r;
  };

  const { result } = useAsync(fetchInvite, [contactId]);

  if (result) { // [null-safe-rendering]
    const contact = result.contact;
    const contacts = result.in_common.contacts; // [mutual-contacts-display]
    return (
      <TouchableOpacity onPress={navToContact} testID={`contact-card-${contactId}`}>
        <View
          style={[
            styles.bubble,
            styles.container,
            styles.wrapperShadow, // [consistent-card-styling]
            { backgroundColor: colors.appBackground },
          ]}
        >
          <ContactInviteCard
            isInvite={false}
            contact={contact}
            contacts={contacts}
          />
        </View>
      </TouchableOpacity>
    );
  } else {
    return null; // [null-safe-rendering]
  }
};

/**
 * Main invite card component that renders different card types based on invite type.
 * 
 * This polymorphic component fetches invite data and renders the appropriate
 * card variant (group, crew, or contact) with caching support.
 * 
 * Key functionality and invariants:
 * - [polymorphic-rendering] Renders different components based on invite type
 * - [database-caching] Checks local DB cache before making API requests
 * - [type-based-routing] Routes to /invite-link/[id] regardless of type
 * - [graceful-degradation] Returns null for unknown types or missing data
 * - [cache-persistence] Stores fetched data in frontend DB for reuse
 * - [type-discrimination] Uses switch statement for type-safe rendering
 * 
 * Invite type handling:
 * - "group": Standard group invite with mutual contacts
 * - "crew": Special group variant showing member list
 * - "contact": Friend request with mutual connections
 * - default: Null rendering for safety
 * 
 * Performance optimizations:
 * 1. Checks local DB cache first
 * 2. Only fetches from API if not cached
 * 3. Persists API response to DB
 * 4. Memoizes navigation callback
 * 
 * Data flow:
 * 1. Check FrontendDB for cached invite
 * 2. Fetch from API if not found
 * 3. Cache the response
 * 4. Render appropriate card variant
 * 
 * @param inviteId - The ID of the invite to display
 * @returns Type-specific invite card or null
 */
export const InviteCard = ({ inviteId }: { inviteId: string }) => {
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const router = useRouter();
  const colors = useThemeColors();

  const navToInvite = useCallback(() => {
    router.push("/invite-link/" + inviteId); // [type-based-routing]
  }, [router, inviteId]);

  const fetchInvite = async (): Promise<T.InviteLinkResponse> => {
    const invite = db.getInviteLinkResponseById(inviteId); // [database-caching]
    if (invite) {
      return invite;
    }
    const r = await gatzClient.getInviteLink(inviteId);
    db.addInviteLinkResponse(r); // [cache-persistence]
    return r;
  };

  const { result } = useAsync(fetchInvite, [inviteId]);

  if (result) { // [graceful-degradation]
    switch (result.type) { // [type-discrimination] [polymorphic-rendering]
      case "group": {
        const group = result.group;
        const contacts = result.in_common.contacts;
        return (
          <TouchableOpacity onPress={navToInvite} testID={`invite-card-${inviteId}`}>
            <View
              style={[
                styles.bubble,
                styles.container,
                styles.wrapperShadow,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <GroupInviteCard isInvite group={group} contacts={contacts} />
            </View>
          </TouchableOpacity>
        );
      }
      case "crew": {
        const group = result.group;
        const contacts = result.members;
        return (
          <TouchableOpacity onPress={navToInvite} testID={`invite-card-${inviteId}`}>
            <View
              style={[
                styles.bubble,
                styles.container,
                styles.wrapperShadow,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <GroupInviteCard group={group} contacts={contacts} />
            </View>
          </TouchableOpacity>
        );
      }
      case "contact": {
        const contact = result.contact;
        const contacts = result.in_common.contacts;
        return (
          <TouchableOpacity onPress={navToInvite} testID={`invite-card-${inviteId}`}>
            <View
              style={[
                styles.bubble,
                styles.container,
                styles.wrapperShadow,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <ContactInviteCard
                contact={contact}
                contacts={contacts}
                isInvite
              />
            </View>
          </TouchableOpacity>
        );
      }
      default: {
        return null; // [graceful-degradation]
      }
    }
  } else {
    return null; // [graceful-degradation]
  }
};

const styles = StyleSheet.create({
  row: {
    flex: 1,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    flex: 1,
    alignItems: "flex-start",
    marginRight: 8,
    paddingVertical: 8,
  },
  bubble: {
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 6,
  },
  wrapperShadow: { ...GatzStyles.thinDropShadow },
});
