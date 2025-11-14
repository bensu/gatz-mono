import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { ClientContext } from "../context/ClientProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { SessionContext } from "../context/SessionProvider";
import * as T from "../gatz/types";

import TouchableOpacityItem from "./TouchableOpacityItem";
import { AnnotatedContact, ContactInGroupRow } from "./contacts";

import { pickImages, prepareFile, uploadPicture } from "../mediaUtils";

import GiftedAvatar from "../gifted/GiftedAvatar";

import {
  AddMemberScreen,
  RemoveMemberScreen,
} from "../components/AddMemberScreen";
import { UniversalHeader } from "../components/Header";
import { QRModal } from "../components/QRButton";

import { useDebouncedRouter } from "../context/debounceRouter";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { assertNever, isMobile } from "../util";

const keyExtractor = (item: T.Contact) => item.id;

const Button = ({
  title,
  onPress,
  color,
  icon,
}: {
  color?: string;
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}) => {
  const colors = useThemeColors();
  const buttonColor = color || colors.primaryText;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        <View
          style={[
            buttonStyles.container,
            { backgroundColor: colors.appBackground },
          ]}
        >
          <Text style={[buttonStyles.text, { color: buttonColor }]}>
            {title}
          </Text>
          {icon}
        </View>
      </TouchableOpacity>
    );
  } else {
    return (
      <View
        style={[
          buttonStyles.container,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <Text style={[buttonStyles.text, { color: buttonColor }]}>{title}</Text>
        {icon}
      </View>
    );
  }
};

const buttonStyles = StyleSheet.create({
  text: {
    justifyContent: "center",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
  },
  container: {
    minWidth: 100,
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});

type GroupMembershipType = "is_owner" | "is_member" | "is_admin" | "is_public";

const useShareLink = (clientCall: () => Promise<any>) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any | undefined>();

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await clientCall();
      setResult(r);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [clientCall]);

  return { loading, error, execute, result };
};

const TopButtons = ({
  group,
  member_type,
  startRequest,
  getShareLink,
  justSharedLink,
  membersButMe,
  toFeed,
}: {
  group: T.Group;
  member_type: GroupMembershipType;
  startRequest: (action: T.GroupActionType) => void;
  justSharedLink: boolean;
  getShareLink: () => Promise<{ url: string }>;
  membersButMe: number;
  toFeed: () => void;
}) => {
  const groupId = group.id;
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const {
    session: { userId },
  } = useContext(SessionContext);
  const { error, loading, execute } = useShareLink(getShareLink);

  const groupInvitesEnabled = db.getFeatureFlag("global_invites_enabled");

  const colors = useThemeColors();

  useEffect(() => {
    if (error) {
      if (Platform.OS === "web") {
        alert("There was an error getting the invite link");
      } else {
        Alert.alert("Error", "There was an error getting the invite link");
      }
    }
  }, [error]);

  const joinGroup = useCallback(async () => {
    const r = await gatzClient.makeGroupRequest(groupId, "add-member", {
      members: [userId],
    });
    db.addGroup(r.group);
  }, [gatzClient]);

  switch (member_type) {
    case "is_admin": {
      // The same as owner
    }
    case "is_owner": {
      const hasOtherMembers = membersButMe > 0;
      return (
        <View style={styles.sectionOuter}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonContainer}>
              <Button
                title="View posts"
                onPress={toFeed}
                color={colors.primaryText}
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            {hasOtherMembers && (
              <View style={[styles.buttonContainer, { marginRight: 12 }]}>
                <Button
                  title="Remove members"
                  color={colors.danger}
                  onPress={() => startRequest("remove-member")}
                />
              </View>
            )}
            <View style={styles.buttonContainer}>
              <Button
                title="Add members"
                color={colors.active}
                onPress={() => startRequest("add-member")}
              />
            </View>
          </View>
          {group.settings.mode === "crew" && (
            <Text
              style={[
                styles.notice,
                { marginBottom: 16, color: colors.secondaryText },
              ]}
            >
              Members you add directly will not become contacts with the rest of
              the group.
            </Text>
          )}

          <View style={styles.section}>
            <Text style={[styles.title, { color: colors.primaryText }]}>
              Invites
            </Text>

            {groupInvitesEnabled ? (
              <>
                {group.settings.mode === "crew" ? (
                  <Text
                    style={[styles.notice, { color: colors.secondaryText }]}
                  >
                    New members that join with this invite link will become
                    contacts with the rest of the group.
                  </Text>
                ) : (
                  <Text
                    style={[styles.notice, { color: colors.secondaryText }]}
                  >
                    New members won't become your contact when they join.
                  </Text>
                )}
                <View style={[styles.buttonContainer, { marginTop: 12 }]}>
                  <Button
                    title="Share invite link"
                    color={colors.primaryText}
                    onPress={execute}
                    icon={
                      loading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primaryText}
                        />
                      ) : (
                        <MaterialIcons
                          name={Platform.select({
                            web: justSharedLink ? "check" : "content-copy",
                            default: "ios-share",
                          })}
                          size={18}
                          color={colors.primaryText}
                        />
                      )
                    }
                  />
                </View>
                {Platform.OS !== "web" && (
                  <View style={[styles.buttonContainer, { marginTop: 12 }]}>
                    <QRModal
                      title={group.name}
                      fetchUrl={async () => {
                        const result = await gatzClient.postGroupShareLink(groupId);
                        return { url: result.url };
                      }}
                    >
                      <Button
                        title="Get QR code invite"
                        color={colors.secondaryText}
                        icon={
                          <MaterialIcons
                            name="qr-code"
                            size={18}
                            color={colors.primaryText}
                          />
                        }
                      />
                    </QRModal>
                  </View>
                )}
                {group.settings.member_mode === "open" && (
                  <Text
                    style={[
                      styles.notice,
                      { marginTop: 12, color: colors.secondaryText },
                    ]}
                  >
                    New members will see group posts from the last month.
                  </Text>
                )}
              </>
            ) : (
              <Text>Invites are temporarily disabled</Text>
            )}
          </View>
        </View>
      );
    }
    case "is_public": {
      return (
        <View style={styles.sectionOuter}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonContainer}>
              <Button title="Join group" onPress={joinGroup} />
            </View>
          </View>
        </View>
      );
    }

    case "is_member": {
      return (
        <View style={styles.sectionOuter}>
          <View style={styles.buttonRow}>
            <View style={styles.buttonContainer}>
              <Button title="View posts" onPress={toFeed} />
            </View>
          </View>
        </View>
      );
    }
    default:
      assertNever(member_type);
  }
};

