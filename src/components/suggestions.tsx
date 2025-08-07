import { Text, View, StyleSheet, TouchableOpacity } from "react-native";

import * as T from "../gatz/types";

import { MaterialIcons } from "@expo/vector-icons";

import { Color as GatzColor } from "../gatz/styles";
import { messageSuggestionStore } from "../gatz/store";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const SuggestPosting = ({
  message,
  onSuggestedPost,
  useMessageSuggestionStore,
}: {
  message: T.Message;
  onSuggestedPost: (mid: T.Message["id"]) => void;
  useMessageSuggestionStore: ReturnType<typeof messageSuggestionStore>;
}) => {
  const colors = useThemeColors();
  const mid = message.id;
  const { youShouldPostWasDismissed, dismissYouShouldPost, isLoading } =
    useMessageSuggestionStore();

  if (youShouldPostWasDismissed || isLoading) {
    return null;
  }

  return (
    <View style={styles.suggestedActionsContainer}>
      <View style={styles.suggestedActionsInnerContainer}>
        <TouchableOpacity onPress={() => onSuggestedPost(mid)}>
          <Text>
            <Text
              style={[
                styles.suggestedActionsText,
                styles.suggestedActionsActiveText,
                { color: colors.softFont },
              ]}
            >
              Consider posting about this
            </Text>
            <Text style={styles.suggestedActionsText}>
              , your friends are curious!
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.floatingRight}
        onPress={dismissYouShouldPost}
      >
        <MaterialIcons name="close" size={16} color={colors.softFont} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // suggestedActions
  floatingRight: {}, // { position: "absolute", right: 0 },
  suggestedActionsContainer: {
    marginLeft: 35,
    marginTop: 4,
    marginBottom: 12,
    marginRight: 4,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  suggestedActionsInnerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  suggestedActionsText: { fontSize: 12 },
  suggestedActionsActiveText: { color: GatzColor.active },
});
