import { useEffect, useContext, useCallback } from "react";
import { Text, ActivityIndicator } from "react-native";
import { useAsync } from "react-async-hook";

import { useLocalSearchParams, useRouter } from "expo-router";

import { ClientContext } from "../../../../context/ClientProvider";
import { FrontendDBContext } from "../../../../context/FrontendDBProvider";

import { useProductAnalytics } from "../../../../sdk/posthog";

import { GroupScreen as GroupScreenInner } from "../../../../components/GroupScreen";
import { MobileScreenWrapper } from "../../../../components/MobileScreenWrapper";
import { useThemeColors } from "../../../../gifted/hooks/useThemeColors";

function GroupScreen() {
  const params = useLocalSearchParams();
  const groupId = params.gid as string;

  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const colors = useThemeColors();
  const router = useRouter();

  const analytics = useProductAnalytics();

  useEffect(
    () => analytics.capture("group.viewed", { group_id: groupId }),
    [analytics, groupId],
  );

  const onDesktopClose = useCallback(() => {
    router.replace("/groups");
  }, [router]);

  // listen to group changes to re-render the inner
  const { result, loading, error } = useAsync(async () => {
    const r = await gatzClient.getGroup(groupId);
    if (r.group) {
      db.addGroup(r.group);
    }
    return r;
  }, [gatzClient, groupId]);

  if (loading) {
    return <ActivityIndicator />;
  } else if (error) {
    return <Text style={{ color: colors.primaryText }}>There was an error</Text>;
  } else {
    return <GroupScreenInner groupResponse={result} onDesktopClose={onDesktopClose} />;
  }
}

export default function () {
  return (
    <MobileScreenWrapper>
      <GroupScreen />
    </MobileScreenWrapper>
  );
}