const BottomButtons = ({
  groupId,
  member_type,
  startRequest,
  adminsButMe,
  membersButMe,
}: {
  groupId: string;
  member_type: GroupMembershipType;
  startRequest: (action: T.GroupActionType) => void;
  adminsButMe: number;
  membersButMe: number;
}) => {
  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);
  const colors = useThemeColors();

  const leaveGroup = useCallback(async () => {
    if (Platform.OS === "web") {
      alert("Are you sure you want to leave?");
      await gatzClient.makeGroupRequest(groupId, "leave", {});
      router.replace("/");
    } else {
      Alert.alert(
        "Are you sure you want to leave?",
        "You can only rejoin the group if you get invited",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, I want to leave",
            style: "destructive",
            onPress: async () => {
              await gatzClient.makeGroupRequest(groupId, "leave", {});
              router.push("/");
            },
          },
        ],
        { cancelable: true },
      );
    }
  }, [router.push, router.replace, gatzClient, groupId]);

  switch (member_type) {
    case "is_owner": {
      const hasOtherAdmins = adminsButMe > 0;
      const hasOtherMembers = membersButMe > 0;
      return (
        <View style={styles.sectionOuter}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Danger
          </Text>
          <View style={[styles.buttonRow]}>
            {hasOtherAdmins && (
              <View style={[styles.buttonContainer, { marginRight: 12 }]}>
                <Button
                  title="Remove admins"
                  color={colors.danger}
                  onPress={() => startRequest("remove-admin")}
                />
              </View>
            )}
            {hasOtherMembers && (
              <View style={styles.buttonContainer}>
                <Button
                  title="Add admins"
                  color={colors.active}
                  onPress={() => startRequest("add-admin")}
                />
              </View>
            )}
          </View>
        </View>
      );
    }
    case "is_member":
    case "is_admin": {
      return (
        <View style={styles.sectionOuter}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Danger
          </Text>
          <Button
            title="Leave group"
            color={colors.danger}
            onPress={leaveGroup}
          />
        </View>
      );
    }
    case "is_public": {
      return null;
    }
    default:
      assertNever(member_type);
  }
};

const explainerMessage = `Use this link twice, first to install Gatz, then to get to the invite`;

