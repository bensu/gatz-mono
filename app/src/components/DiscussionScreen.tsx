import React, {
  memo,
  useMemo,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

import { useLocalSearchParams } from "expo-router";
import { useDebouncedRouter } from "../context/debounceRouter";

import { useProductAnalytics } from "../sdk/posthog";

import { Contact, Discussion } from "../gatz/types";
import * as T from "../gatz/types";
import { FrontendDBContext } from "../context/FrontendDBProvider";

import DiscussionApp from "./DiscussionApp";
import { ContactsSheet } from "../components/ContactsSheet";
import {
  ContactsSummary,
  DMTo,
  GroupParticipants,
} from "../components/Participants";
import { UniversalHeader, headerStyles } from "../components/Header";
import { isMobile, isStillOpen } from "../util";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const MemoDiscussionApp = memo(
  DiscussionApp,
  (prev, next) => {
    // Defensive null checks for React 19 compatibility
    if (!prev || !next) {
      return prev === next;
    }
    return prev.did === next.did &&
           prev.highlightedMessageId === next.highlightedMessageId;
  },
);

export const DiscussionScreen = (
  { did, onDesktopClose }: { did: T.Discussion["id"], onDesktopClose: () => void }
) => {
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const mid = params.mid as string | undefined;
  const router = useDebouncedRouter();
  const analytics = useProductAnalytics();
  const { db } = useContext(FrontendDBContext);

  const [discussion, setDiscussion] = useState<Discussion | undefined>(
    db.getDiscussionById(did),
  );
  const isLoading = !discussion;

  useEffect(() => {
    const lid = db.listenToDiscussion(did, setDiscussion);
    if (discussion?.id) {
      analytics.capture("discussion.viewed", {
        discussion_id: discussion.id,
        created_by: discussion.created_by,
      });
    }
    // DiscussionApp will do the loading
    return () => db.removeDiscussionListener(did, lid);
  }, [discussion?.id, db]);

  const [isContactSheet, setIsContactSheet] = useState(false);

  const group: T.Group | undefined = useMemo(
    () =>
      discussion && discussion.group_id && db.getGroupById(discussion.group_id),
    [db, discussion && discussion.group_id],
  );

  const openContactSheet = () => setIsContactSheet(true);
  const navBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const onPressAvatar = useCallback(
    (userId: Contact["id"]) => {
      setIsContactSheet(false);
      router.push(`/contact/${userId}`);
    },
    [router, setIsContactSheet],
  );
  const users = useMemo(
    () => discussion?.members.map((id) => db.getUserById(id)),
    [discussion?.members, db],
  );

  const isDM = users && users.length === 2;
  const dmTo = users && users.filter((u) => u.id !== discussion.created_by)[0];

  const poster = users && users.find((u) => u.id === discussion.created_by);

  const isOpen = discussion && isStillOpen(discussion);
  const openIcon = isOpen && (
    <MaterialCommunityIcons
      name="lock-open-variant-outline"
      size={24}
      color={colors.strongGrey}
    />
  );


  // TODO: when moving into post, it should carry the users
  // from the discussion or group that we are in now
  const LocalHeader = () => (
    <UniversalHeader
      onBack={navBack}
      headerLeft={
        isMobile()
          ? null
          : () => (
            <TouchableOpacity onPress={onDesktopClose}>
              <MaterialIcons
                name="close"
                color={colors.strongGrey}
                size={24}
              />
            </TouchableOpacity>
          )
      }
      onNew={() => router.push(`/post?did=${did}`)}
    >
      {isLoading ? (
        <ActivityIndicator size="small" />
      ) : (
        <TouchableOpacity style={{ marginLeft: 8 }} onPress={openContactSheet}>
          <View style={[headerStyles.middleTitle, { gap: 4 }]}>
            {group ? (
              <GroupParticipants size="small" group={group} users={users.map((u) => u.id)} />
            ) : isDM ? (
              <DMTo iconPosition="left" contact={dmTo} />
            ) : (
              <ContactsSummary
                size="small"
                contactsCount={users.length}
                withExplanation
                friendsOfFriends={discussion?.member_mode === "friends_of_friends"}
              />
            )}
            {openIcon}
          </View>
        </TouchableOpacity>
      )}
    </UniversalHeader>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.contrastBackground }}>
      <LocalHeader />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.rowBackground }]}
      >
        <MemoDiscussionApp did={did} highlightedMessageId={mid} />
        {!isLoading && isContactSheet && (
          <ContactsSheet
            discussion={discussion}
            users={users}
            group={group}
            onClose={() => setIsContactSheet(false)}
            isVisible={isContactSheet}
            onPressAvatar={onPressAvatar}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
