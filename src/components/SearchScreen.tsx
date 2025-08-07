import {
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

import * as T from "../gatz/types";
import { Styles as GatzStyles } from "../gatz/styles";

import { SessionContext } from "../context/SessionProvider";
import { FrontendDBContext } from "../context/FrontendDBProvider";

import { UniversalHeader, HeaderTitleWithIcon, headerStyles } from "./Header";
import { useDebouncedRouter } from "../context/debounceRouter";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { PostFeedItemPayload } from "../gatz/feed";
import { toSortedSearchFeedItems } from "../gatz/feed";
import { useAsync } from "react-async-hook";
import { byDiscussionCreatedAtDesc } from "../util";
import { DiscussionPreview } from "./DiscussionPreview";


type FeedScreenProps = {
  initialFeedQuery: T.SearchQuery;
  onSelectDiscussion: (did: T.Discussion["id"]) => void;
};

export const SearchScreen = (props: FeedScreenProps) => {
  // const [feedQuery, setFeedQuery] = useState(props.initialFeedQuery);
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.appBackground }]}>
      <SearchScreenInner
        feedQuery={props.initialFeedQuery}
        onSelectDiscussion={props.onSelectDiscussion}
      />
    </View>
  );
};

const SearchScreenInner = ({
  feedQuery,
  onSelectDiscussion,
}: {
  feedQuery: T.SearchQuery;
  onSelectDiscussion: (did: T.Discussion["id"]) => void;
}) => {

  const feedType = feedQuery.feedType; // Should always be search
  const router = useDebouncedRouter();
  const { db } = useContext(FrontendDBContext);
  const { session: { userId }, } = useContext(SessionContext);
  const colors = useThemeColors();

  const onPressAvatar = useCallback(
    (userId: T.User["id"]) => router.push(`/contact/${userId}`),
    [router],
  );

  const [allDRs, setAllDRs] = useState<T.DiscussionResponse[]>([]);

  const termRef = useRef<string | null>(null);

  // The problem is that the search screen is not hooked to the db
  // So, if a child component like DiscussionList wants to load more,
  // it will not properly refresh the search results
  // which are coming from result here
  const { execute, loading, result } = useAsync(
    async (term: string) => {
      termRef.current = term;
      const res = await db._fetchSearch({ ...feedQuery, term });
      setAllDRs(res.drs);
      return { ...res, term }
    },
    [''], // Initial empty term
    { executeOnMount: false }
  );

  const term: string | null = result && result.term || null;
  const discussions: T.DiscussionResponse[] | null = allDRs || null;

  const [last_did, drs] = useMemo(() => {
    if (!discussions) return [undefined, []];
    // We have the sorted discussions here only to get last did
    const sortedDRs = discussions.sort(byDiscussionCreatedAtDesc);

    const ldid: T.Discussion["id"] | undefined =
      sortedDRs.length > 0
        ? sortedDRs[sortedDRs.length - 1]?.discussion?.id
        : undefined;

    const feed: PostFeedItemPayload[] = toSortedSearchFeedItems(userId, sortedDRs,);

    return [ldid, feed];
  }, [userId, feedType, discussions]);

  const [isBottomFinished, setIsBottomFinished] = useState(false);

  const { execute: loadBottom, error: errorBottom, loading: loadingBottom } = useAsync(
    async (last_id: T.Discussion["id"]) => {
      const newTerm = termRef.current;
      const r = await db._fetchSearch({ ...feedQuery, term: newTerm, last_id });
      setAllDRs((drs) => {
        const currentDRs = new Set<T.Discussion["id"]>(drs.map(d => d.discussion.id));
        const newDRs = r.drs.filter(d => !currentDRs.has(d.discussion.id));
        return [...drs, ...newDRs];
      });
      if (r.drs.length === 0) {
        setIsBottomFinished(true);
      }
    },
    [''] // Pass a default empty param
  );

  const onEndReached = useCallback(() => {
    if (last_did) {
      loadBottom(last_did as string);
    }
  }, [last_did, loadBottom]);

  const footer = useMemo(
    () => (
      <Footer
        error={errorBottom}
        isFinished={isBottomFinished}
        loading={loadingBottom}
        loadMore={onEndReached}
      />
    ),
    [errorBottom, loadingBottom, onEndReached, isBottomFinished],
  );

  const LocalHeader = () => {
    return (
      <UniversalHeader inDrawer>
        <HeaderTitleWithIcon title="Search" iconName="search-outline" />
      </UniversalHeader>
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: PostFeedItemPayload }) => {
      const dr = item.discussion_response;
      return (
        <View key={dr.discussion.id}>
          <DiscussionPreview
            inSearch
            key={dr.discussion.id}
            did={dr.discussion.id}
            onSelect={onSelectDiscussion}
            onPressAvatar={onPressAvatar}
            searchText={term}
            isSeen={false}
          />
        </View>
      );
    },
    [onSelectDiscussion, onPressAvatar, term],
  );

  const isNotWeb = Platform.OS !== "web";
  return (
    <ActionSheetProvider>
      <View style={[styles.container, { backgroundColor: colors.appBackground }]}      >
        <LocalHeader />
        <View style={{ position: "relative", flex: 1, backgroundColor: colors.rowBackground }}>
          <SearchBar onSubmit={execute} />
          {loading ? (
            <SearchLoadingDiscussionList />
          ) : (drs && term) ? (
            <FlatList<PostFeedItemPayload>
              key={feedType}
              style={[styles.flatList, { backgroundColor: colors.rowBackground }]}
              contentContainerStyle={[styles.flatListContentContainer]}
              data={drs}
              scrollEventThrottle={16}
              ListEmptyComponent={<EmptyDiscussionPreview />}
              renderItem={renderItem}
              ListFooterComponent={footer}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.3}
              scrollEnabled={true} // Enable scrolling
              showsVerticalScrollIndicator={isNotWeb} // Hide vertical scroll indicator
              bounces={isNotWeb} // Disable bouncing effect
            />
          ) : null}
        </View>
      </View>
    </ActionSheetProvider>
  );
};

