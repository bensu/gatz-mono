import { useRef, useState, useContext, useMemo, useCallback, useEffect } from "react";
import {
  Alert,
  Platform,
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Text,
  ActivityIndicator,
} from "react-native";
import { useAsync } from "react-async-hook";

import type { } from "@redux-devtools/extension";

import { useLocalSearchParams } from "expo-router";
import { useDebouncedRouter } from "../../context/debounceRouter";

import * as T from "../../gatz/types";
import { Styles as GatzStyles, Color as GatzColor } from "../../gatz/styles";
import { assertNever, multiPlatformAlert, union, setToggle } from "../../util";

import { SessionContext } from "../../context/SessionProvider";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { ClientContext } from "../../context/ClientProvider";

import { useProductAnalytics } from "../../sdk/posthog";

import { UniversalHeader, headerStyles } from "../../components/Header";
import {
  DMTo,
  GroupParticipants,
  ContactsSummary,
} from "../../components/Participants";
import { canPost, initialSelectionCase, SelectParticipants, } from "../../components/SelectParticipants";
import { MobileScreenWrapper } from "../../components/MobileScreenWrapper";
import {
  OUTER_H_PADDING,
  PostComposer,
  UpstreamDraftRef,
  FromOriginalMessage,
} from "../../components/PostComposer";
import { N_PROMPTS, PROMPTS } from "../../components/InitialPrompt";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../gifted/hooks/useThemeColors";
import { activeLinkPreviews } from "../../vendor/react-native-link-preview/LinkPreview";
import { getLocation } from "../../location/Location";

const isValidPost = (
  draft: string,
  medias?: T.Media[],
) => {
  return (
    (draft.length > 0 || (medias && medias.length > 0))
  );
};

