import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import * as T from "../gatz/types";
import GiftedAvatar from "../gifted/GiftedAvatar";
import TouchableOpacityItem from "./TouchableOpacityItem";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const NonSelectableRow = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  const colors = useThemeColors();
  return (
    <View style={[
      styles.firstUserItem,
      styles.allUserItem,
      styles.lastUserItem,
    ]}>
      <View style={styles.span}>
        <View style={[styles.userAvatarAndName]}>
          <Text style={[styles.selectableUsername, { color: colors.primaryText }]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.descriptionStyle, { color: colors.secondaryText }]}>
              {description}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};


export const SelectableRow = ({
  selected,
  onPress,
  title,
  description,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  description?: string;
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacityItem
      style={[styles.firstUserItem, styles.allUserItem, styles.lastUserItem]}
      onPress={onPress}
    >
      <View style={styles.span}>
        <View style={[styles.userAvatarAndName]}>
          <Text style={[styles.selectableUsername, { color: colors.primaryText }]}>
            {title}
          </Text>
          {description && (
            <Text
              style={[styles.descriptionStyle, { color: colors.secondaryText }]}
            >
              {description}
            </Text>
          )}
        </View>
        {selected ? (
          <MaterialIcons
            name="check-circle"
            size={styles.checkbox.width}
            color={colors.active}
          />
        ) : (
          <View style={[styles.checkbox, { borderColor: colors.greyText }]} />
        )}
      </View>
    </TouchableOpacityItem>
  );
};

export const SelectableContactRow = ({
  index,
  item,
  selected,
  onPress,
  description,
  lastIndex,
}: {
  index: number;
  item: T.Contact;
  selected: boolean;
  onPress: (id: T.Contact["id"]) => void;
  description?: string;
  lastIndex?: number;
}) => {
  const u = { ...item, _id: item.id };
  const colors = useThemeColors();

  return (
    <TouchableOpacityItem
      style={rowOuterStyles({ index, lastIndex, colors })}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.span}>
        <View style={styles.userAvatarAndName}>
          <GiftedAvatar size="medium" user={u} />
          <Text style={[styles.selectableUsername, { color: colors.primaryText }]}          >
            {item.name}
          </Text>
          {description && (
            <Text style={[styles.descriptionStyle, { color: colors.secondaryText }]}>
              {description}
            </Text>
          )}
        </View>
        {selected ? (
          <MaterialIcons
            name="check-circle"
            size={styles.checkbox.width + 3}
            color={colors.active}
          />
        ) : (
          <View style={[styles.checkbox, { borderColor: colors.greyText }]} />
        )}
      </View>
    </TouchableOpacityItem>
  );
};

const rowOuterStyles = ({ index, lastIndex, colors }) => {
  return [
    styles.allUserItem,
    index === 0 ? styles.firstUserItem : styles.userItemInnerBorder,
    index === lastIndex
      ? [styles.lastUserItem, { borderTopColor: colors.midGrey }]
      : [styles.middleUserItem, { borderTopColor: colors.midGrey }],
    { backgroundColor: colors.appBackground },
  ];
};

// Make it accept Contact instead of User
export const Row = ({
  onPress,
  index,
  item,
  description,
  lastIndex,
}: {
  onPress?: () => void;
  index: number;
  item: T.Contact;
  description?: string;
  lastIndex?: number;
}) => {
  const u = { ...item, _id: item.id, };

  const colors = useThemeColors();

  return (
    <View style={rowOuterStyles({ index, lastIndex, colors })}>
      <View style={styles.userAvatarAndName}>
        <GiftedAvatar onPress={onPress} size="medium" user={u} />
        <Text style={[styles.selectableUsername, { color: colors.primaryText }]}>
          {item.name}
        </Text>
        {description && (
          <Text style={[styles.descriptionStyle, { color: colors.secondaryText }]}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
};

export type AnnotatedContact = T.Contact & {
  is_owner?: boolean;
  is_you?: boolean;
  is_admin?: boolean;
};

const annotatedToDescription = (item: AnnotatedContact): string => {
  if (item.is_you) {
    if (item.is_owner) {
      return "You, Owner";
    } else if (item.is_admin) {
      return "You, Admin";
    } else {
      return "You";
    }
  } else if (item.is_owner) {
    return "Owner";
  } else if (item.is_admin) {
    return "Admin";
  } else {
    return "";
  }
};

// Make it accept Contact instead of User
export const ContactInGroupRow = ({
  onPress,
  index,
  item,
  lastIndex,
}: {
  onPress?: () => void;
  index: number;
  item: AnnotatedContact;
  lastIndex?: number;
}) => {
  const u = {
    ...item,
    _id: item.id,
  };
  const description = annotatedToDescription(item);

  return (
    <Row
      index={index}
      item={item}
      description={description}
      onPress={onPress}
      lastIndex={lastIndex}
    />
  );
};

export const SelectableContactRowInGroup = ({
  onPress,
  index,
  item,
  selected,
  lastIndex,
}: {
  onPress?: (id: T.Contact["id"]) => void;
  index: number;
  item: AnnotatedContact;
  selected: boolean;
  lastIndex?: number;
}) => {
  const description = annotatedToDescription(item);

  return (
    <SelectableContactRow
      index={index}
      item={item}
      description={description}
      onPress={onPress}
      selected={selected}
      lastIndex={lastIndex}
    />
  );
};

export const SimpleRow = ({ title }: { title: string }) => {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.firstUserItem,
        styles.lastUserItem,
        styles.allUserItem,
        { backgroundColor: colors.appBackground },
      ]}
    >
      <View style={styles.userAvatarAndName}>
        <Text style={[styles.selectableUsername, { color: colors.primaryText }]}>
          {title}
        </Text>
      </View>
    </View>
  );
};

export const GroupRow = ({
  onPress,
  index,
  item,
  description,
  lastIndex,
}: {
  onPress?: () => void;
  index: number;
  item: T.Group;
  description?: string;
  lastIndex?: number;
}) => {
  const colors = useThemeColors();
  if (!item) {
    return null;
  } else {
    return (
      <View style={rowOuterStyles({ index, lastIndex, colors })}>
        <View style={styles.userAvatarAndName}>
          <GiftedAvatar onPress={onPress} size="medium" user={item} />
          <Text style={[styles.selectableUsername, { color: colors.primaryText }]}>
            {item.name} ({item.members.length})
          </Text>
          {description && (
            <Text style={[styles.descriptionStyle, { color: colors.secondaryText }]}>
              {description}
            </Text>
          )}
        </View>
      </View>
    );
  }
};

const ROW_RADIUS = 8;

const styles = StyleSheet.create({
  allUserItem: { padding: 10 },
  userItemInnerBorder: { borderTopWidth: 1 },
  lastUserItem: {
    borderBottomRightRadius: ROW_RADIUS,
    borderBottomLeftRadius: ROW_RADIUS,
  },
  firstUserItem: {
    borderTopRightRadius: ROW_RADIUS,
    borderTopLeftRadius: ROW_RADIUS,
  },
  middleUserItem: { borderRadius: 0 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  span: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectableUsername: {
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 18,
  },
  username: {},
  userAvatarAndName: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  descriptionStyle: { marginLeft: 12 },
});
