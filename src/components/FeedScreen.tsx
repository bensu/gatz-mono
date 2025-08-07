import React, {
  useMemo,
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

import * as T from "../gatz/types";

import { SessionContext } from "../context/SessionProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";

import { UsernameWithAvatar } from "../gifted/GiftedAvatar";

import { GroupSheet } from "./GroupSheet";

import { NavTabBar } from "./NavTabs";

import * as Push from "../push";
import { useNotificationStore } from "../gatz/store";

import { DiscussionList, LoadingDiscussionList } from "./DiscussionList";
import { UniversalHeader, headerStyles } from "./Header";
import { GroupParticipants } from "./Participants";
import { useDebouncedRouter } from "../context/debounceRouter";
import { assertNever, isMobile } from "../util";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { toSortedActiveFeedItems, toSortedFeedItems, toFullFeed } from "../gatz/feed";
import type { FeedItemWithSeparator, FeedItemPayload } from "../gatz/feed";
import { CityHeader, getLocation, LocationSelectionSheet } from "../location/Location";

const RELOAD_WAIT_TIME_MS = 60000;

type FeedScreenProps = {
  initialFeedQuery: T.MainFeedQuery;
  onSelectDiscussion: (did: T.Discussion["id"]) => void;
  navTo: (fq: T.MainFeedQuery) => void;
};

export const FeedScreen = (props: FeedScreenProps) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.appBackground }]}>
      <FeedScreenInner
        feedQuery={props.initialFeedQuery}
        navTo={props.navTo}
        onSelectDiscussion={props.onSelectDiscussion}
      />
      {isMobile() && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <NavTabBar
            activeRoute={props.initialFeedQuery.feedType}
            navTo={(key: "all_posts" | "active_discussions") => props.navTo({
              ...props.initialFeedQuery,
              feedType: key,
            })}
          />
        </View>
      )}
    </View>
  );
};

type FeedQueryLoading = Map<
  string, // JSON.stringify(T.MainFeedQuery)
  boolean
>;

