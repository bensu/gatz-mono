import PropTypes from "prop-types";
import React, { useState, useContext, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { assertNever, getUserId } from "../util";
import { TEST_ID } from "./Constant";

import { Styles as GatzStyles } from "../gatz/styles";
import * as T from "../gatz/types";

import { FrontendDBContext } from "../context/FrontendDBProvider";
import { ClientContext } from "../context/ClientProvider";

import Color from "./Color";
import { useThemeColors } from "./hooks/useThemeColors";
import { SessionContext } from "../context/SessionProvider";

const AVATAR_CACHING_POLICY = "disk";

const {
  carrot,
  emerald,
  peterRiver,
  wisteria,
  alizarin,
  turquoise,
  midnightBlue,
} = Color;

export type AvatarSize = "tiny" | "small" | "medium" | "hero" | "jumbo";

interface IAvatar {
  id: string;
  name?: string;
  avatar?: string;
}

export interface GiftedAvatarProps {
  user?: IAvatar;
  onPress?(props: any): void;
  onLongPress?(props: any): void;
  size?: AvatarSize;
}

const SIZE_STYLES = {
  tiny: GatzStyles.tinyAvatar,
  small: GatzStyles.smallAvatar,
  medium: GatzStyles.mediumAvatar,
  hero: GatzStyles.heroAvatar,
  jumbo: GatzStyles.jumboAvatar,
};

export const TextBubble = ({
  size = "small",
  text,
}: {
  size?: AvatarSize;
  text: string;
}) => {
  const sizeStyle = SIZE_STYLES[size];
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.avatarCenter,
        sizeStyle,
        { backgroundColor: colors.bubbleBackground },
      ]}
    >
      <Text
        style={[styles.textStyle, { fontSize: 10, color: colors.bubbleText }]}
      >
        {text}
      </Text>
    </View>
  );
};

export default class GiftedAvatar extends React.Component<GiftedAvatarProps> {
  static defaultProps = {
    user: {
      name: null,
      avatar: null,
    },
    onPress: undefined,
    onLongPress: undefined,
    size: "small",
  };

  static propTypes = {
    user: PropTypes.object,
    onPress: PropTypes.func,
    onLongPress: PropTypes.func,
    size: PropTypes.oneOf(["small", "medium", "hero", "tiny", "jumbo"]),
  };

  avatarName?: string = undefined;
  avatarColor?: string = undefined;

  getSizeStyles() {
    return SIZE_STYLES[this.props.size || "small"];
  }

  getAvatarStyles() {
    const { fontSize, ...sizeStyles } = this.getSizeStyles();
    return [sizeStyles, styles.avatarCenter];
  }

  setAvatarColor() {
    const userName = (this.props.user && this.props.user.name) || "";
    const name = userName.toUpperCase().split(" ");

    if (name.length === 1) {
      this.avatarName = `${name[0].charAt(0)}`;
    } else if (name.length > 1) {
      this.avatarName = `${name[0].charAt(0)}${name[1].charAt(0)}`;
    } else {
      this.avatarName = "";
    }

    let sumChars = 0;
    for (let i = 0; i < userName.length; i += 1) {
      sumChars += userName.charCodeAt(i);
    }

    // inspired by https://github.com/wbinnssmith/react-user-avatar
    // colors from https://flatuicolors.com/
    const colors = [
      carrot,
      emerald,
      peterRiver,
      wisteria,
      alizarin,
      turquoise,
      midnightBlue,
    ];

    this.avatarColor = colors[sumChars % colors.length];
  }

  renderAvatar() {
    const avatarStyles = this.getAvatarStyles();
    const { user } = this.props;
    if (user) {
      if (typeof user.avatar === "string") {
        return (
          <Image
            cachePolicy={AVATAR_CACHING_POLICY}
            source={{ uri: user.avatar }}
            style={avatarStyles}
          />
        );
      } else if (typeof user.avatar === "number") {
        return (
          <Image
            cachePolicy={AVATAR_CACHING_POLICY}
            source={user.avatar}
            style={avatarStyles}
          />
        );
      }
    }
    return null;
  }

