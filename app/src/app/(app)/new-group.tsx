import React, { useState, useContext } from "react";
import {
  Text,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";

import { ClientContext } from "../../context/ClientProvider";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { useDebouncedRouter } from "../../context/debounceRouter";
import { MobileScreenWrapper } from "../../components/MobileScreenWrapper";
import { UniversalHeader } from "../../components/Header";
import { useThemeColors } from "../../gifted/hooks/useThemeColors";

const Button = ({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.appBackground },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, { color: colors.buttonActive }]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function NewGroup() {
  const { db } = useContext(FrontendDBContext);
  const { gatzClient } = useContext(ClientContext);
  const params = useLocalSearchParams();
  const is_crew = params.withCrewInvite === "true";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const colors = useThemeColors();

  const isValid = name.length > 2;

  // XXX: this should be debounced
  const onSubmit = async () => {
    if (isValid) {
      const { group } = await gatzClient.createGroup({
        name,
        description,
        is_crew,
      });
      db.addGroup(group);
      if (group && group.id) {
        // Use non-debounced router to properly replace /new-group in history
        router.replace(`/group/${group.id}?from=create`);
      }
    }
  };

  return (
    <MobileScreenWrapper>
      <View style={[styles.background, { backgroundColor: colors.rowBackground }]}>
        <UniversalHeader title="New group" />
        <ScrollView style={styles.innerContainer}>
          <View style={styles.sectionOuter}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Name</Text>
            <TextInput
              style={[styles.settingsInput, { backgroundColor: colors.appBackground, color: colors.secondaryText }]}
              placeholder="Group name"
              placeholderTextColor={colors.secondaryText}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.sectionOuter}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Description</Text>
            <TextInput
              style={[styles.settingsInput, { backgroundColor: colors.appBackground, color: colors.secondaryText }]}
              placeholder="Description"
              placeholderTextColor={colors.secondaryText}
              value={description}
              onChangeText={setDescription}
            />
          </View>
          <Button
            disabled={!isValid}
            title="Create"
            onPress={onSubmit}
          />
          <Text style={{ marginTop: 12, color: colors.secondaryText }}>
            You can add members in the next screen
          </Text>
          <Text style={{ marginTop: 12, color: colors.secondaryText }}>
            You'll get a link to share in the next screen.
          </Text>
        </ScrollView>
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  settingsInput: {
    minHeight: 40,
    fontSize: 16,
    padding: 8,
    borderRadius: 8,
  },
  sectionOuter: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  container: { flex: 1, marginTop: 50 },
  innerContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    padding: 12,
  },
  flatListContainer: {
    borderRadius: 10,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    minHeight: 40,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "500",
  },
  background: { flex: 1 },
});