import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { DiscussionScreen } from "./DiscussionScreen";
import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { 
  ContentLayoutMode, 
  getContentLayoutMode, 
  getWindowWidth 
} from "../util/layout";

export const DesktopDoubleLayout = ({ did, children, onDesktopClose }: {
  did: T.Discussion["id"] | undefined;
  children: React.ReactNode;
  onDesktopClose: () => void;
}) => {
  const colors = useThemeColors();
  
  // Set initial layout mode based on current width and did
  const initialLayoutMode = getContentLayoutMode(getWindowWidth(), !!did);
  const [layoutMode, setLayoutMode] = useState<ContentLayoutMode>(initialLayoutMode);
  
  // Listen for window resize events and update layout mode only when it changes
  useEffect(() => {
    const handleResize = () => {
      const newWidth = getWindowWidth();
      const newLayoutMode = getContentLayoutMode(newWidth, !!did);
      
      // Only update state if layout mode changed
      if (newLayoutMode !== layoutMode) {
        setLayoutMode(newLayoutMode);
      }
    };

    // Set up event listener
    const subscription = Dimensions.addEventListener('change', handleResize);

    // Clean up event listener
    return () => subscription.remove();
  }, [layoutMode, did]);
  
  // When did changes, update layout mode
  useEffect(() => {
    const newLayoutMode = getContentLayoutMode(getWindowWidth(), !!did);
    if (newLayoutMode !== layoutMode) {
      setLayoutMode(newLayoutMode);
    }
  }, [did]);

  const isNarrowLayout = layoutMode === "NARROW";
  const isCompactLayout = layoutMode === "COMPACT";

  return (
    <View style={[styles.fullRow, { backgroundColor: colors.rowBackground }]}>
      <View style={[
        styles.leftRow,
        { borderColor: colors.platformSeparatorDefault },
        isNarrowLayout && styles.hidden,
        isCompactLayout && styles.compactLeftRow
      ]}>
        {children}
      </View>
      {did ? (
        <View style={[
          styles.rightRow,
          styles.leftShadow,
          isNarrowLayout && styles.fullWidth
        ]}>
          <DiscussionScreen key={did} did={did} onDesktopClose={onDesktopClose} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullRow: { flexDirection: "row", height: "100%", width: "100%", },
  leftRow: { width: "45%", borderRightWidth: 1, },
  compactLeftRow: {
    width: "45%",
    minWidth: 500,
  },
  rightRow: { width: "55%", flex: 1 },
  fullWidth: { width: "100%" },
  hidden: {
    width: 0,
    overflow: "hidden",
    opacity: 0,
    borderRightWidth: 0
  },
  leftShadow: {
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});
