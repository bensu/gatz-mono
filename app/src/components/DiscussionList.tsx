import { useMemo, useContext, useCallback, useState } from "react";
import {
  Platform,
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { FrontendDBContext } from "../context/FrontendDBProvider";

import { Styles as GatzStyles } from "../gatz/styles";
import * as T from "../gatz/types";
import { FeedItemWithSeparator } from "../gatz/feed";

import { InitialPrompt } from "./InitialPrompt";
import { DiscussionPreview } from "./DiscussionPreview";
import { FeedItemCard } from "./FeedItemCard";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { SessionContext } from "../context/SessionProvider";
import { Separator } from "./Separator";
import { router } from "expo-router";

const Footer = ({
  loading, error, loadMore, isFinished,
}: {
  loading: boolean;
  error: any;
  loadMore: () => void;
  isFinished: boolean;
}) => {
  const colors = useThemeColors();
  return loading ? (
    <View style={styles.loadMoreContainer}>
      <ActivityIndicator size="small" color={colors.activityIndicator} />
    </View>
  ) : error ? (
    <TouchableOpacity style={styles.loadMoreContainer} onPress={loadMore}>
      <Text style={{ color: colors.secondaryText }}>
        There was an error. Please try again
      </Text>
    </TouchableOpacity>
  ) : isFinished ? (
    <View style={styles.loadMoreContainer}>
      <Text style={{ color: colors.secondaryText }}>
        You've reached the end
      </Text>
    </View>
  ) : (
    <TouchableOpacity style={styles.loadMoreContainer} onPress={loadMore}>
      <Text style={{ color: colors.secondaryText }}>Load more</Text>
    </TouchableOpacity>
  );
};

const EmptyDiscussionPreview = ({
  title,
  onNew,
}: {
  title: string;
  onNew?: () => void;
}) => {
  const colors = useThemeColors();
  return (
    <View style={styles.emptyDiscussionContainer}>
      <Text style={[styles.emptyDiscussionText, { color: colors.primaryText }]}>
        {title}
      </Text>
      {onNew && (
        <TouchableOpacity style={styles.newDiscussion} onPress={onNew}>
          <Text style={[styles.newDiscussionText, { color: colors.active }]}>
            Create one
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

type Props = {
  onSelect: (did: T.Discussion["id"]) => void;
  onPressAvatar: (userId: T.User["id"]) => void;
  onNew?: () => void;
  feedQuery: T.FeedQuery;
  inSearch: boolean;
  searchText?: string;
  feedItems: FeedItemWithSeparator[];
};

const hasComments = (dr: T.DiscussionResponse) =>
  dr.discussion.latest_message !== dr.discussion.first_message;

const isActiveMember = (
  userId: T.User["id"],
  dr: T.DiscussionResponse,
): boolean => {
  const activeMembers = new Set<T.User["id"]>(dr.discussion.active_members);
  return activeMembers.has(userId);
};

export const DiscussionList = (props: Props) => {
  const { db } = useContext(FrontendDBContext);
  const { session: { userId } } = useContext(SessionContext);

  const { inSearch, feedQuery } = props;
  const feedType = feedQuery.feedType;

  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const refreshList = useCallback(() => {
    setIsLoadingTop(true);
    db.refreshFeed(feedQuery).finally(() => setIsLoadingTop(false));
  }, [db, feedQuery]);

  const [moreDRs, setMoreDRs] = useState<{ drs: T.DiscussionResponse[] } | undefined>();
  const [loadingBottom, setLoadingBottom] = useState(false);
  const [errorBottom, setErrorBottom] = useState<Error | undefined>();
  const loadBottom = useCallback(() => {
    setLoadingBottom(true);
    db.loadBottomFeed(feedQuery)
      .then(setMoreDRs)
      .catch((e: Error) => setErrorBottom(e))
      .finally(() => setLoadingBottom(false));
  }, [db, feedQuery]);

  const isBottomFinished = moreDRs && moreDRs.drs && moreDRs.drs.length === 0;
  const footer = useMemo(
    () => (
      <Footer
        error={errorBottom}
        isFinished={isBottomFinished}
        loading={loadingBottom}
        loadMore={loadBottom}
      />
    ),
    [errorBottom, loadingBottom, loadBottom, isBottomFinished],
  );

  const onPressGroup = useCallback((groupId: T.Group["id"]) => {
    router.push(`/group/${groupId}`);
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItemWithSeparator; index: number }) => {
      let topElement = null;
      if (index === 0 && !inSearch) {
        switch (feedType) {
          case "all_posts":
            topElement = <InitialPrompt />;
            break;
          default:
            topElement = <View style={{ paddingVertical: 6 }} />;
            break;
        }
      }
      if (item.type === "post") {
        const dr = item.discussion_response;
        return (
          <View key={dr.discussion.id}>
            {topElement}
            {item.separator && <Separator separator={item.separator} />}
            <DiscussionPreview
              inSearch={inSearch}
              key={dr.discussion.id}
              did={dr.discussion.id}
              onSelect={props.onSelect}
              onPressAvatar={props.onPressAvatar}
              isSeen={item.isSeen}
              searchText={props.searchText}
            />
          </View>
        );
      } else if (item.type === "mention") {
        const dr = item.discussion_response;
        return (
          <View key={dr.discussion.id}>
            {topElement}
            {item.separator && <Separator separator={item.separator} />}
            <DiscussionPreview
              inSearch={inSearch}
              key={dr.discussion.id}
              did={dr.discussion.id}
              onSelect={props.onSelect}
              onPressAvatar={props.onPressAvatar}
              isSeen={item.isSeen}
              searchText={props.searchText}
            />
          </View>
        );
      } else if (item.type === "feed_item") {
        return (
          <View key={item.id}>
            {topElement}
            {item.separator && <Separator separator={item.separator} />}
            <FeedItemCard
              item={item}
              onPressContact={props.onPressAvatar}
              onPressGroup={onPressGroup}
              onPressDiscussion={props.onSelect}
            />
          </View>
        );
      } else {
        return null;
      }
    },
    [props.onSelect, feedType],
  );

  const colors = useThemeColors();

  const refreshControl = useMemo(() => {
    if (!inSearch) {
      return (
        <RefreshControl
          tintColor={colors.activityIndicator}
          refreshing={isLoadingTop}
          onRefresh={async () => refreshList()}
        />
      );
    }
  }, [isLoadingTop, refreshList]);

  const emptyDiscussion = useMemo(() => {
    const title = inSearch ? "No results" :
      feedType === "all_posts"
        ? "No posts yet"
        : "No active discussions yet";
    return (
      <EmptyDiscussionPreview onNew={props.onNew} title={title} />
    );
  }, [props.onNew, feedType]);

  return (
    <FlatList<FeedItemWithSeparator>
      key={feedType}
      style={[styles.flatList, { backgroundColor: colors.rowBackground }]}
      contentContainerStyle={[styles.flatListContentContainer]}
      data={props.feedItems}
      scrollEventThrottle={16}
      ListEmptyComponent={emptyDiscussion}
      renderItem={renderItem}
      refreshControl={refreshControl}
      ListFooterComponent={!inSearch && footer}
      onEndReached={() => loadBottom()}
      onEndReachedThreshold={0.3}
      scrollEnabled={true} // Enable scrolling
      showsVerticalScrollIndicator={Platform.OS === "web"} // Hide vertical scroll indicator
      bounces={Platform.OS !== "web"} // Disable bouncing effect
    />
  );
};

// important that this has the right hight
export const LoadingDiscussionList = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.flatList, { backgroundColor: colors.rowBackground }]}>
      <View style={styles.emptyDiscussionContainer}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
      </View>
    </View>
  );
};

const headerHeight = GatzStyles.header.minHeight;
const screenHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  flatList: { minHeight: screenHeight - headerHeight - 30 },
  loadMoreContainer: {
    height: 100,
    padding: 10,
    marginBottom: Platform.select({ ios: 30, default: 0 }),
    alignItems: "center",
  },
  flatListContentContainer: {
    ...GatzStyles.gutter,
    flexGrow: 1,
  },
  newDiscussion: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  newDiscussionText: { fontSize: 16 },
  emptyDiscussionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyDiscussionText: { fontSize: 16 },
});
