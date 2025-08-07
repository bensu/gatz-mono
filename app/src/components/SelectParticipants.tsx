import React, { useCallback, useContext, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, Text, Switch, Platform } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";

import * as T from "../gatz/types";

import { BottomSheet } from "./BottomSheet";
import { SelectableRow, SelectableContactRow, Row as ContactRow } from "./contacts";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { SessionContext } from "../context/SessionProvider";
import { assertNever } from "../util";
import GiftedAvatar from "../gifted/GiftedAvatar";
import { SearchBar } from "./SearchInput";
import { FrontendDBContext } from "../context/FrontendDBProvider";

const keyExtractor = (item: T.Contact) => item.id;

type AllFriendsSelectionCase = { type: "allFriends" };
type SelectedFriendsSelectionCase = { type: "selectedFriends", selectedContactIds: Set<T.Contact["id"]> };
type GroupSelectionCase = { type: "group", selectedContactIds: Set<T.Contact["id"]>, group: T.Group, groupMembers: Set<T.Contact["id"]> };
type AllGroupMembers = { type: "allGroupMembers", group: T.Group, groupMembers: Set<T.Contact["id"]> };
type DMToSelectionCase = { type: "DM", friendId: T.Contact["id"] };
type EmptySelectionCase = { type: "empty" };
type FriendsOfFriendsSelectionCase = { type: "friendsOfFriends" };

export type SelectionCase =
  | GroupSelectionCase
  | FriendsOfFriendsSelectionCase
  | AllFriendsSelectionCase
  | AllGroupMembers
  | SelectedFriendsSelectionCase
  | DMToSelectionCase
  | EmptySelectionCase

export const initialSelectionCase = (
  userId: T.User["id"],
  group: T.Group | undefined,
  groupMembers: Set<T.Contact["id"]> | undefined,
  seedDiscussion: T.Discussion | undefined,
  postToFriendsOfFriends: boolean,
  contactId: T.Contact["id"] | undefined,
): SelectionCase => {
  if (contactId) {
    return { type: "DM", friendId: contactId };
  } else if (seedDiscussion) {
    if (seedDiscussion.group_id && group) {
      // It is expected for the group to be passed if the seedDiscussion has a group_id
      if (seedDiscussion.group_id !== group.id) {
        throw new Error("Group id mismatch");
      }
      if (!groupMembers) {
        throw new Error("Group members are not defined");
      }
      switch (seedDiscussion.member_mode) {
        case "open": {
          return {
            type: "allGroupMembers",
            group,
            groupMembers,
          };
        }
        default: {
          return {
            type: "group",
            selectedContactIds: new Set(seedDiscussion.members),
            group,
            groupMembers,
          };
        }
      }
    } else {
      switch (seedDiscussion.member_mode) {
        case "open": {
          return { type: "allFriends" };
        }
        case "friends_of_friends": {
          return { type: "friendsOfFriends", };
        }
        default: {
          const nonMeMembers = Array.from(seedDiscussion.members).filter((id) => id !== userId);
          if (nonMeMembers.length === 1) {
            return { type: "DM", friendId: nonMeMembers[0] };
          } else {
            return {
              type: "selectedFriends",
              selectedContactIds: new Set(nonMeMembers),
            }
          }
        }
      }
    }
  } else if (group) {
    switch (group.settings.member_mode) {
      case "open": {
        return {
          type: "allGroupMembers",
          group,
          groupMembers,
        };
      }
      default: {
        return {
          type: "group",
          selectedContactIds: new Set(group.members),
          group,
          groupMembers: groupMembers,
        };
      }
    }
  } else if (postToFriendsOfFriends) {
    return { type: "friendsOfFriends" };
  } else {
    return { type: "allFriends" };
  }
}
const isSelected = (selectionCase: SelectionCase, contactId: T.Contact["id"]) => {
  switch (selectionCase.type) {
    case "allFriends": {
      return true;
    }
    case "selectedFriends": {
      return selectionCase.selectedContactIds.has(contactId);
    }
    case "group": {
      return selectionCase.selectedContactIds.has(contactId);
    }
    case "allGroupMembers": {
      return selectionCase.groupMembers.has(contactId);
    }
    case "DM": {
      return selectionCase.friendId === contactId;
    }
    case "friendsOfFriends": {
      return true;
    }
    case "empty": {
      return false;
    }
    default: {
      assertNever(selectionCase);
      return false;
    }
  }
};

