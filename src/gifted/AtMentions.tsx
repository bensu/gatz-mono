import { StyleSheet, Text, TouchableOpacity } from "react-native";
import * as T from "../gatz/types";
import GiftedAvatar from "./GiftedAvatar";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

// At mentions
// Detect usernames: the username has to be at the very end
export const USERNAME_REGEX = /@(\w*)$/;

export const PotentialMentionRow = ({
  contact,
  onPress,
}: {
  contact: T.Contact;
  onPress: (contact: T.Contact) => void;
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={(e) => {
        e.preventDefault();
        onPress(contact);
      }}
      style={[
        styles.mentionContainer,
        { backgroundColor: colors.rowBackground },
        styles.bottomBorder,
      ]}
    >
      <GiftedAvatar key={contact.id} size="small" user={contact} />
      <Text style={[styles.username, { color: colors.primaryText }]}>
        @{contact.name}
      </Text>
    </TouchableOpacity>
  );
};

export const styles = StyleSheet.create({
  username: { fontWeight: "600", fontSize: 16 },
  bottomBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mentionContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});