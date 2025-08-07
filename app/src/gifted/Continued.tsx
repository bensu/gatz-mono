import { useMemo, useContext, useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import * as T from "../gatz/types";
import { TEST_ID } from "./Constant";
import { useThemeColors } from "./hooks/useThemeColors";
import { FrontendDBContext } from "../context/FrontendDBProvider";
import { ClientContext } from "../context/ClientProvider";
import { SessionContext } from "../context/SessionProvider";

export const ENTER_ANIMATION_MS = 200;

type OriginallyFrom = {
  discussion: T.Discussion;
  discussionUser: T.Contact;
  message: T.Message | undefined;
  messageUser: T.Contact | undefined;
}

export const useContinuedDiscussion = (
  did: T.Discussion["id"] | undefined,
  mid?: T.Message["id"]
): {
  initialOriginallyFrom: OriginallyFrom | undefined,
  originallyFrom: OriginallyFrom | undefined,
  isLoading: boolean
} => {
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);

  const initialOriginallyFrom: OriginallyFrom | undefined = useMemo(() => {
    const discussion = db.getDiscussionById(did);
    const message = mid ? db.getMessageById(did, mid) : undefined;
    const discussionUser = discussion?.created_by ? db.maybeGetUserById(discussion.created_by) : undefined;
    const messageUser = message?.user_id ? db.maybeGetUserById(message.user_id) : undefined;
    if (discussion && discussionUser) {
      return { discussion, message, discussionUser, messageUser };
    } else {
      return undefined;
    }
  }, [db, did, mid]);

  const [isLoading, setIsLoading] = useState(false);
  const [originallyFrom, setOriginallyFrom] = useState<OriginallyFrom | undefined>(initialOriginallyFrom);

  useEffect(() => {
    const loadDiscussion = async () => {
      // if we dont' have the discussion or user, fetch them
      if (!isLoading && did) {
        if (!originallyFrom) {
          try {
            setIsLoading(true);
            const response = await gatzClient.maybeGetDiscussion(did);
            // Add all the data to the local DB
            if (response) {
              switch (response.current) {
                case false: {
                  const { discussion, users, group } = response;
                  db.transaction(() => {
                    users.forEach((u) => db.addUser(u));
                    if (group) {
                      db.addGroup(group);
                    }
                    db.addDiscussionResponse(response);
                  });
                  const message = mid ? db.getMessageById(did, mid) : undefined;
                  const messageUser = message?.user_id ? db.maybeGetUserById(message.user_id) : undefined;
                  const discussionUser = db.maybeGetUserById(discussion.created_by);
                  const next = { discussion, message, discussionUser, messageUser };
                  setOriginallyFrom(next);
                  break;
                }
                case true: {
                  break;
                }
              }
              setIsLoading(false);
            }
          } catch (error) {
            console.error("Failed to load discussion:", error);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    loadDiscussion();
  }, [did, gatzClient, db]);

  if (!did) {
    return {
      isLoading: undefined,
      initialOriginallyFrom: undefined,
      originallyFrom: undefined
    }
  } else {
    return { isLoading, initialOriginallyFrom, originallyFrom }
  }
}

export const ContinuedFrom = (
  {
    did,
    mid,
    wasEdited,
    posterId,
    navigateToMessage,
  }: {
    did: T.Discussion["id"],
    mid: T.Message["id"],
    wasEdited: boolean,
    posterId: T.Contact["id"],
    navigateToMessage: () => void,
  }
) => {
  const colors = useThemeColors();
  const { isLoading, initialOriginallyFrom, originallyFrom } = useContinuedDiscussion(did, mid);

  if (isLoading) {
    return null;
  }

  // This is here so that the clickable area of the Pressable text
  // doesn't extend all the way to the right of the screen
  return (
    <Animated.View
      entering={initialOriginallyFrom === undefined && FadeInUp.duration(ENTER_ANIMATION_MS)}
      style={{ display: "flex", flexDirection: "row" }}
    >
      {originallyFrom ? (
        <TouchableOpacity onPress={navigateToMessage} testID={TEST_ID.CONTINUED_FROM}>
          <View style={styles.originallyFromOuterContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="arrow-back" size={14} color={colors.active} style={{ marginRight: 2 }} />
              <Text style={[styles.originallyFromText, { color: colors.active }]}>
                {originallyFrom.messageUser && originallyFrom.messageUser.id !== posterId ? (
                  <Text>
                    Continued from{" "}
                    <Text style={{ fontWeight: "bold" }}>@{originallyFrom.messageUser.name}</Text>
                    's message
                  </Text>
                ) : originallyFrom.discussionUser ? (
                  <Text>
                    Continued from{" "}
                    <Text style={{ fontWeight: "bold" }}>@{originallyFrom.discussionUser.name}</Text>
                    's discussion
                  </Text>
                ) : (
                  <Text>Continued from discussion</Text>
                )}
                {wasEdited ? " (edited)" : null}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View>
          <View style={styles.originallyFromOuterContainer}>
            <Text style={[styles.originallyFromText, { color: colors.active }]}>
              <Text>
                <Text>Continued from another discussion</Text>
                {wasEdited ? " (edited)" : null}
              </Text>
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

export const ContinuedToPost =
  ({ navigateToDiscussion, did, messageUserId, continuedBy }: {
    did: T.Discussion["id"],
    continuedBy?: T.Contact,
    messageUserId?: T.Contact["id"],
    navigateToDiscussion: (did: T.Discussion["id"]) => void,
  }) => {
    const colors = useThemeColors();
    const { session: { userId } } = useContext(SessionContext);
    const continuedByMe = continuedBy && continuedBy.id === userId;
    const continuedByPoster = messageUserId && continuedBy && messageUserId === continuedBy.id;
    return (
      <Animated.View
        entering={FadeInRight.duration(ENTER_ANIMATION_MS)}
        style={styles.postedAsDiscussionOuter}
      >
        <TouchableOpacity onPress={() => navigateToDiscussion(did)} testID={TEST_ID.CONTINUED_TO}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(continuedBy && continuedByMe) ? (
              <Text style={[styles.postedAsDiscussionText, { color: colors.active }]}>
                Continued
              </Text>
            ) : (continuedBy && !continuedByPoster) ? (
              <Text style={[styles.postedAsDiscussionText, { color: colors.active }]}>
                Continued by <Text style={{ fontWeight: "bold" }}>@{continuedBy.name}</Text>
              </Text>
            ) : (
              <Text style={[styles.postedAsDiscussionText, { color: colors.active }]}>
                Continued
              </Text>
            )}
            <MaterialIcons
              name="arrow-forward"
              size={14}
              color={colors.active}
              style={{ marginBottom: 8, marginRight: 4 }}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

const styles = StyleSheet.create({
  originallyFromText: { fontSize: 12 },
  originallyFromOuterContainer: {
    marginLeft: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  postedAsDiscussionOuter: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 2,
  },
  postedAsDiscussionText: {
    fontSize: 12,
    marginRight: 2,
    marginBottom: 8,
  },
});