const countSelectedFriends = (selectionCase: SelectionCase, allFriends: T.Contact[], friendsOfFriends: T.Contact[]) => {
  switch (selectionCase.type) {
    case "friendsOfFriends": {
      return friendsOfFriends.length + allFriends.length;
    }
    case "allFriends": {
      return allFriends.length;
    }
    case "selectedFriends": {
      return selectionCase.selectedContactIds.size;
    }
    case "group": {
      return selectionCase.selectedContactIds.size;
    }
    case "allGroupMembers": {
      return selectionCase.groupMembers.size;
    }
    case "DM": {
      return 1;
    }
    case "empty": {
      return 0;
    }
    default: {
      assertNever(selectionCase);
      return 0;
    }
  }
};


export const canPost = (selectionCase: SelectionCase, allFriends: T.Contact[], allFriendsOfFriends: T.Contact[]) => {
  switch (selectionCase.type) {
    case "friendsOfFriends": {
      return (allFriendsOfFriends.length + allFriends.length) > 0;
    }
    case "allFriends": {
      return allFriends.length > 0;
    }
    case "group": {
      return selectionCase.selectedContactIds.size > 0;
    }
    case "allGroupMembers": {
      return selectionCase.groupMembers.size > 0;
    }
    case "selectedFriends": {
      return selectionCase.selectedContactIds.size > 0;
    }
    case "DM": {
      return selectionCase.friendId !== undefined;
    }
    case "empty": {
      return false;
    }
    default: {
      assertNever(selectionCase);
      return false;
    }
  }
};

const MemoSelectableContactRow = React.memo(SelectableContactRow);

type Props = {
  onClose: () => void;
  isVisible: boolean;
  group?: T.Group;

  forcedSelectedContactIds?: Set<T.Contact["id"]>;
  allSortedFriends: T.Contact[];
  allSortedFriendsOfFriends: T.Contact[];

  onTapAllFriends: () => void;
  onTapFriendsOfFriends: () => void;

  selectionCase: SelectionCase;
  onTapAllGroupMembers: () => void;

  onTapContact: (id: T.Contact["id"]) => void;
};

