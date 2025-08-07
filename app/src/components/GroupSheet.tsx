import React, { useCallback, useContext, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Text,
  Switch,
} from "react-native";

import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import { FrontendDBContext } from "../context/FrontendDBProvider";

import { SimpleBottomSheet } from "./BottomSheet";
import { GroupRow, SimpleRow } from "./contacts";
import TouchableOpacityItem from "./TouchableOpacityItem";

const keyExtractor = (item: T.Group) => item.id;

type Props = {
  onClose: () => void;
  onPressGroup: (group: T.Group) => void;
  onPressYou: () => void;
  isVisible: boolean;
  onToggleHidden: () => void;
  onOpenLocationSheet: () => void;
  feedQuery: T.MainFeedQuery;
};

export const GroupSheet = ({
  onClose,
  onPressGroup,
  onPressYou,
  onToggleHidden,
  onOpenLocationSheet,
  isVisible,
  feedQuery,
}: Props) => {
  const colors = useThemeColors();
  const { db } = useContext(FrontendDBContext);

  const allGroups = db.getAllGroups();
  const sortedGroups = useMemo(
    () => allGroups.sort((a, b) => a.name.localeCompare(b.name)),
    [allGroups],
  );

  const renderGroup = useCallback(
    ({ item, index }) => {
      return (
        <TouchableOpacityItem
          key={item.id}
          onPress={() => onPressGroup(item)}
          style={{
            borderRadius: 10,
            backgroundColor: colors.appBackground,
          }}
        >
          <GroupRow index={index} item={item} />
        </TouchableOpacityItem>
      );
    },
    [onPressGroup, colors.rowBackground],
  );

  const renderAll = useCallback(() => {
    return (
      <TouchableOpacity
        onPress={() => onPressGroup(null)}
        style={{
          borderRadius: 10,
          backgroundColor: colors.rowBackground,
        }}
      >
        <SimpleRow title="All groups and contacts" />
      </TouchableOpacity>
    );
  }, [onPressGroup, colors.rowBackground]);

  const renderYou = useCallback(() => {
    return (
      <TouchableOpacity
        onPress={onPressYou}
        style={{
          borderRadius: 10,
          backgroundColor: colors.rowBackground,
        }}
      >
        <SimpleRow title="Your posts" />
      </TouchableOpacity>
    );
  }, [onPressYou, colors.rowBackground]);

  const renderSelectCities = useCallback(() => {
    return (
      <TouchableOpacity
        onPress={onOpenLocationSheet}
        style={{
          borderRadius: 10,
          backgroundColor: colors.rowBackground,
        }}
      >
        <SimpleRow title="Cities" />
      </TouchableOpacity>
    )
  }, [onOpenLocationSheet, colors.rowBackground]);

  const renderHidden = useCallback(() => {
    return (
      <View
        style={[{
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 20,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        { backgroundColor: colors.appBackground }
        ]
        }
      >
        <Text style={{ fontSize: 18, color: colors.primaryText }}>
          Include hidden posts
        </Text>
        <Switch
          ios_backgroundColor={colors.switchBackground}
          onValueChange={onToggleHidden}
          value={feedQuery.hidden ?? false}
        />
      </View>
    );
  }, [onToggleHidden, colors.rowBackground, colors.primaryText, colors.switchBackground, feedQuery.hidden]);

  const buttonStyle = { marginBottom: 18, backgroundColor: colors.rowBackground };

  return (
    <SimpleBottomSheet isVisible={isVisible} onClose={onClose} title="Feeds">
      <ScrollView style={[styles.innerContainer, { backgroundColor: colors.rowBackground }]}>
        <View style={[styles.sectionOuter, { backgroundColor: colors.rowBackground }]}>
          <View style={buttonStyle}>{renderAll()}</View>
          <View style={buttonStyle}>{renderYou()}</View>
          <View style={buttonStyle}>{renderSelectCities()}</View>
          <View style={buttonStyle}>{renderHidden()}</View>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
            Groups ({sortedGroups.length})
          </Text>
          <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
            <FlatList<T.Group>
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              data={sortedGroups}
              renderItem={renderGroup}
            />
          </View>
        </View>
      </ScrollView>
    </SimpleBottomSheet>
  );
};

const styles = StyleSheet.create({
  sectionOuter: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  container: { flex: 1, marginTop: 50 },
  innerContainer: { display: "flex", flexDirection: "column", flex: 1 },
  flatListContainer: {
    borderRadius: 10,
  },
});