import { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { SearchScreen } from "../../../components/SearchScreen";

import * as T from "../../../gatz/types";
import { isMobile } from "../../../util";
import { DesktopDoubleLayout } from "../../../components/DesktopDoubleLayout";
import { useDebouncedRouter } from "../../../context/debounceRouter";

const Search = () => {
  const params = useLocalSearchParams();
  const did = params.did as string | undefined;
  const term = params.term as string;

  // not really necessary but the the FeedScreen below needs it
  const feedQuery: T.FeedQuery = {
    type: "all",
    feedType: "search",
    term,
    contact_id: undefined,
    group_id: undefined,
  };

  const router = useDebouncedRouter();

  const onSelectDiscussion = useCallback(
    (did: T.Discussion["id"]) => {
      console.log("onSelectDiscussion", did);
      if (isMobile()) {
        router.push(`/discussion/${did}`);
      } else {
        router.push(`/search?did=${did}`);
      }
    },
    [router],
  );

  const onDesktopClose = useCallback(() => router.replace("/search"), [router]);

  if (isMobile()) {
    return (
      <SearchScreen
        initialFeedQuery={feedQuery}
        onSelectDiscussion={onSelectDiscussion}
      />
    );
  } else {
    return (
      <DesktopDoubleLayout did={did} onDesktopClose={onDesktopClose}>
        <SearchScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={onSelectDiscussion}
        />
      </DesktopDoubleLayout>
    );
  }
};

export default Search;