export const InnerSelectParticipants = ({
  allSortedFriends,
  group,
  onTapContact,
  onTapAllFriends,
  forcedSelectedContactIds,
  onTapFriendsOfFriends,
  allSortedFriendsOfFriends,
  onTapAllGroupMembers,
  selectionCase,
}: Props) => {
  const friendsOfFriendsSelected = selectionCase.type === "friendsOfFriends";
  const { session: { userId } } = useContext(SessionContext);
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();

  const postToFriendsOfFriends = db.getFeatureFlag("post_to_friends_of_friends");

  const [searchText, setSearchText] = useState<string>("");

  const numberOfSelectedFriends = countSelectedFriends(selectionCase, allSortedFriends, allSortedFriendsOfFriends);

  const filteredFriends: T.Contact[] | undefined = useMemo(() => {
    if (allSortedFriends) {
      if (searchText === "") {
        return allSortedFriends.filter((contact) => userId !== contact.id);
      } else {
        return allSortedFriends
          .filter((contact) => userId !== contact.id)
          .filter((contact) =>
            contact.name.toLowerCase().includes(searchText.toLowerCase()),
          );
      }
    }
  }, [allSortedFriends, searchText]);

  const filteredFriendsOfFriends: T.Contact[] | undefined = useMemo(() => {
    if (allSortedFriendsOfFriends) {
      if (!searchText) {
        return allSortedFriendsOfFriends;
      } else {
        return allSortedFriendsOfFriends.filter((contact) =>
          contact.name.toLowerCase().includes(searchText.toLowerCase()),
        );
      }
    }
  }, [allSortedFriendsOfFriends, searchText]);

  const onSelectFriend = useCallback((id: T.Contact["id"]) => {
    const isForcedSelected = forcedSelectedContactIds?.has(id);
    if (!isForcedSelected) { onTapContact(id); }
  }, [onTapContact, forcedSelectedContactIds]);

  const renderFriendsOfFriends = (selectionCase: AllFriendsSelectionCase | FriendsOfFriendsSelectionCase | SelectedFriendsSelectionCase | DMToSelectionCase | EmptySelectionCase) => {

    const renderFriendsOfFriendsRow = ({ item, index }: { item: T.Contact; index: number; }) => {
      return <ContactRow index={index} item={item} lastIndex={filteredFriendsOfFriends?.length - 1} />;
    };
    const renderFriendsRow = ({ item, index }: { item: T.Contact; index: number; }) => {
      return <ContactRow index={index} item={item} lastIndex={filteredFriends?.length - 1} />;
    };

    const renderSelectUser = ({ item, index, }: { item: T.Contact; index: number; }) => {
      if (item.id === userId) {
        return <ContactRow index={index} item={item} description="You" />;
      } else {
        const isForcedSelected = forcedSelectedContactIds?.has(item.id);
        const selected = isSelected(selectionCase, item.id);
        return (
          <MemoSelectableContactRow
            key={item.id}
            index={index}
            item={item}
            selected={selected}
            onPress={onSelectFriend}
            lastIndex={filteredFriends.length - 1}
            description={isForcedSelected ? "Original message author" : undefined}
          />
        );
      }
    };

    // TODO: the scroll is not working for friends of friends
    return (
      <>
        <View style={[styles.flatListContainer, { marginBottom: 12, backgroundColor: colors.appBackground }]}>
          <FriendsOfFriendRow
            selected={friendsOfFriendsSelected}
            onPress={onTapFriendsOfFriends}
            disabled={false}
          />
        </View>
        {!friendsOfFriendsSelected && (
          <View style={[styles.flatListContainer, { marginBottom: 12, backgroundColor: colors.appBackground }]}>
            <AllFriendsRow
              selected={allFriendsAreSelected}
              onPress={onTapAllFriends}
              disabled={false}
            />
          </View>
        )}
        <Animated.View entering={FadeInUp.duration(200)}>
          {friendsOfFriendsSelected && (
            <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
              When you include Friends of Friends, they all have to be included
            </Text>
          )}
          {friendsOfFriendsSelected && filteredFriendsOfFriends && (
            <View style={{ marginTop: 16 }}>
              <View style={[styles.sectionRow]}>
                <MaterialIcons name="people-alt" size={24} color={colors.primaryText} />
                <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                  Friends of friends ({filteredFriendsOfFriends.length})
                </Text>
              </View>
              {filteredFriendsOfFriends.length > 0 ? (
                <View style={[
                  styles.flatListContainer,
                  { backgroundColor: colors.appBackground }
                ]}>
                  <FlatList<T.Contact>
                    scrollEnabled={false}
                    keyExtractor={keyExtractor}
                    data={filteredFriendsOfFriends}
                    renderItem={renderFriendsOfFriendsRow}
                  />
                </View>
              ) : searchText.length > 0 ? (
                <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                  No friends of friends matching "{searchText}"
                </Text>
              ) : (
                <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                  No friends of friends yet
                </Text>
              )}
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <View style={[styles.sectionRow]}>
              <MaterialIcons name="person" size={24} color={colors.primaryText} />
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Friends ({filteredFriends.length})
              </Text>
            </View>
            {filteredFriends.length > 0 ? (
              <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
                <FlatList<T.Contact>
                  scrollEnabled={false}
                  keyExtractor={keyExtractor}
                  data={filteredFriends}
                  renderItem={friendsOfFriendsSelected ? renderFriendsRow : renderSelectUser}
                />
              </View>
            ) : searchText.length > 0 ? (
              <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                No friends matching "{searchText}"
              </Text>
            ) : (
              <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
                No friends yet
              </Text>
            )}
          </View>
        </Animated.View>
      </>
    )
  }

  const renderGroup = (selectionCase: GroupSelectionCase | AllGroupMembers) => {

    const renderSelectUser = ({ item, index, }: { item: T.Contact; index: number; }) => {
      if (item.id === userId) {
        return <ContactRow index={index} item={item} description="You" />;
      } else {
        const isForcedSelected = forcedSelectedContactIds?.has(item.id);
        const selected = isSelected(selectionCase, item.id);
        return (
          <SelectableContactRow
            index={index}
            item={item}
            selected={selected}
            onPress={() => onSelectFriend(item.id)}
            lastIndex={filteredFriends.length - 1}
            description={isForcedSelected ? "Original message author" : undefined}
          />
        );
      }
    };

    return (
      <>
        <View style={[styles.flatListContainer, { marginBottom: 12, backgroundColor: colors.appBackground }]}>
          <AllGroupMembersRow
            selected={selectionCase.type === "allGroupMembers"}
            onPress={onTapAllGroupMembers}
            disabled={false}
          />
        </View>
        <View style={{ marginTop: 16 }}>
          <View style={[styles.sectionRow]}>
            <GiftedAvatar user={group} size="small" />
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              {group.name} members ({numberOfSelectedFriends})
            </Text>
          </View>
          {filteredFriends.length > 0 ? (
            <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
              <FlatList<T.Contact>
                scrollEnabled={false}
                keyExtractor={keyExtractor}
                data={filteredFriends}
                renderItem={renderSelectUser}
              />
            </View>
          ) : (
            <Text style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 16 }}>
              No members matching "{searchText}"
            </Text>
          )}
        </View>
      </>
    )
  }



  const renderInner = () => {
    const selectionCaseType = selectionCase.type;
    switch (selectionCaseType) {
      case "group": {
        return renderGroup(selectionCase);
      }
      case "allGroupMembers": {
        return renderGroup(selectionCase);
      }
      case "friendsOfFriends": {
        return renderFriendsOfFriends(selectionCase);
      }
      case "allFriends": {
        return renderFriendsOfFriends(selectionCase);
      }
      case "selectedFriends": {
        return renderFriendsOfFriends(selectionCase);
      }
      case "DM": {
        return renderFriendsOfFriends(selectionCase);
      }
      case "empty": {
        return renderFriendsOfFriends(selectionCase);
      }

      default: {
        assertNever(selectionCaseType);
        return null;
      }
    }
  }

  const allFriendsAreSelected = selectionCase.type === "allFriends";

  return (
    <View style={styles.innerContainer}>
      {Platform.OS !== "android" && (
        <View style={{ marginBottom: 12 }}>
          <SearchBar
            placeholder="Search"
            onChangeText={setSearchText}
            onClear={() => setSearchText("")}
            value={searchText}
          />
        </View>
      )}
      {renderInner()}
    </View>
  );
};