type ModalOpen =
  | undefined
  | "add-member"
  | "remove-member"
  | "add-admin"
  | "remove-admin"
  | "leave"
  | "archive"
  | "unarchive"
  | "transfer-ownership";
// | "transfer-ownership"

export const GroupScreen = ({
  groupResponse,
  onDesktopClose,
}: {
  groupResponse: T.GroupResponse;
  onDesktopClose?: () => void;
}) => {
  const {
    all_contacts,
    in_common: { contact_ids },
  } = groupResponse;

  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const {
    session: { userId },
  } = useContext(SessionContext);

  const [group, setGroup] = useState<T.Group | undefined>(groupResponse.group);
  const groupId = group.id;

  useEffect(() => {
    const lid = db.listenToGroup(groupId, setGroup);
    return () => db.removeGroupListener(groupId, lid);
  }, [setGroup, db, groupId]);

  const [modalOpen, setModalOpen] = useState<ModalOpen>(undefined);
  const closeModal = useCallback(() => setModalOpen(undefined), [setModalOpen]);
  const startRequest = useCallback(
    (action: T.GroupActionType) => {
      if (action === "update-attrs") {
        console.log("editing");
      } else {
        setModalOpen(action);
      }
    },
    [setModalOpen],
  );

  const colors = useThemeColors();

  const onPressAvatar = useCallback(
    (userId: T.Contact["id"]) => router.push(`/contact/${userId}`),
    [router.push],
  );

  const renderContact = useCallback(
    ({
      item,
      index,
      lastIndex,
    }: {
      onPressAvatar?: (userId: T.Contact["id"]) => void;
      item: AnnotatedContact;
      index: number;
      lastIndex: number;
    }) => (
      <TouchableOpacityItem onPress={() => onPressAvatar(item.id)}>
        <ContactInGroupRow lastIndex={lastIndex} index={index} item={item} />
      </TouchableOpacityItem>
    ),
    [onPressAvatar],
  );

  // TODO: if there was an error, show it
  // TODO: show the new state, whatever that is

  const makeRequest = useCallback(
    async (action: T.GroupActionType, delta: T.GroupDelta) => {
      const r = await gatzClient.makeGroupRequest(groupId, action, delta);
      db.addGroup(r.group);
      return r;
    },
    [gatzClient],
  );

  const [justSharedLink, setJustSharedLink] = useState(false);

  const shareGroupInviteLink = useCallback(async () => {
    const { url } = await gatzClient.postGroupShareLink(groupId);
    const title = `Join ${group.name} in Gatz`;
    Platform.select({
      web: async () => {
        const isSuccess = await Clipboard.setStringAsync(url);
        if (isSuccess) {
          setJustSharedLink(true);
          setTimeout(() => {
            setJustSharedLink(false);
          }, 3000);
        } else {
          alert("There was an error fetching the invite. Try again later");
        }
      },
      android: () => {
        Share.share({
          title,
          url,
          message: `${explainerMessage}:\n\n${url}`,
        });
      },
      ios: () => {
        Share.share({
          title,
          url,
          message: explainerMessage,
        });
      },
    })();
    return { url }; // Return the URL to match the expected type
  }, [gatzClient, groupId]);

  const memoContacts = useMemo(() => {
    const contactMemberIds = new Set(contact_ids);
    const adminIds = new Set(group.admins);
    const memberIds = new Set(group.members);

    const member_type: GroupMembershipType =
      group.owner === userId
        ? "is_owner"
        : adminIds.has(userId)
          ? "is_admin"
          : memberIds.has(userId)
            ? "is_member"
            : "is_public";

    const allContacts: AnnotatedContact[] = all_contacts.map((c) => ({
      ...c,
      is_owner: c.id === group.owner,
      is_you: c.id === userId,
      is_admin: adminIds.has(c.id),
    }));
    const allMembers = allContacts
      .filter((c) => memberIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    const allMembersButMe = allMembers.filter((c) => c.id !== userId);
    const adminContacts = allMembers.filter((c) => adminIds.has(c.id));
    const allAdminsButMe = adminContacts.filter((c) => c.id !== userId);
    const myContacts = allMembers.filter(
      (c) => !adminIds.has(c.id) && contactMemberIds.has(c.id),
    );
    const otherContacts = allMembers.filter(
      (c) => !adminIds.has(c.id) && !contactMemberIds.has(c.id),
    );
    const allContactsButMe = allContacts.filter((c) => c.id !== userId);
    return {
      member_type,
      allMembersButMe,
      allAdminsButMe,
      allMembers,
      adminContacts,
      myContacts,
      otherContacts,
      allContactsButMe,
    };
  }, [group, groupResponse]);

  const {
    member_type,
    allMembers,
    allMembersButMe,
    adminContacts,
    allAdminsButMe,
    myContacts,
    otherContacts,
    allContactsButMe,
  } = memoContacts;

  // XXX: this call is not being properly debounced, even if the rest are
  const toFeed = useCallback(() => {
    router.push(`/group/${groupId}/feed`);
  }, [router.push, groupId]);

  const onPost = useCallback(
    () => router.push(`/post?group_id=${groupId}`),
    [router, groupId],
  );
  const getPicture = useCallback(async () => {
    try {
      const { presigned_url, url } =
        await gatzClient.getPresignedUrl("avatars");
      const result = await pickImages({ aspect: [1, 1], allowsEditing: true });
      if (result) {
        const assets = result.assets;
        const asset = assets[0];
        const blob = await prepareFile(asset);
        const r = await uploadPicture(presigned_url, blob);
        if (r.status === 200) {
          const updated = await gatzClient.updateGroupPicture(groupId, url);
          if (updated.group) {
            db.addGroup(updated.group);
          } else {
            Alert.alert(
              "Failed to update profile picture",
              "Please try again later",
            );
          }
        } else {
          Alert.alert(
            "Failed to upload to Cloudfront",
            "Please try again later",
          );
        }
      }
    } catch (e) {
      Alert.alert("Failed to upload", "Please try again later");
    }
  }, [db, groupId, gatzClient]);

  // const isArchived: boolean = useMemo(() => {
  //   if (group && group.archived_uids) {
  //     const archivedUids = new Set(group.archived_uids);
  //     return archivedUids.has(userId);
  //   }
  // }, [group]);

  const addMembers = useCallback(
    async (selectedIds: T.Contact["id"][]) => {
      const r = await makeRequest("add-member", {
        members: selectedIds,
      });
      db.addGroup(r.group);
      closeModal();
    },
    [makeRequest, db, closeModal],
  );
  const removeMembers = useCallback(
    async (selectedIds: T.Contact["id"][]) => {
      const r = await makeRequest("remove-member", {
        members: selectedIds,
      });

      db.addGroup(r.group);
      closeModal();
    },
    [makeRequest, db, closeModal],
  );

  const addAdmins = useCallback(
    async (selectedIds: T.Contact["id"][]) => {
      const r = await makeRequest("add-admin", {
        admins: selectedIds,
      });

      db.addGroup(r.group);
      closeModal();
    },
    [makeRequest, db, closeModal],
  );
  const removeAdmins = useCallback(
    async (selectedIds: T.Contact["id"][]) => {
      const r = await makeRequest("remove-admin", {
        admins: selectedIds,
      });

      db.addGroup(r.group);
      closeModal();
    },
    [makeRequest, db, closeModal],
  );

  const InnerModal = () => {
    switch (modalOpen) {
      case "add-member": {
        return (
          <AddMemberScreen
            group={group}
            allContacts={allContactsButMe}
            initialMembers={group.members}
            onCancel={closeModal}
            onSubmit={addMembers}
          />
        );
      }

      case "remove-member": {
        return (
          <RemoveMemberScreen
            allMembers={allMembersButMe}
            onCancel={closeModal}
            onSubmit={removeMembers}
          />
        );
      }

      case "add-admin": {
        return (
          <AddMemberScreen
            member_or_admin="admin"
            group={group}
            allContacts={allMembersButMe}
            initialMembers={group.admins}
            onCancel={closeModal}
            onSubmit={addAdmins}
          />
        );
      }

      case "remove-admin": {
        return (
          <RemoveMemberScreen
            member_or_admin="admin"
            allMembers={allAdminsButMe}
            onCancel={closeModal}
            onSubmit={removeAdmins}
          />
        );
      }

      case undefined: {
        return null;
      }

      case "leave": {
        // TO DO: Implement leave group modal
        return null;
      }

      case "archive": {
        // TO DO: Implement archive group modal
        return null;
      }

      case "unarchive": {
        // TO DO: Implement unarchive group modal
        return null;
      }

      case "transfer-ownership": {
        // TO DO: Implement transfer ownership modal
        return null;
      }

      default: {
        assertNever(modalOpen);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.rowBackground }}>
      <UniversalHeader
        onNew={onPost}
        title="Group info"
        headerLeft={
          onDesktopClose && !isMobile()
            ? () => (
              <TouchableOpacity onPress={onDesktopClose} testID="close-button">
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
      <ScrollView style={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <BigGroupCard
              group={group}
              onPressAvatar={member_type === "is_owner" ? getPicture : null}
            />
          </View>
          {group.is_public && (
            <Text
              style={{
                marginVertical: 8,
                fontSize: 16,
                color: colors.primaryText,
              }}
            >
              This group is public, anybody can join or leave.
            </Text>
          )}
          <TopButtons
            group={group}
            membersButMe={allMembersButMe.length}
            member_type={member_type}
            justSharedLink={justSharedLink}
            getShareLink={shareGroupInviteLink}
            startRequest={startRequest}
            toFeed={toFeed}
          />

          <View style={styles.sectionOuter}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              Members ({allMembers.length})
            </Text>

            {adminContacts.length > 0 ? (
              <View style={styles.subSection}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: colors.primaryText },
                  ]}
                >
                  Admins ({adminContacts.length})
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
                    data={adminContacts}
                    renderItem={({ item, index }) =>
                      renderContact({
                        item,
                        index,
                        lastIndex: adminContacts.length - 1,
                      })
                    }
                  />
                </View>
              </View>
            ) : null}

            {otherContacts.length > 0 ? (
              <View style={styles.subSection}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: colors.primaryText },
                  ]}
                >
                  Not yet your friends ({otherContacts.length})
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
                    data={otherContacts}
                    renderItem={({ item, index }) =>
                      renderContact({
                        item,
                        index,
                        lastIndex: otherContacts.length - 1,
                      })
                    }
                  />
                </View>
              </View>
            ) : null}

            {myContacts.length > 0 ? (
              <View style={styles.subSection}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: colors.primaryText },
                  ]}
                >
                  Your friends ({myContacts.length})
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
                    data={myContacts}
                    renderItem={({ item, index }) =>
                      renderContact({
                        item,
                        index,
                        lastIndex: myContacts.length - 1,
                      })
                    }
                  />
                </View>
              </View>
            ) : null}
          </View>

          {(allAdminsButMe.length > 0 || allMembersButMe.length > 0) && (
            <BottomButtons
              groupId={groupId}
              adminsButMe={allAdminsButMe.length}
              membersButMe={allMembersButMe.length}
              member_type={member_type}
              startRequest={startRequest}
            />
          )}
        </View>
      </ScrollView>
      {modalOpen && <InnerModal />}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultHeader: { fontWeight: "600", fontSize: 16 },
  flatListContainer: {
    borderRadius: 10,
  },
  section: {
    display: "flex",
    flexDirection: "column",
  },
  sections: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  notice: { marginVertical: 4 },
  sectionOuter: { marginVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  subSectionTitle: { fontSize: 16, marginBottom: 6 },
  subSection: { marginVertical: 8 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  buttonContainer: { flex: 1 },
});