const SearchBar = ({ onSubmit }: { onSubmit: (searchText: string) => any }) => {
  const colors = useThemeColors();
  const [searchText, setSearchText] = useState('');

  const handleSubmit = () => {
    const trimmedText = searchText.trim();
    if (trimmedText.length > 3) {
      onSubmit(trimmedText);
    }
  };

  return (
    <View style={[searchStyles.container, { backgroundColor: colors.rowBackground }]}>
      <View style={[searchStyles.searchBox, { backgroundColor: colors.appBackground }]}>
        <Ionicons
          name="search"
          size={20}
          color={searchText.length > 0 ? colors.primaryText : colors.softFont} style={searchStyles.searchIcon}
        />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search posts..."
          placeholderTextColor={colors.softFont}
          style={[searchStyles.input, { color: colors.primaryText }]}
          returnKeyType="search"
          selectionColor="transparent"
          underlineColorAndroid="transparent"
          onSubmitEditing={handleSubmit}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};



const searchStyles = StyleSheet.create({
  container: Platform.OS === "web" ? {
    paddingHorizontal: 12, paddingVertical: 8,
  } : {
    paddingHorizontal: 4, paddingVertical: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 12,
    marginVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    ...(Platform.OS === "web" && {
      outlineStyle: "none",
      ":focus": {
        outlineStyle: "none",
      },
    }),

  },
});


const headerHeight = GatzStyles.header.minHeight;
const screenHeight = Dimensions.get("window").height;

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


const Footer = ({
  loading,
  error,
  loadMore,
  isFinished,
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

const EmptyDiscussionPreview = () => {
  const colors = useThemeColors();
  return (
    <View style={styles.emptyDiscussionContainer}>
      <Text style={[styles.emptyDiscussionText, { color: colors.primaryText }]}>
        No results
      </Text>
    </View>
  );
};

const SearchLoadingDiscussionList = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.flatList, { backgroundColor: colors.rowBackground }]}>
      <View style={styles.emptyDiscussionContainer}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
      </View>
    </View>
  );
};