  renderInitials() {
    const sizeStyle = this.getSizeStyles();
    return (
      // i think in this case the font color should be white as it has a great contrast with the avatars background color
      <Text
        style={[
          styles.textStyle,
          { fontSize: sizeStyle.fontSize, color: "white" },
        ]}
      >
        {this.avatarName}
      </Text>
    );
  }

  handleOnPress = () => {
    const { onPress, ...other } = this.props;
    if (this.props.onPress) {
      this.props.onPress(other);
    }
  };

  handleOnLongPress = () => { };

  render() {
    const avatarStyles = this.getAvatarStyles();
    const { user, onPress, onLongPress } = this.props;
    if (
      !user ||
      (!user.name && !user.avatar)
    ) {
      // render placeholder
      return (
        <View
          style={[...avatarStyles, styles.avatarTransparent]}
          accessibilityRole="image"
        />
      );
    }
    if (this.props.user.avatar) {
      return (
        <TouchableOpacity
          disabled={!onPress}
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole="image"
        >
          {this.renderAvatar()}
        </TouchableOpacity>
      );
    }

    this.setAvatarColor();

    return (
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[avatarStyles, { backgroundColor: this.avatarColor }]}
        accessibilityRole="image"
      >
        {this.renderInitials()}
      </TouchableOpacity>
    );
  }
}

export const withUserSubscription = (userId: T.Contact["id"]) => {
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const [contact, setContact] = useState<T.Contact | "loading" | null>(null);

  useEffect(() => {
    const setIContact = (c: T.Contact) => setContact(c);
    const maybeContact = db.maybeGetUserById(userId);

    // TODO: what if the user is not in the database?
    if (maybeContact) {
      setIContact(maybeContact);
    } else {
      setContact("loading");
      gatzClient.getUser(userId).then((r) => {
        // Convert User to Contact
        const userAsContact: T.Contact = {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar,
          profile: r.user.profile
        };
        setContact(userAsContact);
      });
    }
    const lId = db.listenToUser(userId, setIContact as (u: T.User) => void);

    return () => db.removeUserListener(userId, lId);
  }, [db, setContact, userId]);
  return { contact, isLoading: contact === "loading" };
};

interface ReactiveGiftedAvatarProps {
  userId: T.Contact["id"];
  onPress?(props: any): void;
  onLongPress?(props: any): void;
  size?: "small" | "medium";
}

export const ReactiveGiftedAvatar = (props: ReactiveGiftedAvatarProps) => {
  const { db } = useContext(FrontendDBContext);
  const [user, setUser] = useState<T.Contact | null>(null);

  useEffect(() => {
    const setIUser = (u: T.Contact) => setUser(u);
    const user = db.getUserById(props.userId);
    setIUser(user);
    const lId = db.listenToUser(props.userId, setIUser as (u: T.User) => void);

    return () => db.removeUserListener(props.userId, lId);
  }, [db, setUser, props.userId]);

  return <GiftedAvatar user={user} {...props} />;
};

export const ReactiveAvatarWithName = (props: ReactiveGiftedAvatarProps) => {
  const { contact } = withUserSubscription(props.userId);
  if (contact === "loading") {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.avatarWithNameOuter}>
      <GiftedAvatar user={contact} {...props} />
      <Username username={contact?.name} />
    </View>
  );
};

export const Username = ({
  username,
  andMore,
}: {
  username: string;
  andMore?: string;
}) => {
  const colors = useThemeColors();
  return (
    <Text style={{ marginLeft: 4 }}>
      <Text style={[styles.avatarWithNameText, { color: colors.primaryText }]}>
        {username}
      </Text>{" "}
      {andMore && (
        <Text
          style={[styles.avatarWithMoreText, { color: colors.primaryText }]}
        >
          {andMore}
        </Text>
      )}
    </Text>
  );
};

const BADGE_SIZE = 14;

