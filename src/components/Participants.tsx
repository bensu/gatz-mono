import { StyleSheet, View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import GiftedAvatar, {
  AvatarSize,
  TextBubble,
  GroupCard,
} from "../gifted/GiftedAvatar";

import { assertNever } from "../util";
import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { TEST_ID } from "../gifted/Constant";

enum ParticipantsLayout {
  Empty = "Empty",
  Few = "Few",
  Many = "Many",
}

type ParticipantsGroup =
  | { type: ParticipantsLayout.Empty }
  | { type: ParticipantsLayout.Few; users: T.Contact[] }
  | { type: ParticipantsLayout.Many; users: T.Contact[]; andMore: number };


const groupParticipants = (unsortedUsers: T.Contact[], maxParticipants: number): ParticipantsGroup => {
  const users = unsortedUsers.sort((a, b) => a.id.localeCompare(b.id));
  const n = users.length;
  if (n === 0) {
    return { type: ParticipantsLayout.Empty };
  } else if (n < (maxParticipants + 3)) {
    return { type: ParticipantsLayout.Few, users: users };
  } else {
    return {
      type: ParticipantsLayout.Many,
      users: users.slice(0, maxParticipants),
      andMore: users.length - maxParticipants,
    };

  }
};

const AvatarBubbles = ({
  size,
  users,
}: {
  size?: AvatarSize;
  users: T.Contact[];
}) => {
  return (
    <View style={styles.avatarBubbles}>
      {users.map((user) => {
        if (user) {
          return (
            <View key={user.id} style={styles.avatarWrapper}>
              <GiftedAvatar size={size} user={user} />
            </View>
          );
        } else {
          return null;
        }
      })}
    </View>
  );
};

export const ContactsSummary = ({
  contactsCount,
  size,
  withExplanation = false,
  friendsOfFriends = false,
  color,
}: {
  size?: AvatarSize;
  contactsCount: number;
  withExplanation?: boolean;
  friendsOfFriends?: boolean;
  color?: string;
}) => {

  const colors = useThemeColors();
  const iconSize = size === "tiny" ? 20 : 24;
  const fontSize = size === "tiny" ? 14 : 16;
  const finalColor = color || colors.strongGrey;
  const textStyles = [styles.bold, { color: finalColor, fontSize }];
  const icon = friendsOfFriends ? "people-alt" : "person";
  if (withExplanation) {
    return (
      <View style={[styles.row]} testID={TEST_ID.CONTACTS_SUMMARY}>
        <View style={{ marginRight: 4 }}>
          <MaterialIcons name={icon} size={iconSize} color={finalColor} />
        </View>
        <Text style={textStyles}>
          {friendsOfFriends ? "Friends of friends" : "Friends"} ({contactsCount})
        </Text>
        <Text style={textStyles}>
        </Text>
      </View >
    );
  } else {
    return (
      <View style={[styles.row]} testID={TEST_ID.CONTACTS_SUMMARY}>
        <MaterialIcons name={icon} size={iconSize} color={finalColor} />
        <Text style={textStyles}>({contactsCount})</Text>
      </View>
    );
  }
};

export interface IAvatar {
  id: string;
  name: string;
  avatar: string;
}


const MAX_PARTICIPANTS = 3;

export const Participants = (
  { users, size, maxParticipants = MAX_PARTICIPANTS }: { size?: AvatarSize; users: IAvatar[]; maxParticipants?: number }
) => {
  const layout = groupParticipants(users, maxParticipants);
  const layoutType = layout.type;
  switch (layoutType) {
    case ParticipantsLayout.Empty: {
      return <Text>No one here</Text>;
    }
    case ParticipantsLayout.Few: {
      return (
        <View style={{ marginRight: 4 }}>
          <AvatarBubbles size={size} users={layout.users} />
        </View>
      );
    }
    case ParticipantsLayout.Many: {
      return (
        <View style={styles.overallSpan}>
          <AvatarBubbles size={size} users={layout.users} />
          <TextBubble size={size} text={`+${layout.andMore}`} />
        </View>
      );
    }
    default: {
      assertNever(layoutType);
    }
  }
};

export const DMParticipants = ({
  user,
  size,
}: {
  size: AvatarSize;
  user: T.Contact;
}) => {
  return (
    <View style={styles.overallSpan}>
      <AvatarBubbles size={size} users={[user]} />
    </View>
  );
};

export const GroupParticipants = ({
  group,
  size,
  users,
}: {
  group: T.Group;
  size: AvatarSize;
  users: T.Contact["id"][];
}) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} testID={TEST_ID.GROUP_PARTICIPANTS}>
      <GroupCard group={group} size={size} contacts={users} />
    </View>
  );
};

export const DMIcon = ({ color }: { color?: string }) => {
  const colors = useThemeColors();
  const finalColor = color || colors.strongGrey;
  // <Text style={[styles.bold, { color: colors.secondaryText }]}>DM</Text>
  return (
    <View style={styles.row} testID={TEST_ID.DM_ICON}>
      <MaterialIcons name="email" size={20} color={finalColor} />
    </View>
  );
};

export const DMTo = ({
  iconPosition = "right",
  contact,
  color,
}: {
  iconPosition: "left" | "right";
  contact: T.Contact;
  color?: string;
}) => {
  const colors = useThemeColors();
  const finalColor = color || colors.primaryText;
  return (
    <View style={[styles.row, { gap: 8 }]}>
      {iconPosition === "left" && <DMIcon color={finalColor} />}
      <View style={[styles.row, { gap: 8 }]}>
        <DMParticipants size="small" user={contact} />
        <Text style={[styles.bold, { color: finalColor }]}>
          {contact.name}
        </Text>
      </View>
      {iconPosition === "right" && <DMIcon />}
    </View>
  );
};

const styles = StyleSheet.create({
  overallSpan: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    marginRight: -4,
  },
  avatarBubbles: {
    display: "flex",
    flexDirection: "row",
  },
  bold: { fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center" },
});
