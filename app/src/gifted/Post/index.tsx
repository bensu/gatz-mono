// Stryker disable all
import { useCallback, useMemo, useContext, useState, memo } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  GestureResponderEvent,
  Platform,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";

import { useChatContext } from "../GiftedChatContext";
import { WrappedUsernameWithAvatar } from "../GiftedAvatar";
import { BubbleContent } from "../Bubble";
import { renderDateText } from "../Day";

import { HangingMediaReactionsAndEdited } from "../Message";

import { Styles as GatzStyles } from "../../gatz/styles";
import { TEST_ID } from "../Constant";
import * as T from "../../gatz/types";

import { HangingReactions } from "../../components/reactions";
import {
  DMIcon,
  GroupParticipants,
  ContactsSummary,
} from "../../components/Participants";
import {
  parseInviteIds,
  parseContactIds,
  parseGroupIds,
  InviteCard,
  ContactCard,
  GroupCard,
} from "../../components/InviteCard";

import { PortalContext } from "../../context/PortalProvider";
import { SessionContext } from "../../context/SessionProvider";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { useDebouncedRouter } from "../../context/debounceRouter";
import { useThemeColors } from "../hooks/useThemeColors";
import { HoverMenu } from "../HoverMenu";
import { MenuItemProps, MenuItems } from "../MenuItems";
import { QuickReactions, REACTION_MENU_HEIGHT } from "../QuickEmojiReactions";
import { calculateMinBubbleTop, holdMenuStyles, MENU_GAP } from "../FloatingMenu";
import { crdtIsEqual, getUserId, isMobile } from "../../util";
import { LinkPreview } from "../../vendor/react-native-link-preview/LinkPreview";
import { ContinuedFrom, ContinuedToPost, useContinuedDiscussion } from "../Continued";
import { InLocation } from "../../location/Location";

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  topRightIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editedContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginRight: 4,
    marginLeft: 12,
  },
  editedText: { fontSize: 12 },
  date: {
    lineHeight: 20,
    fontSize: 12,
  },
  activeDate: {},
  leftBorder: { borderLeftWidth: 4 },
  rightBorder: { borderRightWidth: 4 },
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  containerIsMain: {
    paddingLeft: GatzStyles.gutter.paddingLeft + 8,
    paddingRight: GatzStyles.gutter.paddingRight,
    paddingBottom: 12,
  },
  containerInFeed: { paddingHorizontal: Platform.select({ default: 4, web: 6 }) },
  innerContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    flex: 1,
  },
  outerBubbleContainer: { flex: 1, alignItems: "flex-start" },
  bubbleContainer: {
    paddingRight: 4,
    marginTop: 6,
    minHeight: 20,
    justifyContent: "flex-end",
    width: "100%",
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

type BaseProps = {
  currentMessage?: T.Message;
  isActive?: boolean;
  onEdit?(id: T.Message["id"]): void;
  onPressAvatar: (userId: T.User["id"]) => void;
  onOpenReactionMenu?: (m: T.Message) => void;
  onDisplayReactions?: (m: T.Message) => void;
  onArchive?: (did: T.Discussion["id"]) => void;
  onContinue?: (mid: T.Message["id"]) => void;
  users?: T.Contact[];
  searchText?: string;
}

type MainProps = BaseProps & {
  isMain: true;
  discussion: T.Discussion;
  onQuickReaction: (mid: T.Message["id"], reaction: string) => void;
} 

type InFeedProps = BaseProps & {
  discussion?: T.Discussion;
  isMain: false;
} 

type Props = MainProps | InFeedProps;

/**
 * Custom equality function for React.memo optimization of the Post component.
 * 
 * This function implements a performance optimization strategy that combines shallow
 * and deep comparison techniques to prevent unnecessary re-renders of Post components.
 * 
 * Key functionality and invariants:
 * - [props-equality-check] Determines if two sets of props are functionally equivalent
 * - [shallow-comparison] Compares primitive props directly (isActive, isMain, searchText)
 * - [deep-crdt-comparison] Uses crdtIsEqual for deep comparison of CRDT objects
 * - [performance-optimization] Prevents unnecessary re-renders when props haven't meaningfully changed
 * - [type-safety] Handles both MainProps and InFeedProps types through union discrimination
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - Internal Dependencies: crdtIsEqual utility function (use real implementation)
 * - External Services: None
 * - Native Modules: None
 * 
 * The comparison strategy:
 * 1. First checks primitive boolean and string props for quick rejection
 * 2. Then performs deep CRDT comparison for complex objects (message, discussion)
 * 3. Returns true only if all props are equivalent
 * 
 * This is critical for performance in large message lists where many Post components
 * may be rendered simultaneously. The CRDT comparison ensures that even if object
 * references change, we don't re-render if the actual data is the same.
 * 
 * @param p - Previous props
 * @param n - Next props
 * @returns true if props are equal (skip re-render), false otherwise
 */
// Stryker restore all
export const arePropsEqual = (p: Props, n: Props) => {
  // [props-equality-check] [shallow-comparison]
  return p.isActive === n.isActive &&
    p.isMain === n.isMain &&
    p.searchText === n.searchText &&
    // [deep-crdt-comparison]
    crdtIsEqual(p.currentMessage, n.currentMessage) &&
    crdtIsEqual(p.discussion, n.discussion);
};
// Stryker disable all

enum Action {
  React = "React",
  CopyText = "Copy text",
  Cancel = "Cancel",
  Edit = "Edit",
  More = "More",
  Flag = "Report",
  Continue = "Continue with new post",
}
const MORE_ACTION_BUTTONS_OWNER = {
  options: [Action.Continue, Action.Cancel],
  cancelButtonIndex: 1,
};

const MORE_ACTION_BUTTONS_NON_CONTACT = {
  options: [Action.Flag, Action.Cancel],
  destructiveButtonIndex: 0,
  cancelButtonIndex: 1,
};

const MORE_ACTION_BUTTONS_CONTACT = {
  options: [Action.Continue, Action.Flag, Action.Cancel],
  destructiveButtonIndex: 1,
  cancelButtonIndex: 2,
};

// const ACTION_BUTTONS_OTHER = {
//   options: [Action.React, Action.CopyText, Action.More, Action.Cancel],
//   cancelButtonIndex: 3,
// };
// 
// const ACTION_BUTTONS_OWNER = {
//   options: [Action.React, Action.CopyText, Action.Edit, Action.Cancel],
//   cancelButtonIndex: 3,
// };

/**
 * Maps button index to action for non-contact users' secondary menu.
 * 
 * This function handles the action sheet that appears when a non-contact user
 * (someone not in the current user's contact list) interacts with "More" options.
 * 
 * Key functionality and invariants:
 * - [action-button-index-validation-non-contact] Validates index bounds before mapping
 * - [index-to-action-mapping] Maps numeric indices to Action enum values
 * - [error-handling] Logs console error for invalid indices
 * - [non-contact-menu-structure] Supports Flag and Cancel actions only
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - Internal Dependencies: Action enum, MORE_ACTION_BUTTONS_NON_CONTACT constant
 * - External Services: None
 * - Native Modules: None
 * 
 * Menu structure for non-contacts:
 * - Index 0: Flag (Report) - destructive action
 * - Index 1: Cancel
 * 
 * This limited menu reflects the restricted interaction options available
 * when viewing posts from non-contacts, focusing on safety features.
 * 
 * @param index - The button index from action sheet
 * @returns The corresponding Action enum value, or undefined for invalid indices
 */
export const indexToActionForNonContactSecondMenu = (index: number): Action => {
  // [action-button-index-validation-non-contact] [index-to-action-mapping]
  if (index >= 0 && index < MORE_ACTION_BUTTONS_NON_CONTACT.options.length) {
    return MORE_ACTION_BUTTONS_NON_CONTACT.options[index];
  } else {
    // [error-handling]
    console.error(`Invalid index ${index}`);
  }
};

/**
 * Maps button index to action for contact users' secondary menu.
 * 
 * This function handles the action sheet that appears when a contact user
 * (someone in the current user's contact list) interacts with "More" options.
 * 
 * Key functionality and invariants:
 * - [action-button-index-validation-contact] Validates index bounds before mapping
 * - [index-to-action-mapping] Maps numeric indices to Action enum values
 * - [error-handling] Logs console error for invalid indices
 * - [contact-menu-structure] Supports Continue, Flag, and Cancel actions
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - Internal Dependencies: Action enum, MORE_ACTION_BUTTONS_CONTACT constant
 * - External Services: None
 * - Native Modules: None
 * 
 * Menu structure for contacts:
 * - Index 0: Continue with new post
 * - Index 1: Flag (Report) - destructive action
 * - Index 2: Cancel
 * 
 * This expanded menu reflects the additional interaction options available
 * when viewing posts from contacts, including the ability to continue discussions.
 * 
 * @param index - The button index from action sheet
 * @returns The corresponding Action enum value, or undefined for invalid indices
 */
export const indexToActionForContactSecondMenu = (index: number): Action => {
  // [action-button-index-validation-contact] [index-to-action-mapping]
  if (index >= 0 && index < MORE_ACTION_BUTTONS_CONTACT.options.length) {
    return MORE_ACTION_BUTTONS_CONTACT.options[index];
  } else {
    // [error-handling]
    console.error(`Invalid index ${index}`);
  }
};

/**
 * Maps button index to action for post owner's secondary menu.
 * 
 * This function handles the action sheet that appears when the post owner
 * (the user who created the post) interacts with "More" options.
 * 
 * Key functionality and invariants:
 * - [action-button-index-validation-owner] Validates index bounds before mapping
 * - [index-to-action-mapping] Maps numeric indices to Action enum values
 * - [error-handling] Logs console error for invalid indices
 * - [owner-menu-structure] Supports Continue and Cancel actions only
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - Internal Dependencies: Action enum, MORE_ACTION_BUTTONS_OWNER constant
 * - External Services: None
 * - Native Modules: None
 * 
 * Menu structure for owners:
 * - Index 0: Continue with new post
 * - Index 1: Cancel
 * 
 * This simplified menu reflects that owners don't need to flag their own posts,
 * but can continue discussions from them. Edit functionality is provided
 * separately in the primary menu.
 * 
 * @param index - The button index from action sheet
 * @returns The corresponding Action enum value, or undefined for invalid indices
 */
export const indexToActionForOwnerSecondMenu = (index: number): Action => {
  // [action-button-index-validation-owner] [index-to-action-mapping]
  if (index >= 0 && index < MORE_ACTION_BUTTONS_OWNER.options.length) {
    return MORE_ACTION_BUTTONS_OWNER.options[index];
  } else {
    // [error-handling]
    console.error(`Invalid index ${index}`);
  }
};

const TopRow = (props: Props) => {

  const { isActive, currentMessage, isMain, users = [], discussion } = props;
  const isDM = !discussion.open_until && users.length === 2 && !discussion?.group_id;
  const colors = useThemeColors();
  const { getLocale } = useChatContext();

  const router = useDebouncedRouter();
  const { db } = useContext(FrontendDBContext);

  const user = useMemo(() => {
    return db.getUserById(currentMessage.user_id);
  }, [currentMessage.user_id, db]);

  const groupId = discussion?.group_id;
  const group: T.Group | undefined = useMemo(() => {
    if (groupId) {
      return db.getGroupById(groupId);
    } else {
      return null;
    }
  }, [db, groupId]);
  // [navigate-to-group-callback] Navigate to group page when group participants are clicked
  const navToGroup = useCallback(() => {
    router.push(`/group/${group?.id}`);
  }, [router.push, group]);

  const renderTime = () => {
    return (
      <Text
        testID="post-date"
        style={[
          styles.date,
          isActive && styles.activeDate,
          { color: colors.greyText, marginRight: 8 },
        ]}
      >
        {renderDateText(currentMessage.created_at, getLocale())}
      </Text>
    );
  };

  const renderTopRightCorner = () => {
    if (isMain) {
      return renderTime();
    } else if (group) {
      return (
        <TouchableOpacity onPress={navToGroup}>
          <GroupParticipants size="tiny" group={group} users={users.map((u) => u.id)} />
        </TouchableOpacity>
      );
    } else if (isDM) {
      return <DMIcon />;
    } else if (users.length > 0) {
      return (
        <ContactsSummary
          size="tiny"
          contactsCount={users.length}
          friendsOfFriends={discussion?.member_mode === "friends_of_friends"}
        />
      );
    } else {
      return null;
    }
  };

  // [dm-row-function] Renders the DM (Direct Message) row with sender and recipient avatars
  const renderDMRow = () => {
    const dmTo = users.filter((u) => u.id !== currentMessage.user_id)[0];
    const onPressToAvatar = useCallback(() => {
      props.onPressAvatar(currentMessage.user_id)
    }, [props.onPressAvatar, currentMessage.user_id]);
    const onPressFromAvatar = useCallback(() => {
      props.onPressAvatar(dmTo.id)
    }, [props.onPressAvatar, dmTo.id]);
    return (
      <View testID="dm-row" style={{ flexDirection: "row", alignItems: "center" }}>
        <WrappedUsernameWithAvatar user={user} size="small" onPress={onPressToAvatar} />
        <MaterialIcons
          style={{ marginRight: 8 }}
          name="arrow-forward"
          size={20}
          color={colors.strongGrey}
          testID="dm-arrow"
        />
        <WrappedUsernameWithAvatar user={dmTo} size="small" onPress={onPressFromAvatar} />
      </View>
    )
  }

  const { session: { userId } } = useContext(SessionContext);
  const isHidden = discussion.archived_uids.includes(userId);

  // [location-press-callback] Navigate to location when location tag is clicked
  const onPressLocation = useCallback(() => {
    if (discussion.location_id) {
      router.push(`/?location_id=${discussion.location_id}`);
    }
  }, [router, discussion.location_id]);

  return (
    <View style={styles.topRow} testID={TEST_ID.POST_TOP_ROW}>
      {isDM ? renderDMRow() : (
        <View style={styles.row}>
          <View style={{ marginRight: -4 }}>
            <WrappedUsernameWithAvatar
              user={user}
              size="small"
              onPress={() => props.onPressAvatar(user.id)}
            />
          </View>
          {discussion.location && (
            <TouchableOpacity onPress={onPressLocation}>
              <InLocation location={discussion.location} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.topRightIconContainer}>
        {isHidden && (
          <MaterialIcons name="visibility-off" size={20} color={colors.strongGrey} testID="visibility-off-icon" />
        )}
        {renderTopRightCorner()}
      </View>
    </View>
  )
}

const PostBody = (props: Props) => {
  const colors = useThemeColors();

  const { currentMessage, isMain, searchText, isActive = false } = props;
  const hasMedia = currentMessage.media?.length > 0;
  const hasLinkPreviews = currentMessage.link_previews?.length > 0;

  // [display-reactions-callback] Show reactions modal when reactions are clicked
  const onDisplayReactions = useCallback(() => {
    props.onDisplayReactions?.(currentMessage);
  }, [props.onDisplayReactions, currentMessage]);

  const renderReactions = useCallback(() => {
    const reactions = currentMessage?.reactions || {};
    return (
      <HangingReactions
        outerStyle={{ bottom: isMain ? -30 : -12, right: -2 }}
        reactions={reactions}
        onDisplayReactions={onDisplayReactions}
      />
    );
  }, [onDisplayReactions, currentMessage?.reactions]);

  return (
    <View style={styles.outerBubbleContainer} testID={TEST_ID.POST_BODY}>
      <View style={[styles.bubbleContainer]}>
        <View style={{ marginBottom: 8 }}>
          {/* Stryker restore all */}
          {/* [active-state-tracking] [search-highlighting] */}
          <BubbleContent
            postOpts={{ isPost: true, isActive }}
            currentMessage={currentMessage}
            showFull={isMain}
            searchText={searchText}
          />
          {/* Stryker disable all */}
        </View>
        {hasMedia && <HangingMediaReactionsAndEdited message={currentMessage} colors={colors} />}
        {isMain && hasLinkPreviews && (
          <View style={{ marginTop: 8, flex: 1, gap: 4, width: "100%", paddingRight: 4 }}>
            {
              currentMessage.link_previews.map((preview) => (
                <LinkPreview
                  key={preview.url}
                  withBorder
                  withShadow={false}
                  previewData={preview}
                />
              ))
            }
          </View>
        )}
        {isMain && renderReactions()}
      </View>
    </View>
  );
};

/**
 * Main post component for rendering posts in their primary view.
 * 
 * This component handles the complex interactions and UI for posts when they are
 * displayed as the main focus (not in a feed). It manages user interactions,
 * reactions, editing, and contextual menus.
 * 
 * Key functionality and invariants:
 * - [user-interaction] Handles all user interactions including reactions, edits, and navigation
 * - [context-menu-management] Shows different menus based on user relationship (owner/contact/other)
 * - [gesture-handling] Manages both hover (desktop) and long-press (mobile) gestures
 * - [portal-rendering] Uses portal system for floating menus and reactions
 * - [callback-optimization] Uses useCallback for performance optimization
 * 
 * Dependencies (for testing strategy):
 * - Child Components: TopRow, PostBody, HoverMenu, MenuItems, QuickReactions (use real implementations)
 * - Internal Dependencies: useThemeColors, useChatContext hooks (use real)
 * - External Services: Portal system, Action sheet, Router (mock at boundaries)
 * - Native Modules: Clipboard, Gesture handlers (mock globally)
 * 
 * Interaction patterns:
 * - Desktop: Hover to show quick actions menu
 * - Mobile: Long press to show floating menu with reactions and actions
 * - Different action sets for post owner vs contacts vs non-contacts
 * 
 * The component manages complex state interactions between:
 * - Hover/press states for menu display
 * - Portal system for floating UI elements
 * - Contextual actions based on user permissions
 * - Quick reactions vs full reaction menu
 * 
 * @param props - MainProps including callbacks for all interactions
 * @returns The rendered main post component with full interaction capabilities
 */
export const InnerPostMain = (props: MainProps) => {
  const { currentMessage, discussion } = props;

  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const { showActionSheetWithOptions } = useActionSheet();
  const { session: { userId } } = useContext(SessionContext);

  const user = useMemo(() => {
    return db.getUserById(currentMessage.user_id);
  }, [currentMessage.user_id, db]);

  // [context-menu-management]
  const isUserOwner = user && user.id === userId;
  const isAuthorContact = useMemo(() => {
    const myContacts = db.getMyContacts();
    const authorUserId = user && getUserId(user);
    return authorUserId && myContacts.has(authorUserId);
  }, [user, db]);

  // [open-reaction-menu-callback] Open reaction menu to add new reactions
  const openReactionMenu = useCallback(() => {
    props.onOpenReactionMenu?.(currentMessage);
  }, [props.onOpenReactionMenu, currentMessage]);

  // [edit-callback] Trigger edit mode for the current message
  const onEdit = useCallback(() => {
    props.onEdit?.(currentMessage.id);
  }, [props.onEdit, currentMessage.id]);

  // [copy-text-callback] Copy message text to clipboard
  const onCopyText = useCallback(() => {
    Clipboard.setStringAsync(currentMessage.text);
  }, [currentMessage]);

  // [continue-callback] Continue discussion with a new post
  const onContinue = useCallback(() => {
    props.onContinue?.(currentMessage.id);
  }, [props.onContinue, currentMessage.id]);

  // [more-contact-action-handler] Show action sheet with more options for contact users
  const onMoreContact = useCallback(() => {
    showActionSheetWithOptions(
      MORE_ACTION_BUTTONS_CONTACT,
      (buttonIndex: number) => {
        const action = indexToActionForContactSecondMenu(buttonIndex);
        switch (action) {
          case Action.Continue:
            onContinue();
            break;
          case Action.Flag:
            props.onArchive?.(discussion.id);
            break;
          default:
            break;
        }
      },
    );
  }, [props.onArchive, discussion.id, showActionSheetWithOptions]);

  // [more-non-contact-action-handler] Show action sheet with more options for non-contact users
  const onMoreNonContact = useCallback(() => {
    showActionSheetWithOptions(
      MORE_ACTION_BUTTONS_NON_CONTACT,
      (buttonIndex: number) => {
        const action = indexToActionForNonContactSecondMenu(buttonIndex);
        switch (action) {
          case Action.Flag:
            props.onArchive?.(discussion.id);
            break;
          default:
            break;
        }
      },
    );
  }, [props.onArchive, discussion.id, showActionSheetWithOptions]);

  // [more-owner-action-handler] Show action sheet with more options for post owner
  const onMoreOwner = useCallback(() => {
    showActionSheetWithOptions(
      MORE_ACTION_BUTTONS_OWNER,
      (buttonIndex: number) => {
        const action = indexToActionForOwnerSecondMenu(buttonIndex);
        switch (action) {
          case Action.Continue:
            onContinue();
            break;
          default:
            break;
        }
      },
    );
  }, [props.onArchive, discussion.id, showActionSheetWithOptions]);


  // [gesture-handling]
  const [isHover, setIsHover] = useState(false);
  const hover = Gesture.Hover()
    .onStart(() => setIsHover(true))
    .onEnd(() => setIsHover(false));

  const { openPortal, closePortal } = useContext(PortalContext);

  // Stryker restore all
  // [user-interaction]
  const onQuickReaction = useCallback((reaction: string) => {
    closePortal();
    props.onQuickReaction(currentMessage.id, reaction);
  }, [props.onQuickReaction, currentMessage.id]);
  // Stryker disable all

  const actionItems: MenuItemProps[] = isUserOwner ? [
    { text: 'Edit', icon: 'edit', onPress: onEdit },
    { text: 'Copy Text', icon: 'content-copy', onPress: onCopyText, },
    { text: 'Continue with new post', icon: 'arrow-forward', onPress: onContinue },
  ] : [
    { text: 'Copy Text', icon: 'content-copy', onPress: onCopyText },
    isAuthorContact && {
      text: 'Continue with new post',
      icon: 'arrow-forward',
      onPress: onContinue,
    },
  ];

  const FloatingMenu = ({ pageY }: { pageY: number }) => {

    const shadowStyle = colors.theme === "dark" ? holdMenuStyles.shadowDark : holdMenuStyles.shadow;
    const menuHeight = 40;
    const minBubbleTop = calculateMinBubbleTop(0, menuHeight);
    // move upwards by the height of the reactions menu
    const menuTop = Math.min(pageY, minBubbleTop) - REACTION_MENU_HEIGHT;

    const onMoreReactions = () => {
      openReactionMenu();
      closePortal();
    }

    return (
      <View style={[
        holdMenuStyles.holdMenuAbsoluteContainer,
        holdMenuStyles.centered,
        { top: menuTop }
      ]}>
        <View style={styles.innerContainer}>
          <View style={[holdMenuStyles.holdMenuRelativeContainer]}>
            <View style={holdMenuStyles.postMenuContainer}>
              <View style={[shadowStyle]} testID={TEST_ID.POST_FLOATING_MENU}>
                <QuickReactions
                  onSelectReaction={onQuickReaction}
                  onMore={onMoreReactions}
                  reactions={currentMessage.reactions}
                  userId={userId}
                />
              </View>
              <View style={[shadowStyle]} >
                <MenuItems onClose={closePortal} items={actionItems} />
              </View>
            </View>
          </View>
        </View>
      </View >
    );
  }


  // [portal-rendering] [gesture-handling]
  const onLongPress = useCallback((e: GestureResponderEvent) => {
    const { pageY } = e.nativeEvent;
    openPortal(
      () => null,
      <FloatingMenu pageY={pageY} />
    );
  }, [openPortal, FloatingMenu]);

  const renderTouchableInner = () => {
    if (!isMobile()) {
      return <PostBody {...props} />;
    } else {

      return (
        <TouchableOpacity
          activeOpacity={0.5}
          delayLongPress={250}
          onLongPress={onLongPress}
          testID="post-touchable"
        >
          <PostBody {...props} />
        </TouchableOpacity>
      );
    }
  }

  return (
    <GestureDetector gesture={hover}>
      <View style={[styles.innerContainer, { position: "relative" }]}>
        <TopRow {...props} />
        {renderTouchableInner()}
        {isHover && (
          <View style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }} testID={TEST_ID.POST_HOVER_MENU}>
            {isUserOwner ? (
              <HoverMenu
                colors={colors}
                onReply={null}
                onReactji={openReactionMenu}
                onCopyText={onCopyText}
                onEdit={onEdit}
                openBottomMenu={onMoreOwner}
              />
            ) : (
              <HoverMenu
                colors={colors}
                onReply={null}
                onReactji={openReactionMenu}
                onCopyText={onCopyText}
                onEdit={null}
                openBottomMenu={isAuthorContact ? onMoreContact : onMoreNonContact}
              />
            )}
          </View>
        )}
      </View>
    </GestureDetector>
  )
}

const InnerPostInFeed = (props: Props) => {
  return (
    <View style={[styles.innerContainer]}>
      <TopRow {...props} />
      <PostBody {...props} />
    </View>
  )
};


const MainPost = (props: MainProps) => {
  const { currentMessage, discussion } = props;

  const wasEdited = currentMessage.edits?.length > 1;

  const router = useDebouncedRouter();
  const colors = useThemeColors();

  // [navigate-to-message-callback] Navigate to the original message this discussion was continued from
  const navigateToMessage = useCallback(() => {
    if (discussion.originally_from) {
      const { did, mid } = discussion.originally_from;
      if (isMobile()) {
        router.push(`/discussion/${did}/message/${mid}`);
      } else {
        router.push(`?did=${did}&mid=${mid}`);
      }
    }
  }, [router.push, discussion?.originally_from]);

  // [navigate-to-discussion-callback] Navigate to a specific discussion
  const navigateToDiscussion = useCallback((did: T.Discussion["id"]) => {
    if (isMobile()) {
      router.push(`/discussion/${did}`);
    } else {
      router.push(`?did=${did}`);
    }
  }, [router.push]);

  // Stryker restore all
  // [discussion-context]
  const fromPost = discussion.originally_from;
  // Stryker disable all

  const inviteIds = parseInviteIds(currentMessage.text);
  const hasInvites = inviteIds.length > 0;

  const contactIds = parseContactIds(currentMessage.text);
  const hasContacts = contactIds.length > 0;

  const groupIds = parseGroupIds(currentMessage.text);
  const hasGroups = groupIds.length > 0;

  // Stryker restore all
  // [discussion-context]
  const continuedDiscussionId = currentMessage.posted_as_discussion?.[0];
  const { originallyFrom } = useContinuedDiscussion(continuedDiscussionId);
  // Stryker disable all

  // [invite-cards-render] Render invite, group, and contact cards parsed from message text
  const renderInviteCards = () => {
    if (hasInvites || hasContacts || hasGroups) {
      return (
        <View style={{ marginLeft: 8, marginTop: 8, gap: 8 }} testID="invite-cards-container">
          {inviteIds.map((id, index) => (
            <InviteCard key={id} inviteId={id} />
          ))}
          {groupIds.map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
          {contactIds.map((id) => (
            <ContactCard key={id} contactId={id} />
          ))}
        </View>
      );
    } else {
      return null;
    }
  };

  // [edited-text-render] Render "Edited" text for edited messages
  const renderEdited = () => {
    if (wasEdited && !fromPost) {
      return (
        <View style={[styles.editedContainer]}>
          <Text style={[styles.editedText, { color: colors.strongGrey }]}>
            Edited
          </Text>
        </View>
      );
    }
  };

  return (
    <View testID={TEST_ID.POST_MAIN}>
      <View
        style={[
          styles.container,
          styles.containerIsMain,
          fromPost && [styles.leftBorder, { borderColor: colors.active }],
          originallyFrom && [styles.rightBorder, { borderColor: colors.active }],
          { backgroundColor: colors.appBackground, position: "relative" },
        ]}
      >
        {originallyFrom && (
          <ContinuedToPost
            did={continuedDiscussionId}
            continuedBy={originallyFrom.discussionUser}
            navigateToDiscussion={navigateToDiscussion}
            messageUserId={currentMessage.user_id}
          />
        )}
        <InnerPostMain {...props} />
      </View>
      {fromPost && (
        <ContinuedFrom
          did={fromPost.did}
          mid={fromPost.mid}
          wasEdited={wasEdited}
          navigateToMessage={navigateToMessage}
          posterId={discussion.created_by}
        />
      )}
      {renderEdited()}
      {renderInviteCards()}
    </View>
  );
};

const PostInFeed = (props: InFeedProps) => {
  const colors = useThemeColors();
  return (
    <View testID={TEST_ID.POST_IN_FEED}>
      <View style={[
        styles.container,
        styles.containerInFeed,
        { backgroundColor: colors.appBackground, position: "relative" }
      ]}>
        <InnerPostInFeed isMain={false} {...props} />
      </View>
    </View>
  );
}

const NonMemoizedPost = (props: Props) => {
  const { isMain = false } = props;
  // Stryker restore all
  // [conditional-rendering] [renders-post-component]
  if (isMain) {
    return <MainPost {...props} />;
  } else {
    return <PostInFeed {...props} />;
  }
  // Stryker disable all
}

/**
 * Main Post component that renders posts in different contexts.
 * 
 * This is the primary exported component for rendering posts throughout the application.
 * It serves as a smart wrapper that determines the appropriate rendering strategy based
 * on the context (main view vs feed view) and optimizes performance through memoization.
 * 
 * Key functionality and invariants:
 * - [renders-post-component] Entry point for all post rendering in the application
 * - [memoization-optimization] Uses React.memo with custom equality function for performance
 * - [conditional-rendering] Switches between MainPost and PostInFeed based on isMain prop
 * - [active-state-tracking] Tracks if the post is currently active/selected
 * - [search-highlighting] Supports highlighting search text within the post content
 * - [discussion-context] Integrates with discussion data to show threading and continuation
 * - [user-interaction] Handles user interactions like reactions, edits, and navigation
 * - [responsive-design] Adapts UI for mobile vs desktop platforms
 * 
 * Dependencies (for testing strategy):
 * - Child Components: MainPost, PostInFeed (use real implementations)
 * - Internal Dependencies: arePropsEqual function (use real)
 * - External Services: None at this level (handled by child components)
 * - Native Modules: None at this level
 * 
 * Rendering contexts:
 * - Main view (isMain=true): Full post with all interactions, reactions, link previews
 * - Feed view (isMain=false): Compact post for list displays
 * 
 * Performance considerations:
 * - Custom memo comparison prevents re-renders when CRDT data hasn't changed
 * - Lazy loads interaction handlers only when needed
 * - Efficiently handles large lists of posts through virtualization support
 * 
 * The component supports various features:
 * - Archived/hidden post indicators
 * - Location tags and navigation
 * - Group and DM indicators
 * - Invite/contact/group card parsing and display
 * - Continuation threading UI
 * - Edit history tracking
 * 
 * @param props - Props union of MainProps or InFeedProps
 * @returns Memoized post component optimized for performance
 */
// Stryker restore all
// [memoization-optimization]
export const Post = memo(NonMemoizedPost, arePropsEqual);
// Stryker disable all
