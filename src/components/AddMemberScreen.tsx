import React, { useState, useCallback, useContext, useMemo } from "react";
import { Text, View, StyleSheet, FlatList } from "react-native";

import { BottomSheet } from "./BottomSheet";

import * as T from "../gatz/types";

import {
  AnnotatedContact,
  ContactInGroupRow,
  SelectableContactRowInGroup,
} from "./contacts";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const keyExtractor = (item: T.Contact) => item.id;

type Props = {
  group: T.Group;
  onCancel: () => void;
  onSubmit: (selectedIds: T.Contact["id"][]) => Promise<void>;
  initialMembers: T.Contact["id"][];
  allContacts: AnnotatedContact[];
  member_or_admin?: MemberOrAdmin;
};

type MemberOrAdmin = "member" | "admin";

export const AddMemberScreen = ({
  member_or_admin = "member",
  onCancel,
  onSubmit,
  initialMembers,
  allContacts,
}: Props) => {

  const colors = useThemeColors();

  const [selectedIds, setSelectedIds] = useState(new Set<T.Contact["id"]>());
  const initialMemberIds = useMemo(() => new Set(initialMembers), [initialMembers]);

  const sortedContacts: T.Contact[] = useMemo(() => {
    return allContacts.sort((a, b) => a.name.localeCompare(b.name));
  }, [allContacts]);

  const selectedContacts = useMemo(
    () => sortedContacts.filter((c) => selectedIds.has(c.id)),
    [selectedIds, sortedContacts],
  );

  const flipContact = useCallback(
    (id: T.Contact["id"]) => {
      setSelectedIds((prev) => {
        const newSelectedIds = new Set(prev);
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
        } else {
          newSelectedIds.add(id);
        }
        return newSelectedIds;
      });
    },
    [setSelectedIds],
  );

  const renderContact = useCallback(
    ({
      item,
      index,
      lastIndex,
    }: {
      item: AnnotatedContact;
      index: number;
      lastIndex: number;
    }) =>
      initialMemberIds.has(item.id) || item.is_owner || item.is_you ? (
        <ContactInGroupRow index={index} item={item} lastIndex={lastIndex} />
      ) : (
        <SelectableContactRowInGroup
          key={item.id}
          index={index}
          item={item}
          selected={selectedIds.has(item.id)}
          onPress={flipContact}
          lastIndex={lastIndex}
        />
      ),
    [flipContact, selectedIds, initialMemberIds],
  );

  const title = member_or_admin === "member" ? "Add members" : "Add admins";

  return (
    <BottomSheet
      isVisible
      onClose={onCancel}
      title={title}
      onNext={() => onSubmit(Array.from(selectedIds))}
      leftButtonText="Cancel"
      rightButtonText="Add"
    >
      <View
        style={[
          styles.innerContainer,
          { backgroundColor: colors.rowBackground },
        ]}
      >
        <View style={styles.sectionOuter}>
          {member_or_admin === "member" ? (
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              To be added ({selectedIds.size})
            </Text>
          ) : (
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              To be admins ({selectedIds.size})
            </Text>
          )}
          <View
            style={[
              styles.flatListContainer,
              { backgroundColor: colors.appBackground },
            ]}
          >
            <FlatList<AnnotatedContact>
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              data={selectedContacts}
              renderItem={({ item, index }) =>
                renderContact({
                  index,
                  item,
                  lastIndex: selectedContacts.length - 1,
                })
              }
            />
          </View>
        </View>
        <View style={styles.sectionOuter}>
          {member_or_admin === "member" ? (
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              Your friends ({allContacts.length})
            </Text>
          ) : (
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              Members ({allContacts.length})
            </Text>
          )}
          <View
            style={[
              styles.flatListContainer,
              { backgroundColor: colors.appBackground },
            ]}
          >
            <FlatList<AnnotatedContact>
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              data={sortedContacts}
              renderItem={({ item, index }) =>
                renderContact({
                  index,
                  item,
                  lastIndex: sortedContacts.length - 1,
                })
              }
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export const RemoveMemberScreen = ({
  member_or_admin = "member",
  onCancel,
  onSubmit,
  allMembers,
}: {
  member_or_admin?: MemberOrAdmin;
  onCancel: () => void;
  onSubmit: (selectedIds: T.Contact["id"][]) => Promise<void>;
  allMembers: T.Contact[];
}) => {
  const colors = useThemeColors();

  const [selectedIds, setSelectedIds] = useState(new Set<T.Contact["id"]>());

  const sortedContacts: T.Contact[] = useMemo(() => {
    return allMembers.sort((a, b) => a.name.localeCompare(b.name));
  }, [allMembers]);

  const selectedContacts = useMemo(
    () => sortedContacts.filter((c) => selectedIds.has(c.id)),
    [selectedIds, sortedContacts],
  );

  const flipContact = useCallback(
    (id: T.Contact["id"]) => {
      setSelectedIds((prev) => {
        const newSelectedIds = new Set(prev);
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
        } else {
          newSelectedIds.add(id);
        }
        return newSelectedIds;
      });
    },
    [setSelectedIds],
  );

  // TODO: This makes it seem like you can remove other admins when you are an admin
  const renderContact = useCallback(
    ({
      lastIndex,
      item,
      index,
    }: {
      item: AnnotatedContact;
      index: number;
      lastIndex: number;
    }) =>
      item.is_owner || item.is_you ? (
        <ContactInGroupRow index={index} item={item} />
      ) : (
        <SelectableContactRowInGroup
          key={item.id}
          index={index}
          item={item}
          selected={selectedIds.has(item.id)}
          onPress={flipContact}
          lastIndex={lastIndex}
        />
      ),
    [flipContact, selectedIds],
  );

  const title =
    member_or_admin === "member" ? "Remove members" : "Remove admins";

  return (
    <BottomSheet
      isVisible
      onClose={onCancel}
      title={title}
      onNext={() => onSubmit(Array.from(selectedIds))}
      leftButtonText="Cancel"
      rightButtonText="Remove"
    >
      <View
        style={[
          styles.innerContainer,
          { backgroundColor: colors.rowBackground },
        ]}
      >
        <View style={styles.sectionOuter}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            To be removed{" "}
            {member_or_admin === "member" ? undefined : "from admins"} (
            {selectedIds.size})
          </Text>
          <View
            style={[
              styles.flatListContainer,
              { backgroundColor: colors.appBackground },
            ]}
          >
            <FlatList<AnnotatedContact>
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              data={selectedContacts}
              renderItem={({ item, index }) =>
                renderContact({
                  item,
                  index,
                  lastIndex: selectedContacts.length - 1,
                })
              }
            />
          </View>
        </View>
        <View style={styles.sectionOuter}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            {member_or_admin === "member" ? "Members" : "Admins"} (
            {allMembers.length})
          </Text>
          <View
            style={[
              styles.flatListContainer,
              { backgroundColor: colors.appBackground },
            ]}
          >
            <FlatList<AnnotatedContact>
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              data={sortedContacts}
              renderItem={({ item, index }) =>
                renderContact({
                  item,
                  index,
                  lastIndex: sortedContacts.length - 1,
                })
              }
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sectionOuter: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  container: { flex: 1, marginTop: 50 },
  innerContainer: {
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
  },
  flatListContainer: { borderRadius: 10, },
});
