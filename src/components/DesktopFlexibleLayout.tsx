import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { 
  ContentLayoutMode, 
  getContentLayoutMode, 
  getWindowWidth 
} from "../util/layout";

interface DesktopFlexibleLayoutProps {
  selectedId: string | undefined;
  children: React.ReactNode;
  renderRightPanel: (id: string) => React.ReactNode;
  emptyStateMessage?: string;
  onClose: () => void;
}

export const DesktopFlexibleLayout = ({ 
  selectedId, 
  children, 
  renderRightPanel, 
  emptyStateMessage = "Select an item to view details",
  onClose 
}: DesktopFlexibleLayoutProps) => {
  const colors = useThemeColors();
  
  // Set initial layout mode based on current width and selectedId
  const initialLayoutMode = getContentLayoutMode(getWindowWidth(), !!selectedId);
  const [layoutMode, setLayoutMode] = useState<ContentLayoutMode>(initialLayoutMode);
  
  // Listen for window resize events and update layout mode only when it changes
  useEffect(() => {
    const handleResize = () => {
      const newWidth = getWindowWidth();
      const newLayoutMode = getContentLayoutMode(newWidth, !!selectedId);
      
      // Only update state if layout mode changed
      if (newLayoutMode !== layoutMode) {
        setLayoutMode(newLayoutMode);
      }
    };

    // Set up event listener
    const subscription = Dimensions.addEventListener('change', handleResize);

    // Clean up event listener
    return () => subscription.remove();
  }, [layoutMode, selectedId]);
  
  // When selectedId changes, update layout mode
  useEffect(() => {
    const newLayoutMode = getContentLayoutMode(getWindowWidth(), !!selectedId);
    if (newLayoutMode !== layoutMode) {
      setLayoutMode(newLayoutMode);
    }
  }, [selectedId]);

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
      {selectedId ? (
        <View style={[
          styles.rightRow,
          styles.leftShadow,
          isNarrowLayout && styles.fullWidth
        ]}>
          {renderRightPanel(selectedId)}
        </View>
      ) : !isNarrowLayout && (
        <View style={[styles.rightRow, styles.emptyState]}>
          <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>
            {emptyStateMessage}
          </Text>
        </View>
      )}
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
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    textAlign: "center",
  },
});