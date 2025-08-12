import React, { memo, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { Platform, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, FlatList } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeOut,
  interpolate,
  Extrapolation
} from "react-native-reanimated";

import * as T from "../../gatz/types";
import { Styles as GatzStyles } from "../../gatz/styles";

import { useDebouncedRouter } from "../../context/debounceRouter";
import { FrontendDBContext } from "../../context/FrontendDBProvider";

import { useThemeColors } from "../../gifted/hooks/useThemeColors";
import { ContactRequestCard, NewContactCard, Button, AcceptedInviteCard } from "../ContactRequestCard";
import { UsernameWithAvatar } from "../../gifted/GiftedAvatar";
import { GroupParticipants, Participants, IAvatar } from "../Participants";
import { ClientContext } from "../../context/ClientProvider";
import { DiscussionPreview } from "../DiscussionPreview";
import { multiPlatformAlert, isMobile } from "../../util";
import { SessionContext } from "../../context/SessionProvider";
import { ActionPillContext } from "../../context/ActionPillProvider";

const NewUserInvitedByFriendCard = (
  { feedItem, invited_by, contactRequest, contact, in_common: { contacts, groups } }:
    {
      feedItem: T.FeedItem,
      invited_by?: T.Contact["id"],
      contactRequest?: T.ContactRequest["id"],
      contact: T.Contact,
      in_common: { contacts: T.Contact["id"][], groups: T.Group["id"][] }
    }) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const router = useDebouncedRouter();

  const anyContent = contacts.length > 0 || groups.length > 0;

  const contactsInCommon: T.Contact[] = useMemo(() => {
    return contacts.map((id) => db.getUserById(id));
  }, [db, contacts]);

  const groupsInCommon: T.Group[] = useMemo(() => {
    return groups.map((id) => db.getGroupById(id)).filter((g) => g !== null);
  }, [db, groups]);

  const navToProfile = useCallback(() => {
    router.push(`/contact/${contact.id}`);
  }, [router.push, contact.id]);

  const invitedBy: T.Contact | null = useMemo(() => {
    return invited_by ? db.maybeGetUserById(invited_by) : null;
  }, [db, invited_by]);

  const [isLoading, setIsLoading] = useState(false);

  const requestContact = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await gatzClient.makeContactRequest(contact.id, "requested");
      if (r.id) {
        const fi = db.getFeedItemById(feedItem.id);
        const feedItemType = fi.feed_type;
        if (feedItemType === "new_user_invited_by_friend") {
          fi.ref.contact_request = r.id;
        }
        db.addFeedItem(fi);
      } else {
        multiPlatformAlert("Error ignoring request", r.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [db, gatzClient, contact.id]);

  const ignoreRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await gatzClient.dismissFeedItem(feedItem.id);
      if (r.item) {
        db.addFeedItem(r.item);
      } else {
        multiPlatformAlert("Error dismissing feed item");
      }
    } finally {
      setIsLoading(false);
    }
  }, [db, gatzClient, contact.id]);


  return (
    <>
      <TouchableOpacity
        onPress={navToProfile}
        style={[
          styles.outerContainer,
          { marginBottom: 2, backgroundColor: colors.appBackground },
          GatzStyles.card,
          GatzStyles.thinDropShadow,
        ]}
      >
        <View style={styles.outerContainer}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="people-alt" size={20} color={colors.strongGrey} />
          </View>
          <View style={{ padding: 4 }}>
            <View style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginBottom: anyContent ? 8 : 0
            }}>
              <UsernameWithAvatar
                size="small"
                user={contact}
                andMore={invitedBy ? "was invited to Gatz by " : "was invited to Gatz"}
              />
              {invitedBy && (
                <UsernameWithAvatar size="small" user={invitedBy} />
              )}
            </View>
            {contactsInCommon.length > 0 && (
              <View style={styles.innerRow}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {contactsInCommon.length} friend
                  {contactsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={contactsInCommon} />
              </View>
            )}
            {groupsInCommon.length > 0 && (
              <View style={styles.innerRow}>
                <Text style={[styles.cardText, { color: colors.primaryText }]}>
                  You have {groupsInCommon.length} group
                  {groupsInCommon.length > 1 && "s"} in common
                </Text>
                <Participants size="tiny" users={groupsInCommon as unknown as IAvatar[]} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      {contactRequest ? (
        <View style={[styles.buttonRow, styles.floatingButtonRow]}>
          <View style={{ padding: 4, justifyContent: "center", display: "flex", flexDirection: "row", flex: 1 }}>
            <Text style={{ color: colors.primaryText }}>You requested to be friends with them</Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={[styles.buttonRow, styles.floatingButtonRow, { justifyContent: "center" }]}>
          <ActivityIndicator size="small" color={colors.primaryText} />
        </View>
      ) : (
        <View style={[styles.buttonRow, styles.floatingButtonRow]}>
          <Button onPress={ignoreRequest} title="Ignore" color={colors.strongGrey} />
          <Button onPress={requestContact} title="Request friend" color={colors.active} />
        </View>
      )}
    </>

  );
};

const AddedToGroupCard = ({ group }: { group: T.HydratedGroup }) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const router = useDebouncedRouter();
  const addedBy = db.getUserById(group.added_by);
  const { in_common: { contacts } } = group;

  const contactsInCommon: T.Contact[] = useMemo(() => {
    return contacts.filter((id) => id !== addedBy.id).map((id) => db.getUserById(id));
  }, [db, contacts]);

  const anyContent = contactsInCommon.length > 0;

  const navToProfile = useCallback(() => {
    router.push(`/contact/${addedBy.id}`);
  }, [router.push, addedBy.id]);

  return (
    <TouchableOpacity
      onPress={navToProfile}
      style={[
        styles.outerContainer,
        {
          marginBottom: 16,
          backgroundColor: colors.appBackground
        },
        GatzStyles.card,
        GatzStyles.thinDropShadow,
      ]}
    >
      <View style={styles.outerContainer}>
        <View style={styles.iconContainer}>
          <GroupParticipants size="tiny" group={group} users={group.members} />
        </View>
        <View style={{ padding: 4 }}>
          <View style={{ marginBottom: anyContent ? 8 : 0 }}>
            <UsernameWithAvatar
              size="small"
              user={addedBy}
              andMore="added you to a group"
            />
          </View>
          {contactsInCommon.length > 0 && (
            <View style={styles.innerRow}>
              <Text style={[styles.cardText, { color: colors.primaryText }]}>
                You have {contactsInCommon.length} friend{contactsInCommon.length > 1 && "s"} in the group
              </Text>
              <Participants size="tiny" users={contactsInCommon} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};



type Props = {
  item: T.FeedItem;
  onPressContact?: (contactId: T.Contact["id"]) => void;
  onPressGroup?: (groupId: T.Group["id"]) => void;
  onPressDiscussion?: (discussionId: T.Discussion["id"]) => void;
};

// Constants for swipe animations
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35; // How far user needs to swipe to trigger hide (increased from 0.25)
const SWIPE_OUT_DURATION = 250; // Duration for swipe animation

// No need for extra onDismiss prop since we'll handle it internally
type SwipeableFeedItemCardProps = Props;

const propsAreEqual = (prev: Props, next: Props) => {
  // Defensive null checks for React 19 compatibility
  if (!prev?.item || !next?.item) {
    return prev === next;
  }
  
  if (prev.item.ref_type === "discussion" && next.item.ref_type === "discussion") {
    return prev.item.id === next.item.id;
  } else {
    return false;
  }
}

const FeedItemCardNotMemoized = (props: Props) => {

  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const [item, setItem] = useState<T.FeedItem>(props.item);
  // [feed-item-listening]
  useEffect(() => {
    const lid = db.listenToFeedItem(props.item.id, setItem);

    // Reset item state when props.item changes
    setItem(props.item);

    return () => {
      db.removeFeedItemListener(lid);
    }
  }, [db, props.item.id, props.item]);

  const { item: item2, ...rest } = props;

  // Only enable swiping on mobile devices

  // Conditionally render the swipeable component only on mobile
  // [platform-conditional-rendering]
  if (isMobile()) {
    return (
      <SwipeableFeedItemCard
        {...rest}
        item={item}
      />
    );
  } else {
    // On desktop, just render the regular card without swipe functionality
    return <FeedItemCardInner {...rest} item={item} />;
  }
}

/**
 * Main feed item card component that renders different types of feed items in a scrollable list.
 * 
 * This component acts as a smart wrapper that handles platform-specific rendering (mobile vs desktop),
 * state management, and conditional rendering based on feed item types.
 * 
 * Key functionality and invariants:
 * - [platform-conditional-rendering] Renders SwipeableFeedItemCard on mobile, FeedItemCardInner on desktop
 * - [memoization-optimization] Uses React.memo with custom equality check (propsAreEqual) for performance
 * - [feed-item-listening] Subscribes to feed item updates via db.listenToFeedItem for real-time updates
 * - [feed-type-routing] Routes to different card components based on feed_type (new_request, new_post, etc.)
 * - [dismissal-state-tracking] Tracks and renders dismissal state (hidden items) with visual indicators
 * - [seen-state-management] Automatically marks items as seen when rendered via gatzClient.queueMarkItemsSeen
 * - [swipe-gesture-support] Supports right-swipe gestures on mobile to dismiss/restore items
 * - [undo-functionality] Provides undo capability for dismissed items via ActionPill context
 * 
 * The component handles these feed types:
 * - new_request: Contact request cards
 * - new_friend: New contact cards
 * - new_friend_of_friend: Friend of friend notifications
 * - added_to_group: Group addition notifications
 * - new_user_invited_by_friend: Friend invitation cards
 * - new_post: Discussion preview cards
 * - mentioned_in_discussion: Mention notification cards
 * - accepted_invite: Accepted invitation cards
 * 
 * Platform behavior:
 * - Mobile: Full swipe gesture support with visual feedback
 * - Desktop: Static rendering without swipe gestures
 * 
 * @param props - Props containing the feed item and optional press handlers
 * @returns Platform-appropriate feed item card component
 */
// [memoization-optimization]
export const FeedItemCard = memo(FeedItemCardNotMemoized, propsAreEqual);

const SwipeableFeedItemCard = ({ item, onPressContact, onPressGroup, onPressDiscussion }: SwipeableFeedItemCardProps) => {
  // Get necessary contexts for dismissing items
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const { appendAction } = useContext(ActionPillContext);
  const { session: { userId } } = useContext(SessionContext);
  // Animation values
  const translateX = useSharedValue(0);
  const cardHeight = useSharedValue(0); // Starting with 0, will be set to 'auto' in styles
  const cardOpacity = useSharedValue(1);
  const isSwiping = useSharedValue(false);
  const isRemoved = useRef(false);
  const [isCompletelyRemoved, setIsCompletelyRemoved] = useState(false); // Track complete removal for DOM cleanup

  // Check if the item is already hidden
  const isItemHidden = useMemo(() => {
    if (item.dismissed_by?.includes(userId)) {
      return true;
    }
    if (item.ref_type === "discussion") {
      const discussion = db.getDiscussionById(item.ref.id);
      return discussion?.archived_uids?.includes(userId) || false;
    }
    return false;
  }, [item, userId, db]);

  // Values for feedback indicators
  const colors = useThemeColors();
  const hideIconOpacity = useSharedValue(0);
  const backgroundColorProgress = useSharedValue(0);

  const onUndoHideFeedItem = useCallback(async () => {
    try {
      // Reset UI state to show the item again
      setIsCompletelyRemoved(false);
      isRemoved.current = false;
      translateX.value = 0;
      cardHeight.value = 0; // We'll use 'auto' in the styles
      cardOpacity.value = 1;

      const rand = Math.random().toString(36).substring(2, 15);

      const r = await gatzClient.restoreFeedItem(item.id);
      if (r.item) {
        db.addFeedItem(r.item);

        appendAction({
          id: `restore-feed-item/${item.id}/${rand}`,
          description: "Item shown",
          timeout: 5000,
        });
      } else {
        multiPlatformAlert("Error restoring item");
      }
    } catch (error) {
      multiPlatformAlert("Error restoring item");
    }
  }, [gatzClient, db, item.id, translateX, cardHeight, cardOpacity]);

  const dismissFeedItem = useCallback(async () => {
    try {
      const r = await gatzClient.dismissFeedItem(item.id);
      const rand = Math.random().toString(36).substring(2, 15);
      if (r.item) {
        db.addFeedItem(r.item);
        // [undo-functionality]
        appendAction({
          id: `dismiss-feed-item/${item.id}/${rand}`,
          description: "Item hidden",
          actionLabel: "Undo",
          onPress: onUndoHideFeedItem,
          timeout: 5000
        });
      } else {
        multiPlatformAlert("Error dismissing feed item");
      }
    } catch (error) {
      multiPlatformAlert("Error dismissing feed item");
    }
  }, [gatzClient, db, item.id, onUndoHideFeedItem]);

  // Handle card dismissal or restoration
  const dismissCard = useCallback((direction: 'left' | 'right') => {
    if (isRemoved.current) return;
    isRemoved.current = true;

    // Immediately hide the indicator icons
    hideIconOpacity.value = withTiming(0, { duration: 100 });
    backgroundColorProgress.value = withTiming(0, { duration: 100 });

    // Animate the card out in the appropriate direction
    const translationDestination = direction === 'left'
      ? -SCREEN_WIDTH * 1.5  // Swipe left
      : SCREEN_WIDTH * 1.5;  // Swipe right

    translateX.value = withTiming(translationDestination, { duration: SWIPE_OUT_DURATION });
    cardHeight.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
    cardOpacity.value = withTiming(0, { duration: SWIPE_OUT_DURATION });

    // Handle dismiss or restore after animation finishes
    setTimeout(async () => {
      // Mark as completely removed to completely remove from DOM layout
      setIsCompletelyRemoved(true);

      try {
        // If already hidden, restore it; otherwise hide it
        if (isItemHidden) {
          await onUndoHideFeedItem();
        } else {
          await dismissFeedItem();
        }
      } catch (error) {
        console.error("Error processing feed item:", error);
        // Show error but don't revert visual state
        multiPlatformAlert(isItemHidden ? "Error restoring item" : "Error dismissing item");
      }
    }, SWIPE_OUT_DURATION);
  }, [translateX, cardHeight, cardOpacity, hideIconOpacity, backgroundColorProgress, dismissFeedItem, onUndoHideFeedItem, isItemHidden]);

  // Configure a gesture that properly coordinates with the parent scroll

  // Create a gesture that works in harmony with the parent scroll view
  // [swipe-gesture-support]
  const gesture = Gesture.Pan()
    // Only activate for right swipes (positive X direction) - increased from 20px to make it less sensitive
    .activeOffsetX(20)  // Only activate after 20px rightward movement

    // Fail for left swipes
    .failOffsetX(-5)    // Fail if there's leftward movement

    // We use simultaneousHandlers in the GestureDetector props instead

    // Make the vertical threshold very tight for Android to ensure scrolling has priority
    .failOffsetY([-5, 5])

    // Make sure our gesture is canceled when the touch moves outside this component
    .shouldCancelWhenOutside(true)
    .onBegin(() => {
      isSwiping.value = true;
    })
    .onUpdate((event) => {
      // Only allow swiping right (gesture config already prevents left swipes)
      if (event.translationX > 0) {
        // Swiping right - allow with some resistance
        translateX.value = event.translationX / 2;
      } else {
        // No left swiping - force value to zero
        translateX.value = 0;
      }

      // Update opacity based on swipe progress
      cardOpacity.value = interpolate(
        Math.abs(event.translationX),
        [0, SCREEN_WIDTH * 0.5],
        [1, 0.5],
        Extrapolation.CLAMP
      );

      // Update hide icon opacity based on swipe distance
      hideIconOpacity.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
        [0, 0.5, 1],
        Extrapolation.CLAMP
      );

      // Update background color progress based on swipe distance
      backgroundColorProgress.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      );
    })
    .onEnd((event) => {
      isSwiping.value = false;

      // Only right swipes are valid for dismissal
      if (event.translationX >= SWIPE_THRESHOLD) {
        // If swiped far enough to the right, dismiss the card
        runOnJS(dismissCard)('right');
      } else {
        // Otherwise, return to original position
        translateX.value = withTiming(0, { duration: 200 });
        cardOpacity.value = withTiming(1, { duration: 200 });
        hideIconOpacity.value = withTiming(0, { duration: 200 });
        backgroundColorProgress.value = withTiming(0, { duration: 200 });
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
    height: cardHeight.value === 0 ? 'auto' : cardHeight.value,
    overflow: 'hidden'
  }));

  // Hide this icon completely as we only support right swipes now
  const leftIconStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      right: 20,
      top: '50%',
      opacity: 0, // Always hidden
      transform: [{ translateY: -12 }],
      // Add pointer events none to prevent capturing touches when invisible
      pointerEvents: 'none' as const
    };
  });

  // Style for the action icon when swiping right (hide or show)
  const rightIconStyle = useAnimatedStyle(() => {
    // Only show the icon when actively swiping and not removed
    const showIcon = !isRemoved.current && translateX.value > 0;
    return {
      position: 'absolute',
      left: 20,
      top: '50%',
      opacity: showIcon ? hideIconOpacity.value : 0,
      transform: [{ translateY: -12 }],
      // Add pointer events none to prevent capturing touches when invisible
      pointerEvents: 'none' as const
    };
  });

  // Add background color animation for the entire container
  const backgroundColorStyle = useAnimatedStyle(() => {
    // Don't show background color if card is being removed
    if (isRemoved.current) {
      return {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        opacity: 0
      };
    }

    // Use the active color with calculated opacity based on swipe progress
    const opacity = backgroundColorProgress.value * 0.2; // Same calculation that was used before
    const backgroundColor = colors.active;

    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor,
      opacity
    };
  });

  // If item has been completely removed, don't render anything
  // This ensures the component takes up no space in the DOM layout
  if (isCompletelyRemoved) {
    return null;
  }

  return (
    <View style={{ position: 'relative' }}>
      {/* Animated background color */}
      <Animated.View style={backgroundColorStyle} />

      {/* Action indicator when swiping left */}
      <Animated.View style={leftIconStyle}>
        <MaterialIcons name="visibility-off" size={24} color={colors.active} />
      </Animated.View>

      {/* Action indicator when swiping right - show different icons based on item state */}
      <Animated.View style={rightIconStyle}>
        <MaterialIcons
          name={isItemHidden ? "visibility" : "visibility-off"}
          size={24}
          color={colors.active}
        />
      </Animated.View>

      {/* Create a composed gesture to ensure swipes don't interfere with scrolling */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <FeedItemCardInner
            item={item}
            onPressContact={onPressContact}
            onPressGroup={onPressGroup}
            onPressDiscussion={onPressDiscussion}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const FeedItemCardInner = ({ item, onPressContact, onPressGroup, onPressDiscussion }: Props) => {
  const colors = useThemeColors();
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const itemFeedType = item.feed_type;

  const { session: { userId } } = useContext(SessionContext);
  // [seen-state-management]
  useEffect(() => {
    const seen_at = item.seen_at || {};
    const isSeen = Boolean(seen_at[userId]);
    if (!isSeen) {
      gatzClient.queueMarkItemsSeen(item.id);
    }
  }, [item.id, gatzClient, userId]);

  const seen_at = item.seen_at || {};
  const isSeen = Boolean(seen_at[userId]);

  // Check if this item is hidden (dismissed or from a hidden discussion)
  // [dismissal-state-tracking]
  const isHidden = useMemo(() => {
    if (item.dismissed_by?.includes(userId)) {
      return true;
    }
    if (item.ref_type === "discussion") {
      const discussion = db.getDiscussionById(item.ref.id);
      return discussion?.archived_uids?.includes(userId) || false;
    }
    return false;
  }, [item, userId, db]);

  // [feed-type-routing]
  switch (itemFeedType) {
    case "new_request": {
      return (
        <ContactRequestCard
          key={item.id}
          feedItem={item}
        />
      );
    }
    case "new_friend": {
      return (
        <NewContactCard
          key={item.id}
          contact={item.ref}
          in_common={item.ref.in_common}
        />
      )
    }
    case "new_friend_of_friend": {
      return (
        <View style={[styles.container, { backgroundColor: colors.rowBackground }]}>
          <TouchableOpacity
            onPress={() => onPressContact?.(item.contact)}
            style={styles.contentContainer}
          >
            <Text style={[styles.text, { color: colors.primaryText }]}>
              New friend of friend
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    case "added_to_group": {
      return (
        <AddedToGroupCard key={item.id} group={item.ref} />
      )
    }
    case "new_user_invited_by_friend": {
      return (
        <NewUserInvitedByFriendCard
          key={item.id}
          feedItem={item}
          invited_by={item.ref.invited_by}
          contact={item.ref}
          contactRequest={item.ref.contact_request}
          in_common={item.ref.in_common}
        />
      )
    }

    case "new_post": {
      return (
        <View style={isHidden ? styles.hiddenItemContainer : null}>
          {isHidden && (
            <View style={styles.hiddenItemLabel}>
              <MaterialIcons name="visibility-off" size={18} color="white" />
              <Text style={[styles.hiddenText, { color: "white" }]}>Hidden</Text>
            </View>
          )}
          <DiscussionPreview
            key={item.ref.id}
            did={item.ref.id}
            onSelect={onPressDiscussion}
            onPressAvatar={onPressContact}
            inSearch={false}
            isSeen={isSeen}
          />
        </View>
      )

    }
    case "mentioned_in_discussion": {
      return (
        <View style={isHidden ? styles.hiddenItemContainer : null}>
          {isHidden && (
            <View style={styles.hiddenItemLabel}>
              <MaterialIcons name="visibility-off" size={18} color="white" />
              <Text style={[styles.hiddenText, { color: "white" }]}>Hidden</Text>
            </View>
          )}
          <DiscussionPreview
            key={item.ref.id}
            did={item.ref.id}
            onSelect={onPressDiscussion}
            onPressAvatar={onPressContact}
            inSearch={false}
            isSeen={Boolean(item.ref.seen_at?.[userId])}
          />
        </View>
      )
    }
    case "accepted_invite": {
      return (
        <AcceptedInviteCard key={item.id} invite={item.ref} feedItem={item} />
      )
    }
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  outerContainer: {
    position: "relative",
    flex: 1,
    marginTop: 0,
    marginHorizontal: 4,
  },

  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
  separator: {
    fontSize: 12,
    marginTop: 8,
  },
  floatingButtonRow: {
    height: 32,
    marginHorizontal: 4,
    marginTop: 0,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 32,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  cardText: { fontSize: 16, lineHeight: 20 },
  iconContainer: {
    position: 'absolute',
    top: 6,
    right: 8,
    zIndex: 1,
  },
  hiddenItemContainer: {
    opacity: 0.5,
    position: 'relative',
  },
  hiddenItemLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -45 }, { translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    opacity: 1,
  },
  hiddenText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
}); 