const BigGroupCard = ({
  group,
  onPressAvatar,
}: {
  group: T.Group;
  onPressAvatar?: () => void;
}) => {
  const colors = useThemeColors();
  return (
    <View>
      <View style={groupCardStyles.innerContainer}>
        {onPressAvatar ? (
          <TouchableOpacity onPress={onPressAvatar}>
            <GiftedAvatar user={group} size="hero" />
            <View
              style={[
                groupCardStyles.editIconContainer,
                { backgroundColor: colors.appBackground },
              ]}
            >
              <MaterialIcons
                name="edit"
                size={12}
                color={colors.secondaryText}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <GiftedAvatar user={group} size="hero" />
        )}
        <Text style={[groupCardStyles.bigText, { color: colors.primaryText }]}>
          {group.name} ({group.members.length})
        </Text>
      </View>
    </View>
  );
};

const GROUP_NAME_FONT_WEIGHT = "600";

const groupCardStyles = StyleSheet.create({
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  editIconContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    borderRadius: 12,
    padding: 4,
  },
  bigText: {
    marginLeft: 12,
    fontWeight: GROUP_NAME_FONT_WEIGHT,
    fontSize: 24,
  },
  smallText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: GROUP_NAME_FONT_WEIGHT,
  },
  tinyText: {
    marginLeft: 2,
    fontSize: 12,
    fontWeight: GROUP_NAME_FONT_WEIGHT,
  },
});
