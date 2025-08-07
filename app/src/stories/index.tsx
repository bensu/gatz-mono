import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import LinkPreviewConfig from "./linkPreviews.stories";
import ContactRequestCardConfig from "./ContactRequestCard.stories";
import InvitesConfig from "./invites.stories";
import ActionPillConfig from "./ActionPill.stories";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import SelectMembersConfig from "./selectMembers.stories";

type StoryConfig = {
  title: string;
  component: React.ComponentType<any>;
  args?: Record<string, any>;
};

const STORIES: Record<string, StoryConfig> = {
  "Select Members": SelectMembersConfig,
  "Action Pill": ActionPillConfig,
  "Invites": InvitesConfig,
  "Contact Request Card": ContactRequestCardConfig,
  "Link Previews": LinkPreviewConfig,
};

export default function StoryBook() {
  const colors = useThemeColors();
  const [selectedStory, setSelectedStory] = useState<string>(Object.keys(STORIES)[0]);

  const Story = STORIES[selectedStory].component;
  const Variants = STORIES[selectedStory].args || {};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>StoryBook Preview</Text>

      <View style={styles.controls}>
        {Object.keys(STORIES).map((storyName) => (
          <TouchableOpacity
            key={storyName}
            style={[
              styles.button,
              selectedStory === storyName && styles.activeButton,
            ]}
            onPress={() => setSelectedStory(storyName)}
          >
            <Text
              style={[
                styles.buttonText,
                selectedStory === storyName && styles.activeButtonText,
              ]}
            >
              {storyName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {Object.keys(Variants).map((variant) => (
        <View
          key={variant}
          style={[styles.storyContainer, { backgroundColor: colors.appBackground }]}
        >
          <Text style={[styles.variantTitle, { color: colors.primaryText }]}>{variant}</Text>
          <Story {...Variants[variant]} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  activeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#000',
  },
  activeButtonText: {
    color: '#fff',
  },
  storyContainer: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
});

