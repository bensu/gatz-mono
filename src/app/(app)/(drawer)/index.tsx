import { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { FeedScreen } from "../../../components/FeedScreen";

import * as T from "../../../gatz/types";
import { isMobile } from "../../../util";
import { DesktopDoubleLayout } from "../../../components/DesktopDoubleLayout";
import { useDebouncedRouter } from "../../../context/debounceRouter";

const parseFeedType = (param: string): T.FeedType => {
  let feedType: T.FeedType = "all_posts";
  switch (param) {
    case "all_posts":
      feedType = "all_posts";
      break;
    case "active_discussions":
      feedType = "active_discussions";
      break;
  }
  return feedType;
};

const AllPosts = () => {
  const params = useLocalSearchParams();

  const feedType = parseFeedType(params.feedType as string);
  const contact_id = params.contact_id as string | undefined;
  const group_id = params.group_id as string | undefined;
  const did = params.did as string | undefined;
  const location_id = params.location_id as string | undefined;
  const hidden = params.hidden === "true" ? true : undefined;
  
  const feedQuery: T.FeedQuery = contact_id
    ? {
      type: "contact",
      feedType,
      contact_id,
      group_id: undefined,
      location_id: undefined,
      hidden,
    }
    : group_id
      ? {
        type: "group",
        feedType,
        contact_id: undefined,
        group_id,
        location_id: undefined,
        hidden,
      }
      : location_id
        ? {
          type: "location",
          feedType,
          contact_id: undefined,
          group_id: undefined,
          location_id,
          hidden,
        }
        : {
          type: "all",
          feedType,
          contact_id: undefined,
          group_id: undefined,
          location_id: undefined,
          hidden,
        };

  const router = useDebouncedRouter();

  const onSelectDiscussion = useCallback(
    (did: T.Discussion["id"]) => {
      if (isMobile()) {
        router.push(`/discussion/${did}`);
      } else {
        router.replace(`?did=${did}`);
      }
    },
    [router],
  );
  const onDesktopClose = useCallback(() => router.replace("/"), [router]);

  const navTo = useCallback((feedQuery: T.MainFeedQuery) => {
    const params: Record<string, string> = {
      location_id: feedQuery.location_id || "",
      contact_id: feedQuery.contact_id || "",
      group_id: feedQuery.group_id || "",
      feedType: feedQuery.feedType || "all_posts",
      type: feedQuery.type,
    };
    
    // Add hidden parameter if it exists
    if (feedQuery.hidden !== undefined) {
      params.hidden = feedQuery.hidden.toString();
    }
    
    const queryString = new URLSearchParams(params).toString();
    if (isMobile()) {
      router.push(`/?${queryString}`);
    } else {
      router.replace(`/?${queryString}`);
    }
  }, [router]);

  if (isMobile()) {
    return (
      <FeedScreen
        initialFeedQuery={feedQuery}
        onSelectDiscussion={onSelectDiscussion}
        navTo={navTo}
      />
    );
  } else {
    return (
      <DesktopDoubleLayout
        did={did}
        onDesktopClose={onDesktopClose}
      >
        <FeedScreen
          initialFeedQuery={feedQuery}
          onSelectDiscussion={onSelectDiscussion}
          navTo={navTo}
        />
      </DesktopDoubleLayout>
    );
  }
};

export default AllPosts;