export const WrappedAvatar = (props: GiftedAvatarProps) => {
  // check if the user is a contact
  const { db } = useContext(FrontendDBContext);
  const { session: { userId } } = useContext(SessionContext);
  const colors = useThemeColors();

  const isMyContact = db.isMyContact(getUserId(props.user));
  const isSelf = getUserId(props.user) === userId;
  if (isMyContact || isSelf) {
    return <GiftedAvatar {...props} />;
  } else {
    const { onPress, onLongPress, ...avatarProps } = props;
    return (
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        onLongPress={onLongPress}
        style={{ position: "relative" }}
      >
        <GiftedAvatar {...avatarProps} />
        <View style={styles.addContactBadge}>
          <MaterialIcons
            name="add-circle"
            size={BADGE_SIZE}
            color={colors.strongGrey}
          />
        </View>
      </TouchableOpacity>
    );
  }
};

export const WrappedUsernameWithAvatar = (props: GiftedAvatarProps & { andMore?: string },) => {
  return (
    <View style={styles.avatarUsernameContainer} testID={TEST_ID.AVATAR}>
      <WrappedAvatar {...props} />
      <Username andMore={props.andMore} username={props.user.name} />
    </View>
  );
};



export const UsernameWithAvatar = (props: GiftedAvatarProps & { andMore?: string },) => {
  return (
    <View style={styles.avatarUsernameContainer}>
      <GiftedAvatar {...props} />
      <Username andMore={props.andMore} username={props.user.name} />
    </View>
  );
};


const styles = StyleSheet.create({
  addContactBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    borderRadius: BADGE_SIZE,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUsernameContainer: {
    flexDirection: "row",
    marginRight: 4,
    alignItems: "center",
  },

  avatarWithNameOuter: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWithNameText: {
    fontWeight: "600",
    fontSize: 16,
  },
  avatarWithMoreText: { fontSize: 16 },
  avatarCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTransparent: {
    backgroundColor: Color.backgroundTransparent,
  },
  textStyle: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export const BigGroupCard = ({ group }: { group: T.Group }) => {
  const colors = useThemeColors();
  return (
    <View>
      <View style={[groupCardStyles.innerContainer]}>
        <GiftedAvatar user={group} size="hero" />
        <Text style={[groupCardStyles.bigText, { color: colors.primaryText }]}>
          {group.name} ({group.members.length}) {group.is_public && "(public)"}
        </Text>
      </View>
    </View>
  );
};

export const SmallGroupCard = ({
  group,
  contacts,
}: {
  group: T.Group;
  contacts?: T.Contact["id"][];
}) => {
  const colors = useThemeColors();
  return (
    <View>
      <View
        style={[
          groupCardStyles.innerContainer,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <GiftedAvatar user={group} size="small" />
        <Text
          style={[groupCardStyles.smallText, { color: colors.primaryText }]}
        >
          {group.name}
        </Text>
        {contacts && contacts.length > 0 && (
          <Text
            style={[groupCardStyles.smallText, { color: colors.primaryText }]}
          >
            ({contacts.length}/{group.members.length}){" "}
            {group.is_public && "(public)"}
          </Text>
        )}
      </View>
    </View>
  );
};

export const TinyGroupCard = ({ group }: { group: T.Group }) => {
  const colors = useThemeColors();
  return (
    <View>
      <View
        style={[
          groupCardStyles.innerContainer,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <GiftedAvatar user={group} size="tiny" />
        <Text style={[groupCardStyles.tinyText, { color: colors.primaryText }]}>
          {group.name} {group.is_public && "(public)"}
        </Text>
      </View>
    </View>
  );
};

export const GroupCard = ({
  group,
  size = "small",
  contacts,
}: {
  size: AvatarSize;
  group: T.Group;
  contacts?: T.Contact["id"][];
}) => {
  switch (size) {
    case "hero":
      return <BigGroupCard group={group} />;
    case "small":
      return <SmallGroupCard group={group} contacts={contacts} />;
    case "tiny":
      return <TinyGroupCard group={group} />;
    case "medium":
      return <SmallGroupCard group={group} contacts={contacts} />;
    case "jumbo":
      return <BigGroupCard group={group} />;
    default:
      assertNever(size);
  }
};

const GROUP_NAME_FONT_WEIGHT = "600";

export const groupCardStyles = StyleSheet.create({
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
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
