import { useEffect, useState, useCallback, useContext } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  AppState,
} from "react-native";

import { Styles as GatzStyle } from "../gatz/styles";
import { useDebouncedRouter } from "../context/debounceRouter";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

// export const PROMPTS = ["What's on your mind?", "What did you learn today?"];
export const PROMPTS = [
  "What’s on your mind?",
  "What is always on your mind?",
  "What is on your mind this week?",
  "What did you learn this week?",
  "What surprised you this week?",
  "What do you want to learn next?",
  "Any new rabbit holes?",
  "What have you been reading?",
  "What have you been watching?",
  "What made you think this week?",
  "Any new discoveries?",
  "Any 'aha' moments?",
  "Any new habits?",
  "What are you working towards?",
  "What have you been researching?",
  "What did you do this week that you are proud of?",
  "Looking to leak some alpha?",
  "What are your friends not paying attention to?",
  "Any predictions to make?",
  "Any news that surprised you?",
  "What are you paying attention to?",
  "If you had time for another project, what would it be?",
  "Where are you getting your dopamine this week?",
  "What are you learning this week?",
  "What are you reading this week?",
  "What are you watching this week?",
  "What are you listening to this week?",
  "What are you doing this week?",
  "What are you thinking about this week?",
];

export const N_PROMPTS = PROMPTS.length;

const newPromptIndex = () => {
  return Math.floor(Math.random() * N_PROMPTS) % N_PROMPTS;
};

export const InitialPrompt = () => {
  // Which prompt to use

  const [promptIndex, setPromptIndex] = useState(newPromptIndex());
  const incrementPromptIndex = useCallback(() => {
    setPromptIndex((pi) => (pi + newPromptIndex()) % N_PROMPTS);
  }, [setPromptIndex]);

  // Track when the app is back to the foreground
  const [appState, setAppState] = useState(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, [appState]);

  // When the app comes to the foreground, change the prompt
  useEffect(() => {
    if (appState === "active") {
      incrementPromptIndex();
    }
  }, [appState, incrementPromptIndex]);

  const prompt = PROMPTS[promptIndex];

  const router = useDebouncedRouter();
  const goToPost = useCallback(() => {
    router.push(`post?promptIndex=${promptIndex}`);
  }, [router.push, promptIndex]);

  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={goToPost}
      style={[
        styles.outerContainer,
        GatzStyle.card,
        { backgroundColor: colors.appBackground },
      ]}
    >
      <View style={styles.post}>
        <View style={{ flex: 1, marginLeft: 4 }} >
          <View style={styles.innerContainer}>
            <Text style={[styles.text, { color: colors.softFont }]}>
              {prompt}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginTop: 12,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  post: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    display: "flex",
    flexDirection: "row",
    flex: 1,
  },
  icon: { opacity: 0.6 },
  innerContainer: { flex: 1, flexDirection: "column" },
  iconPressable: { paddingHorizontal: 12 },
  text: { flex: 1, fontSize: 16 },
});
