import React from "react";
import { View } from "react-native";
import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { InnerSelectParticipants } from "../components/SelectParticipants";

const AVATAR_URL = "https://www.shutterstock.com/image-vector/young-smiling-man-adam-avatar-600nw-2107967969.jpg";

const mockContacts: T.Contact[] = [
  { id: "user1", name: "@current", avatar: AVATAR_URL },
  { id: "user2", name: "@alice", avatar: AVATAR_URL },
  { id: "user3", name: "@bob", avatar: AVATAR_URL },
  { id: "user4", name: "@carol", avatar: AVATAR_URL },
  { id: "user5", name: "@david", avatar: AVATAR_URL },
];

const mockGroup: T.Group = {
  id: "group1",
  name: "Group Name",
  members: ["user1", "user2", "user3", "user4", "user5"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: "user1",
  owner: "user1",
  admins: [],
  joined_at: {},
  archived_uids: [],
  settings: { member_mode: "open" },
  is_public: true
};

const Template = (args: any) => {
  const colors = useThemeColors();
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.rowBackground,
      padding: 16,
      borderRadius: 10,
      maxWidth: 600,
    }}>
      <InnerSelectParticipants {...args} />
    </View>
  );
};

const defaultArgs = {
  isVisible: true,
  onClose: () => { },
  allFriends: mockContacts,
  friendsOfFriends: mockContacts,
  selectedContactIds: new Set(["user2"]),
  onTapContact: () => { },
  onTapAll: () => { },
  userId: "user1",
  onTapFriendsOfFriends: () => { console.log("onTapFriendsOfFriends") },
  allFriendsAreSelected: false,
  selectionCase: { type: "friendsOfFriends" },
};


export default {
  title: "Components/InnerSelectParticipants",
  component: Template,
  args: {
    default: { ...defaultArgs },
    allFriendsSelected: {
      ...defaultArgs,
      selectedContactIds: new Set(["user1", "user2", "user3", "user4", "user5"]),
      allFriendsAreSelected: true,
      selectionCase: { type: "friends" },
    },
    someFriendsSelected: {
      ...defaultArgs,
      selectedContactIds: new Set(["user1", "user2"]),
      allFriendsAreSelected: false,
      selectionCase: { type: "friends", selectedContactIds: new Set(["user1", "user2"]) },
    },

    withGroup: {
      ...defaultArgs,
      group: mockGroup,
      selectedContactIds: new Set(["user2", "user3"]),
      selectionCase: { type: "group" },
    },
    withForcedSelection: {
      ...defaultArgs,
      forcedSelectedContactIds: new Set(["user2"]),
      selectionCase: { type: "friends", selectedContactIds: new Set(["user2"]) },
    },
    emptySelection: {
      ...defaultArgs,
      selectedContactIds: new Set([]),
      selectionCase: { type: "friends", selectedContactIds: new Set([]) },
    }
  },
};
