import React, { useContext, useCallback, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useDebouncedRouter } from "../../../context/debounceRouter";
import { useProductAnalytics } from "../../../sdk/posthog";
import { Styles as GatzStyles } from "../../../gatz/styles";
import * as T from "../../../gatz/types";
import { UniversalHeader, HeaderTitleWithIcon } from "../../../components/Header";
import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { Ionicons } from "@expo/vector-icons";

import { LocationSelectionScreen } from "../../../location/Location";

function LocationsInner() {
  const analytics = useProductAnalytics();

  useEffect(() => {
    analytics.capture("cities.viewed");
  }, [analytics]);

  const colors = useThemeColors();

  const router = useDebouncedRouter();

  const selectLocation = useCallback((location: T.Location | null) => {
    if (location) {
      router.push(`/?location_id=${location.id}`);
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.rowBackground }]}>
      <LocationSelectionScreen onSelect={selectLocation} scrollEnabled={true} />
    </View>
  )
}

export default function Cities() {
  const colors = useThemeColors();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.rowBackground }]}>
      <View
        style={[
          styles.leftColumn,
          {
            backgroundColor: colors.rowBackground,
            borderRightColor: colors.platformSeparatorDefault,
          },
        ]}
      >
        <UniversalHeader inDrawer>
          <HeaderTitleWithIcon title="Cities" iconName="location-outline" />
        </UniversalHeader>
        <LocationsInner />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  outerContainer: { flex: 1, padding: 20 },
  leftColumn: {
    flex: 1,
    maxWidth: 600,
    borderRightColor: GatzStyles.platformSeparator.backgroundColor,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