const DraftPostScreenInner = ({
  allFriends,
  friendsOfFriends,
  contact_id,
  group,
  seedDiscussion,
  poster,
  seedText,
}: {
  allFriends: T.Contact[];
  friendsOfFriends: T.Contact[];
  contact_id?: T.Contact["id"];
  group?: T.Group;
  seedDiscussion?: T.Discussion;
  poster: T.User;
  seedText?: string;
}) => {
  const colors = useThemeColors();
  const router = useDebouncedRouter();
  const { gatzClient } = useContext(ClientContext);
  const { session: { userId } } = useContext(SessionContext);
  const { db } = useContext(FrontendDBContext);
  const params = useLocalSearchParams();

  const did = params.did as string;
  const mid = params.mid as string | undefined;

  const insets = useSafeAreaInsets();
  console.log("useSafeAreaInsets", useSafeAreaInsets);
  console.log("insets", insets);



  // ================================
  // Location

  const initialLocation: T.Location | undefined = params.location ? getLocation(params.location as string) : undefined;

  const postToFriendsOfFriends = db.getFeatureFlag("post_to_friends_of_friends");

  let placeholder = useMemo(() => {
    const promptIndexParam = params.promptIndex as string | undefined;
    const promptIndex = promptIndexParam ? parseInt(promptIndexParam) : undefined;
    return promptIndex !== undefined && promptIndex < N_PROMPTS
      ? PROMPTS[promptIndex]
      : undefined;
  }, [params.promptIndex]);

  // ================================
  // Original message

  // TODO: move this to the same spot as the originalDiscussionUser is coming from
  const originalMessage: T.Message | undefined = useMemo(() => {
    if (mid) {
      const message = db.getMessageById(did, mid);
      if (!message) {
        throw new Error("Message not found");
      }
      return message;
    } else {
      return undefined;
    }
  }, [db, did, mid]);

  // TODO: if this is not in memory, it should be fetched from the server
  // The person that made the original discussion and the person that made the original message
  const [originalDiscussionUser, originalMessageUser] = useMemo(() => {
    return [
      seedDiscussion && db.getUserById(seedDiscussion.created_by),
      originalMessage && db.getUserById(originalMessage.user_id),
    ];
  }, [originalMessage, db]);

  const [fromOriginalMessage, setFromOriginalMessage] = useState<FromOriginalMessage | undefined>(
    originalMessage
      ? {
        message: originalMessage,
        discussion: seedDiscussion,
        discussionUser: originalDiscussionUser,
        messageUser: originalMessageUser,
        active: true,
      }
      : undefined,
  );

  const toggleOriginalMessage = useCallback(() => {
    if (fromOriginalMessage) {
      setFromOriginalMessage((om) => ({ ...om, active: !om.active }));
    }
  }, [setFromOriginalMessage]);

  // ================================
  // Friend database

  // All selections are Sets of ids
  // The contacts are kept in arrays

  const forcedSelectedContactIds = useMemo(() => {
    return fromOriginalMessage && fromOriginalMessage.active
      ? new Set<T.Contact["id"]>([fromOriginalMessage.messageUser.id])
      : new Set<T.Contact["id"]>();
  }, [fromOriginalMessage]);

  const [allFriendIds, allSortedFriends] = useMemo(() => {
    const sorted = allFriends
      .filter((c) => c.id !== userId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const withPriority = [
      ...sorted.filter((c) => forcedSelectedContactIds.has(c.id)),
      ...sorted.filter((c) => !forcedSelectedContactIds.has(c.id)),
    ];
    return [
      new Set(sorted.map((c) => c.id)),
      withPriority,
    ];
  }, [userId, allFriends]);

  const [allFriendsOfFriendsIds, allSortedFriendsOfFriends] = useMemo(() => {
    const sorted = friendsOfFriends
      .filter((c) => c.id !== userId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      new Set(sorted.map((c) => c.id)),
      sorted,
    ];
  }, [userId, friendsOfFriends]);

  const [selectionCase, setSelectionCase] = useState(
    initialSelectionCase(userId, group, allFriendIds, seedDiscussion, postToFriendsOfFriends, contact_id)
  );

  const onTapContact = useCallback(
    (cid: T.Contact["id"]) => {
      setSelectionCase((current) => {
        switch (current.type) {
          case "allGroupMembers": {
            return {
              type: "group",
              selectedContactIds: setToggle(current.groupMembers, cid),
              group: current.group,
              groupMembers: current.groupMembers,
            };
          }
          case "group": {
            const newSet = setToggle(current.selectedContactIds, cid);
            if (newSet.size === current.groupMembers.size) {
              return {
                type: "allGroupMembers",
                group: current.group,
                groupMembers: current.groupMembers,
              };
            } else {
              return {
                type: "group",
                selectedContactIds: newSet,
                group: current.group,
                groupMembers: current.groupMembers,
              };
            }
          }
          case "friendsOfFriends": {
            throw new Error("Can't make selections while all friends are selected");
          }
          case "allFriends": {
            return {
              type: "selectedFriends",
              selectedContactIds: setToggle(allFriendIds, cid),
            };
          }
          case "selectedFriends": {
            const currentlySelected = current.selectedContactIds;
            const newSet = setToggle(currentlySelected, cid);
            if (newSet.size === 0) {
              return { type: "empty" };
            } else if (newSet.size === 1) {
              return { type: "DM", friendId: Array.from(newSet)[0] };
            } else {
              return { type: "selectedFriends", selectedContactIds: newSet };
            }
          }
          case "empty": {
            return {
              type: "DM",
              friendId: cid,
            };
          }
          case "DM": {
            if (current.friendId === cid) {
              return { type: "empty" };
            } else {
              return {
                type: "selectedFriends",
                selectedContactIds: new Set([current.friendId, cid]),
              };
            }
          }
          default: {
            assertNever(current);
          }
        }
      });
    },
    [setSelectionCase],
  );

  const onTapAllGroupMembers = useCallback(() => {
    setSelectionCase((current) => {
      switch (current.type) {
        case "allGroupMembers": {
          return {
            type: "group",
            selectedContactIds: current.groupMembers,
            group: current.group,
            groupMembers: current.groupMembers,
          };
        }
        case "group": {
          return {
            type: "allGroupMembers",
            group: current.group,
            groupMembers: current.groupMembers,
          };
        }
        default: {
          throw new Error("Can't make selections while all group members are selected");
        }
      }
    });
  }, [setSelectionCase]);

  const onTapAllFriends = useCallback(() => {
    setSelectionCase((current) => {
      if (current.type === "allFriends") {
        return { type: "empty" };
      } else {
        return { type: "allFriends" };
      }
    });
  }, [setSelectionCase, allFriendIds]);

  const onTapFriendsOfFriends = useCallback(() => {
    setSelectionCase((current) => {
      if (current.type === "friendsOfFriends") {
        return { type: "allFriends" };
      } else {
        return { type: "friendsOfFriends" };
      }
    });
  }, [setSelectionCase]);

  // ================================
  // Posting

  const draftRef = useRef<UpstreamDraftRef>();

  const [isPosting, setIsPosting] = useState(false);
  const disablePost = useMemo(
    () => !canPost(selectionCase, allFriends, friendsOfFriends) || isPosting,
    [selectionCase, allFriends, friendsOfFriends, isPosting],
  );

  // to_all_contacts should be an active state instead of inferred
  // selected_users should be nil if to_all_contacts is true
  const onNewPost = useCallback(async () => {
    try {
      setIsPosting(true);
      if (draftRef.current && !draftRef.current.isLoadingMedia) {
        const draft = draftRef.current.draft;
        const medias = draftRef.current.medias;
        const link_previews = activeLinkPreviews(draft, draftRef.current.linkPreviews)
          .map(({ previewData }) => previewData.id);

        let group_id: T.Group["id"] | undefined;
        let to_all_contacts = false;
        let to_all_friends_of_friends = false;
        let selected_users: T.Contact["id"][] | undefined;
        switch (selectionCase.type) {
          case "group": {
            group_id = selectionCase.group.id;
            to_all_contacts = false;
            to_all_friends_of_friends = false;
            selected_users = Array.from(selectionCase.selectedContactIds);
            break;
          }
          case "allGroupMembers": {
            group_id = selectionCase.group.id;
            to_all_contacts = true;
            to_all_friends_of_friends = false;
            selected_users = undefined;
            break;
          }
          case "DM": {
            to_all_contacts = false;
            to_all_friends_of_friends = false;
            selected_users = [selectionCase.friendId];
            break;
          }
          case "allFriends": {
            to_all_contacts = true;
            to_all_friends_of_friends = false;
            selected_users = undefined;
            break;
          }
          case "friendsOfFriends": {
            to_all_contacts = true;
            to_all_friends_of_friends = true;
            selected_users = undefined;
            break;
          }
          case "selectedFriends": {
            to_all_contacts = false;
            to_all_friends_of_friends = false;
            selected_users = Array.from(selectionCase.selectedContactIds);
            break;
          }
          case "empty": {
            throw new Error("Can't post to no audience");
          }
          default: {
            assertNever(selectionCase);
          }
        }
        if (canPost(selectionCase, allFriends, friendsOfFriends) && isValidPost(draft, medias)) {
          try {
            const dr = await gatzClient.createDiscussion({
              to_all_contacts,
              to_all_friends_of_friends,
              selected_users,
              group_id,
              text: draft,
              media_ids: medias && medias.map((m) => m.id),
              link_previews,
              location_id: draftRef.current.location?.id,
              originally_from:
                fromOriginalMessage && fromOriginalMessage.active
                  ? {
                    mid: fromOriginalMessage.message.id,
                    did: fromOriginalMessage.discussion.id,
                  }
                  : undefined,
            });
            const { users } = dr;
            users.forEach((u) => db.addUser(u));
            db.addDiscussionResponse(dr);
            // We need to reset this here, otherwise it stays set for the next draft
            draftRef.current?.clearDraft();
            router.replace("/");
          } catch (e) {
            multiPlatformAlert(
              "Failed to post",
              "There was an unexpected error. Please try later",
            );
          }
        } else {
          multiPlatformAlert(
            "Invalid post",
            "You can't post empty text or to no audience",
          );
        }
      }
    } finally {
      setIsPosting(false);
    }
    // TODO: handle empty case?
  }, [
    gatzClient,
    db,
    router.replace,
    selectionCase,
    allFriends,
    friendsOfFriends,
    fromOriginalMessage,
  ]);

  const [isContactSheet, setIsContactSheet] = useState(false);
  const openContactSheet = () => setIsContactSheet(true);

  // TODO: does the cancel button clear the draft
  // TODO: if there is no back, can it go to a particular screen?

  const analytics = useProductAnalytics();

  const cancel = useCallback(() => {
    const draft = draftRef.current;
    if (draft) {
      if (draft.draft.length > 0) {
        analytics.capture("draft.cancel");
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router.canGoBack, router.replace, router.back, analytics]);

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity onPress={cancel}>
        <Text style={[GatzStyles.button, { color: colors.secondaryText }]}>Cancel</Text>
      </TouchableOpacity>
    ),
    [cancel, colors],
  );

  const headerRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={onNewPost}
        style={[
          styles.postButton,
          { backgroundColor: colors.active },
          disablePost ? { opacity: 0.5 } : null,
        ]}
      >
        {isPosting ? (
          <ActivityIndicator size="small" color={colors.activeBackgroundText} />
        ) : (
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.newPostIcon, }}>
            Post
          </Text>
        )}
      </TouchableOpacity>
    ),
    [onNewPost, disablePost],
  );

  const HeaderTitle = useCallback(() => {

    let title: React.ReactNode;
    switch (selectionCase.type) {
      case "group": {
        title = (
          <GroupParticipants
            size="small"
            group={selectionCase.group}
            users={[...Array.from(selectionCase.selectedContactIds), userId]}
          />
        );
        break;
      }
      case "allGroupMembers": {
        title = (
          <GroupParticipants
            size="small"
            group={selectionCase.group}
            users={[...Array.from(selectionCase.groupMembers), userId]}
          />
        );
        break;
      }
      case "DM": {
        const dmToContact = allSortedFriends.find((c) => c.id === selectionCase.friendId);
        if (!dmToContact) {
          throw new Error("DM to contact not found");
        }
        title = <DMTo iconPosition="left" contact={dmToContact} />;
        break;
      }
      case "allFriends": {
        title = (
          <ContactsSummary
            size="small"
            contactsCount={allSortedFriends.length}
            withExplanation
            friendsOfFriends={false}
            color={colors.primaryText}
          />
        )
        break;
      }
      case "friendsOfFriends": {
        title = (
          <ContactsSummary
            size="small"
            contactsCount={allSortedFriends.length + allSortedFriendsOfFriends.length}
            withExplanation
            friendsOfFriends={true}
            color={colors.primaryText}
          />
        )
        break;
      }
      case "selectedFriends": {
        title = (
          <ContactsSummary
            size="small"
            contactsCount={selectionCase.selectedContactIds.size}
            withExplanation
            friendsOfFriends={false}
            color={colors.primaryText}
          />
        );
        break;
      }
      case "empty": {
        title = (
          <Text>No one here</Text>
        );
        break;
      }
      default: {
        assertNever(selectionCase);
      }
    }

    return (
      <TouchableOpacity style={{ marginLeft: 8 }} onPress={openContactSheet}>
        <View style={headerStyles.middleTitle}>
          {title}
        </View>
      </TouchableOpacity>
    );
  }, [openContactSheet, group]);

  const initialDraft = useMemo(() => {
    if (fromOriginalMessage) {
      if (fromOriginalMessage.messageUser.id === userId) {
        return fromOriginalMessage.message.text;
      } else {
        return `From @${fromOriginalMessage.messageUser.name}:\n\n > ${fromOriginalMessage.message.text}`;
      }
    } else {
      return seedText || "";
    }
  }, [fromOriginalMessage, seedText]);

  const selectedContactIds: Set<T.Contact["id"]> = useMemo(() => {
    switch (selectionCase.type) {
      case "DM": {
        return new Set([selectionCase.friendId]);
      }
      case "allFriends": {
        return allFriendIds;
      }
      case "friendsOfFriends": {
        return allFriendsOfFriendsIds;
      }
      case "selectedFriends": {
        return selectionCase.selectedContactIds;
      }
      case "empty": {
        return new Set();
      }
      case "group": {
        return selectionCase.selectedContactIds;
      }
      case "allGroupMembers": {
        return selectionCase.groupMembers;
      }
      default: {
        assertNever(selectionCase);
      }
    }
  }, [selectionCase]);

  return (
    <View style={[styles.background, { backgroundColor: colors.appBackground }]}>
      <UniversalHeader headerRight={headerRight} headerLeft={Platform.OS === "web" && headerLeft}>
        <HeaderTitle />
      </UniversalHeader>
      <KeyboardAvoidingView
        style={[styles.container]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100 - insets.bottom}
      >
        <PostComposer
          draftRef={draftRef}
          gatzClient={gatzClient}
          placeholder={placeholder}
          members={selectedContactIds}
          initialDraft={initialDraft}
          onNewPost={onNewPost}
          initialLocation={initialLocation}
          fromOriginalMessage={fromOriginalMessage}
          toggleOriginalMessage={toggleOriginalMessage}
        />
        {isContactSheet && (
          <SelectParticipants
            group={group}
            onClose={() => setIsContactSheet(false)}
            isVisible={isContactSheet}
            selectionCase={selectionCase}
            onTapContact={onTapContact}
            onTapAllFriends={onTapAllFriends}
            onTapFriendsOfFriends={onTapFriendsOfFriends}
            onTapAllGroupMembers={onTapAllGroupMembers}
            forcedSelectedContactIds={forcedSelectedContactIds}
            allSortedFriends={allSortedFriends}
            allSortedFriendsOfFriends={allSortedFriendsOfFriends}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default function DraftPostScreen() {
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const params = useLocalSearchParams();
  const colors = useThemeColors();
  const did = params.did as string;
  const contact_id = params.contact_id as string;
  const seedText = params.seedText as string;

  const seedDiscussion: T.Discussion | undefined = useMemo(() => {
    if (did) {
      const d = db.getDiscussionById(did);
      if (!d) {
        throw new Error("Discussion not found");
      }
      return d;
    } else {
      return undefined;
    }
  }, [did, db]);

  const group_id =
    (params.group_id as string | undefined) || seedDiscussion?.group_id;

  const {
    result,
    loading: isLoadingContacts,
    error: contactsError,
  } = useAsync(async () => {
    const r = group_id
      ? await gatzClient.getContacts(group_id)
      : await gatzClient.getContacts();
    if (r.user) {
      db.setMe(r.user);
    }
    if (r.contacts) {
      r.contacts.forEach((c) => db.addUser(c));
      r.contacts.forEach((c) => db.addContactId(c.id));
    }
    if (r.friends_of_friends) {
      r.friends_of_friends.forEach((c) => db.addUser(c));
    }
    if (r.group) {
      db.addGroup(r.group);
    }
    return r;
  }, [gatzClient, db]);

  if (contactsError) {
    return (
      <View>
        <Text style={{ color: colors.primaryText }}>
          There was an error, please try again later
        </Text>
        <Text style={{ color: colors.secondaryText }}>{contactsError.message}</Text>
      </View>
    );
  }

  if (isLoadingContacts) {
    return <ActivityIndicator />;
  }

  return (
    <MobileScreenWrapper>
      <DraftPostScreenInner
        contact_id={contact_id}
        group={result.group}
        seedDiscussion={seedDiscussion}
        allFriends={result.contacts}
        friendsOfFriends={result.friends_of_friends}
        poster={result.user}
        seedText={seedText}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  postButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 66,
    minHeight: 32,
  },
  background: { flex: 1 },
  container: { flex: 1 },
  innerPostHeader: {
    justifyContent: "space-between",
    paddingHorizontal: OUTER_H_PADDING,
  },
  centeredRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  bold: { fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center" },
});