const FeedScreenInner = ({
  feedQuery,
  navTo,
  onSelectDiscussion,
}: {
  navTo: (fq: T.MainFeedQuery) => void;
  feedQuery: T.MainFeedQuery;
  onSelectDiscussion: (did: T.Discussion["id"]) => void;
}) => {
  const router = useDebouncedRouter();
  const { db } = useContext(FrontendDBContext);
  const { session: { userId } } = useContext(SessionContext);
  const colors = useThemeColors();

  const notificationsStore = useNotificationStore();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appStateStatus) => {
      if (appStateStatus === "active") {
        Push.clearActivityNotifications(notificationsStore);
      }
    });
    return () => subscription.remove();
  }, [notificationsStore]);

  const [newItems, setNewItems] = useState<Set<T.FeedItem["id"]>>(new Set());
  useEffect(() => {
    const lid = db.listenToIncoming(setNewItems);
    return () => db.removeIncomingFeedListener(lid);
  }, [db]);

  // I can't distinguish between "nothing here" and "loading for more"

  const isFqFirstLoad = useRef<FeedQueryLoading>(new Map());
  const [fqInitialLoad, setFqInitialLoad] = useState<FeedQueryLoading>(new Map());
  const [initialLoadError, setInitialLoadError] = useState<Error | undefined>();

  const getFirstLoad = useCallback((fq: T.MainFeedQuery) => {
    const v = isFqFirstLoad.current.get(JSON.stringify(fq));
    return v === undefined ? true : v;
  }, [isFqFirstLoad]);
  const setIsFirstLoad = useCallback((fq: T.MainFeedQuery) => {
    isFqFirstLoad.current.set(JSON.stringify(fq), false);
  }, [isFqFirstLoad]);

  const getInitialLoad = useCallback((fq: T.MainFeedQuery) => {
    const v = fqInitialLoad.get(JSON.stringify(fq));
    return v === undefined ? false : v;
  }, [fqInitialLoad]);
  const setInitialLoad = useCallback((fq: T.MainFeedQuery, v: boolean) => {
    setFqInitialLoad((m) => {
      const newMap = new Map(m);
      newMap.set(JSON.stringify(fq), v);
      return newMap;
    });
  }, [setFqInitialLoad]);


  // TODO: this set up flickers "no discussions" when you first open the app
  // it is because this component re-renders when initialLoad is set to true
  // but the drs listener hasn't picked up the new drs yet
  useEffect(() => {
    const isFirstLoad = getFirstLoad(feedQuery);
    if (isFirstLoad) {
      setIsFirstLoad(feedQuery);
      setInitialLoad(feedQuery, true);
      setInitialLoadError(undefined);
      db._fetchFeed(feedQuery)
        .catch((e: Error) => setInitialLoadError(e))
        .finally(() => setInitialLoad(feedQuery, false));
    }
  }, [
    feedQuery,
    setInitialLoad,
    setInitialLoadError,
    getFirstLoad,
    setIsFirstLoad,
  ]);

  const initialLoad = getInitialLoad(feedQuery);

  const showIncomingDiscussions = useCallback(() => db.integrateIncomingFeed(), [db]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appStatus: AppStateStatus) => {
      if (appStatus === "active") {
        db._prepareFeed(feedQuery);
      }
    });
    return () => subscription.remove();
  }, [feedQuery, db]);

  // Groups

  const [isGroupSheetVisible, setIsGroupSheetVisible] = useState(false);

  const onGroupHeader = useCallback(
    () => setIsGroupSheetVisible((g) => !g),
    [setIsGroupSheetVisible],
  );

  const onPressGroup = useCallback(
    (group: T.Group) => {
      if (group) {
        navTo({
          feedType: feedQuery.feedType,
          type: "group",
          group_id: group.id,
          contact_id: null,
          location_id: null,
        });
      } else {
        navTo({
          feedType: feedQuery.feedType,
          type: "all",
          group_id: null,
          contact_id: null,
          location_id: null,
        });
      }
      setIsGroupSheetVisible(false);
    },
    [feedQuery, navTo, setIsGroupSheetVisible],
  );
  const onPressYou = useCallback(() => {
    navTo({
      feedType: feedQuery.feedType,
      type: "contact",
      group_id: null,
      contact_id: userId,
      location_id: null,
    });
    setIsGroupSheetVisible(false);
  }, [feedQuery, navTo, setIsGroupSheetVisible]);

  const onToggleHidden = useCallback(() => {
    const hidden = feedQuery.hidden ?? false;
    navTo({
      ...feedQuery,
      hidden: !hidden,
    });
    setIsGroupSheetVisible(false);
  }, [feedQuery, navTo, setIsGroupSheetVisible]);

  const onPressAvatar = useCallback(
    (userId: T.User["id"]) => router.push(`/contact/${userId}`),
    [router],
  );

  const [isLocationSheetVisible, setIsLocationSheetVisible] = useState(false);
  const onPressLocation = useCallback((location: T.Location) => {
    console.log("onPressLocation", location);
    setIsLocationSheetVisible(false);
    setIsGroupSheetVisible(false);
    navTo({
      ...feedQuery,
      type: "location",
      group_id: null,
      contact_id: null,
      location_id: location.id,
    });
  }, [feedQuery, navTo]);

  const onOpenLocationSheet = useCallback(() => {
    console.log("onOpenLocationSheet");
    setIsLocationSheetVisible(true);
    setIsGroupSheetVisible(false);
  }, [setIsLocationSheetVisible, setIsGroupSheetVisible]);

  const onSearch = useCallback(() => router.push("/search"), [router]);

  if (initialLoadError) {
    return (
      <View
        style={[styles.centeredView, { backgroundColor: colors.appBackground }]}
      >
        <Text style={{ color: colors.primaryText }}>
          {initialLoadError.message || "Unknown error"}
        </Text>
        <Text style={{ color: colors.secondaryText }}>
          Please try again later
        </Text>
      </View>
    );
  }

  if (initialLoad) {
    return (
      <View style={styles.initialLoadActivityContainer}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
      </View>
    );
  }

  const onNewDiscussion = () => {
    if (groupFeed) {
      router.push(`/post?group_id=${groupFeed.id}`);
    } else {
      router.push("/post");
    }
  };

  const groupFeed = !!feedQuery.group_id && db.getGroupById(feedQuery.group_id);
  const contactFeed =
    !!feedQuery.contact_id && db.getUserById(feedQuery.contact_id);

  const HeaderTitle = () => {
    const group = groupFeed;
    const contact = contactFeed;
    const hasGroup = feedQuery.group_id && group;
    const hasContact = feedQuery.contact_id && contact;
    const location = feedQuery.location_id ? getLocation(feedQuery.location_id) : undefined;
    const hasLocation = location !== undefined;
    const allPosts = !(hasGroup || hasContact || hasLocation);
    const chevronHeight = allPosts
      ? Platform.select({ ios: 4, android: 8, web: 6 })
      : Platform.select({ ios: 0, android: 2, web: 2 });

    return (
      <View style={headerStyles.middleTitle}>
        <TouchableOpacity
          style={headerStyles.pressableHeader}
          onPress={onGroupHeader}
        >
          {hasGroup ? (
            <GroupParticipants group={group} size="small" users={[]} />
          ) : hasContact ? (
            <UsernameWithAvatar user={contact} size="small" />
          ) : hasLocation ? (
            <CityHeader location={location} />
          ) : (
            <Text
              style={[
                headerStyles.bigHeaderText,
                headerStyles.gatzFont,
                { color: colors.primaryText },
              ]}
            >
              Gatz
            </Text>
          )}
          <View
            style={{
              marginLeft: 6,
              alignItems: "center",
              flexDirection: "row",
              marginTop: chevronHeight,
            }}
          >
            <Ionicons
              size={20}
              name="chevron-down"
              color={colors.secondaryText}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const LocalHeader = () => {
    return (
      <UniversalHeader
        inDrawer
        onNew={onNewDiscussion}
        onSearch={onSearch}
      >
        <HeaderTitle />
      </UniversalHeader>
    );
  };

  return (
    <ActionSheetProvider>
      <View style={[styles.container, { backgroundColor: colors.appBackground }]}      >
        <LocalHeader />
        {!isMobile() && (
          <NavTabBar
            activeRoute={feedQuery.feedType}
            navTo={(feedType) => navTo({ ...feedQuery, feedType })}
          />
        )}
        <View style={{ position: "relative", flex: 1 }}>
          {feedQuery.feedType === "all_posts" && newItems.size > 0 && (
            <IncomingDiscussionsPill newItems={newItems} onPress={showIncomingDiscussions} />
          )}
          {initialLoad ? (
            <LoadingDiscussionList />
          ) : (
            <>
              {initialLoad && (
                <View style={styles.floatingActivity}>
                  <ActivityIndicator
                    size="small"
                    color={colors.activityIndicator}
                  />
                </View>
              )}
              <DiscussionListWrapper
                feedQuery={feedQuery}
                onPressAvatar={onPressAvatar}
                onSelectDiscussion={onSelectDiscussion}
                onNewDiscussion={onNewDiscussion}
                newItems={newItems}
              />
            </>
          )}
        </View>
        {isGroupSheetVisible && (
          <GroupSheet
            onClose={() => setIsGroupSheetVisible(false)}
            isVisible={isGroupSheetVisible}
            onPressGroup={onPressGroup}
            onPressYou={onPressYou}
            onOpenLocationSheet={onOpenLocationSheet}
            onToggleHidden={onToggleHidden}
            feedQuery={feedQuery}
          />
        )}
        {isLocationSheetVisible && (
          <LocationSelectionSheet
            onSelect={onPressLocation}
            onClose={() => setIsLocationSheetVisible(false)}
            visible={isLocationSheetVisible}
            scrollEnabled={false}
          />
        )}
      </View>
    </ActionSheetProvider>
  );
};

type WrapperProps = {
  feedQuery: T.MainFeedQuery,
  onPressAvatar: (userId: T.User["id"]) => void,
  onSelectDiscussion: (did: T.Discussion["id"]) => void,
  onNewDiscussion: () => void,
  newItems: Set<T.FeedItem["id"]>,
}

const AllPostDiscussionList = ({
  onPressAvatar,
  onSelectDiscussion,
  onNewDiscussion,
  newItems,
  feedQuery,
}: WrapperProps) => {
  const { db } = useContext(FrontendDBContext);
  const { session: { userId } } = useContext(SessionContext);
  const [allFeedItemIds, setFeedItemIds] = useState<T.FeedItem["id"][]>(db.getAllFeedItemIds());
  useEffect(() => {
    const fiLid = db.listenToFeedItemIds(setFeedItemIds);
    return () => db.removeFeedItemIdsListener(fiLid);
  }, [db, setFeedItemIds]);

  // This state is being cleared when the component is unmounted
  const unseenFeedItems = useRef<Set<T.FeedItem["id"]>>(new Set());

  const feed: FeedItemWithSeparator[] = useMemo(() => {
    const feedItems = allFeedItemIds
      .filter(id => !newItems.has(id))
      .map(id => db.getFeedItemById(id))
      .filter(Boolean);
    const sortedFeed: FeedItemPayload[] = toSortedFeedItems(userId, feedQuery, feedItems);

    // TODO: ideally, we would get to decide when to clear this state
    // the best moment to do that is when 
    // (a) enough has time has passed _and_
    // (b) the user has put the app in the background
    const unseenIds = sortedFeed.filter(item => !item.isSeen).map(item => item.id);
    unseenFeedItems.current = new Set(Array.from(unseenFeedItems.current).concat(unseenIds));

    const seenPreserved = sortedFeed.map(item => {
      if (unseenFeedItems.current.has(item.id)) {
        return {
          ...item,
          isSeen: false,
        };
      } else {
        return item;
      }
    });

    return toFullFeed(seenPreserved);
  }, [allFeedItemIds, feedQuery, newItems, userId]);

  return (
    <DiscussionList
      onPressAvatar={onPressAvatar}
      feedQuery={feedQuery}
      key={feedQuery.feedType}
      feedItems={feed}
      onSelect={onSelectDiscussion}
      onNew={onNewDiscussion}
      inSearch={false}
    />
  );
}

const ActiveDiscussionList = ({
  onPressAvatar,
  onSelectDiscussion,
  onNewDiscussion,
  feedQuery,
}: WrapperProps) => {

  const { db } = useContext(FrontendDBContext);
  const { session: { userId } } = useContext(SessionContext);
  const [dids, setDids] = useState<T.Discussion["id"][] | null>(db.getAllDRIds());

  useEffect(() => {
    const lid = db.listenToDRIds(setDids);
    return () => db.removeDRIdsListener(lid);
  }, [db, setDids]);

  const feed: FeedItemWithSeparator[] = useMemo(() => {
    const drs = dids.map(id => db.getDRById(id)).filter(Boolean);
    const sortedFeed: FeedItemPayload[] = toSortedActiveFeedItems(userId, feedQuery, drs);
    return toFullFeed(sortedFeed);
  }, [dids, feedQuery, userId]);

  return (
    <DiscussionList
      onPressAvatar={onPressAvatar}
      feedQuery={feedQuery}
      key={feedQuery.feedType}
      feedItems={feed}
      onSelect={onSelectDiscussion}
      onNew={onNewDiscussion}
      inSearch={false}
    />
  )
}

const DiscussionListWrapper = (props: WrapperProps) => {
  // by having two components we can avoid listenting on different feed types
  switch (props.feedQuery.feedType) {
    case "all_posts": {
      return (
        <AllPostDiscussionList {...props} />
      )
    }
    case "active_discussions": {
      return (
        <ActiveDiscussionList {...props} />
      )
    }
    default:
      assertNever(props.feedQuery.feedType);
      return null;
  }
}


const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  floatingActivity: {
    zIndex: 2,
    position: "absolute",
    top: 12,
    left: "50%",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initialLoadActivityContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  incomingDiscussionsPillContainer: {
    zIndex: 2,
    position: "absolute",
    top: 8,
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
  },
  incomingDiscussionsPill: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    padding: 10,
    borderRadius: 10,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 5,
  },
  incomingDiscussionsPillText: { fontWeight: "bold", },
});


const IncomingDiscussionsPill = (
  { newItems, onPress }: { newItems: Set<T.FeedItem["id"]>, onPress: () => void }
) => {
  const colors = useThemeColors();
  const count = newItems.size;

  return (
    <View style={styles.incomingDiscussionsPillContainer}>
      <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutUp.duration(300)}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.incomingDiscussionsPill,
            styles.shadow,
            {
              backgroundColor: colors.active,
              transform: [{ scale: pressed ? 0.97 : 1 }]
            }
          ]}
        >
          <MaterialIcons name="refresh" size={20} color={colors.activeBackgroundText} />
          <Text style={[styles.incomingDiscussionsPillText, { color: colors.activeBackgroundText }]}>
            {count} new {count === 1 ? 'post' : 'posts'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