export const SelectParticipants = (props: Props) => {
  const { isVisible, onClose, group } = props;
  const selectionCase = props.selectionCase;
  const selectionCaseType = selectionCase.type;
  const numberOfSelectedFriends = countSelectedFriends(selectionCase, props.allSortedFriends, props.allSortedFriendsOfFriends);

  let title: string;
  switch (selectionCaseType) {
    case "friendsOfFriends": {
      title = `Friends of friends (${numberOfSelectedFriends})`;
      break;
    }
    case "allFriends": {
      title = `All friends (${numberOfSelectedFriends})`;
      break;
    }
    case "group": {
      if (!group) {
        throw new Error("Group is not defined");
      }
      title = `${group.name} (${numberOfSelectedFriends}/${group.members.length - 1})`;
      break;
    }
    case "allGroupMembers": {
      title = `${group.name}`;
      break;
    }
    case "selectedFriends": {
      title = `Selected friends (${numberOfSelectedFriends})`;
      break;
    }
    case "DM": {
      const dmToContact = props.allSortedFriends.find((c) => c.id === selectionCase.friendId);
      if (!dmToContact) {
        throw new Error("DM to contact not found");
      }
      title = `DM to ${dmToContact.name}`;
      break;
    }
    case "empty": {
      title = `No one here`;
      break;
    }
    default: {
      assertNever(selectionCaseType);
    }
  }
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title={title}    >
      <InnerSelectParticipants {...props} />
    </BottomSheet>
  );
}

