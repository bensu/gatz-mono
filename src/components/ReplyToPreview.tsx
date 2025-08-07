import React, { useContext, useMemo } from "react";
import { Text, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import * as T from "../gatz/types";
import { FrontendDBContext } from "../context/FrontendDBProvider";

export const ReplyToPreview = ({ message }: { message: T.Message }) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);
  const author = useMemo(() => {
    if (message) {
      if (message.user_id) {
        return db.maybeGetUserById(message.user_id);
      } else {
        return null;
      }
    }
  }, [db, message]);

  if (!message) {
    return null;
  }
  return (
    <View style={[styles.container, { backgroundColor: colors.rowBackground }]}>
      <View style={[styles.mirror, styles.inlineIconMargin]}>
        <MaterialIcons name="reply" size={16} color={colors.greyText} />
      </View>

      <View style={styles.replyPreviewContainer}>
        <Text numberOfLines={1} ellipsizeMode="tail">
          <Text style={[styles.replyPreviewUsername, { color: colors.primaryText }]}>
            {author?.name}
          </Text>
          <Text style={{ color: colors.secondaryText }}> {message.text}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  replyPreviewUsername: { fontWeight: "bold" },
  replyPreviewContainer: {},
  // mirror the icon horizontally
  mirror: { transform: [{ scaleX: -1 }] },
  inlineIconMargin: { marginRight: 2, marginTop: 2 },
});