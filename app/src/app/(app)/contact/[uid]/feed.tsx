import { Redirect, useLocalSearchParams } from "expo-router";
// import { FeedScreen } from "../../../../components/FeedScreen";

import * as T from "../../../../gatz/types";

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

const GroupPosts = () => {
  const params = useLocalSearchParams();

  const feedType = parseFeedType(params.feed_type as string);
  const contact_id = params.uid as string;
  return <Redirect href={`/?feed_type=${feedType}&contact_id=${contact_id}`} />;
};

export default GroupPosts;