const ROW_RADIUS = 8;


const styles = StyleSheet.create({
  sectionRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", },
  firstUserItem: {
    borderTopRightRadius: ROW_RADIUS,
    borderTopLeftRadius: ROW_RADIUS,
  },
  allUserItem: { padding: 10 },
  span: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userItemInnerBorder: { borderTopWidth: 1 },
  lastUserItem: {
    borderBottomRightRadius: ROW_RADIUS,
    borderBottomLeftRadius: ROW_RADIUS,
  },
  userAvatarAndName: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  selectableUsername: {
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 18,
  },
  container: { flex: 1, marginTop: 50, },
  innerContainer: {
    display: "flex",
    flexDirection: "column",
    // gap between elements
    // margin between elements inside this container
    flex: 1,
  },
  flatListContainer: { borderRadius: 10, },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export const AllGroupMembersRow = ({ selected, onPress, disabled }: {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const colors = useThemeColors();
  const color = disabled ? colors.softGrey : colors.primaryText;
  return (
    <View style={[styles.firstUserItem, styles.allUserItem, styles.lastUserItem]}>
      <View style={styles.span}>
        <View style={[styles.userAvatarAndName]}>
          <MaterialIcons name="people" size={styles.checkbox.width} color={color} />
          <Text style={[styles.selectableUsername, { color }]}>
            Include all group members
          </Text>
        </View>
        <Switch
          ios_backgroundColor={colors.switchBackground}
          onValueChange={onPress}
          value={selected}
          disabled={disabled}
        />
      </View>
    </View>
  );
};



export const FriendsOfFriendRow = ({ selected, onPress, disabled }: {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const colors = useThemeColors();
  const color = disabled ? colors.softGrey : colors.primaryText;
  return (
    <View style={[styles.firstUserItem, styles.allUserItem, styles.lastUserItem]}>
      <View style={styles.span}>
        <View style={[styles.userAvatarAndName]}>
          <MaterialIcons name="people-alt" size={styles.checkbox.width} color={color} />
          <Text style={[styles.selectableUsername, { color }]}>
            Include all friends of friends
          </Text>
        </View>
        <Switch
          ios_backgroundColor={colors.switchBackground}
          onValueChange={onPress}
          value={selected}
          disabled={disabled}
        />
      </View>
    </View>
  );
};

export const AllFriendsRow = ({ selected, onPress, disabled }: {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const colors = useThemeColors();
  const color = disabled ? colors.softGrey : colors.primaryText;
  return (
    <View style={[styles.firstUserItem, styles.allUserItem, styles.lastUserItem]}>
      <View style={styles.span}>
        <View style={[styles.userAvatarAndName]}>
          <MaterialIcons name="person" size={styles.checkbox.width} color={color} />
          <Text style={[styles.selectableUsername, { color }]}>
            Include all friends
          </Text>
        </View>
        <Switch
          ios_backgroundColor={colors.switchBackground}
          onValueChange={onPress}
          value={selected}
          disabled={disabled}
        />
      </View>
    </View>
  );
};


