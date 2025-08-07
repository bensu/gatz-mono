import React, { createContext, useState, useCallback, useContext, useEffect } from "react";
import { Platform, Text, TouchableOpacity } from "react-native";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "./ThemeProvider";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

const ANIMATION_DURATION = 200;

type Colors = {
  color: string;
  backgroundColor: string;
}

type BaseActionPillProps = {
  id: string;
  onPress?: () => void;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  timeout?: number;
}

type ActionPillProps = BaseActionPillProps & Colors;

export const ActionPill = ({ action }: { action: ActionPillProps }) => {
  return (
    <View
      key={action.id}
      style={[{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        borderRadius: 20,
        paddingVertical: action.onPress ? 0 : 10,
        paddingHorizontal: 16,
      },
      { backgroundColor: action.backgroundColor, }
      ]}
    >
      {action.description && (
        <Text style={{ color: action.color }}>
          {action.description}
        </Text>
      )}
      {action.onPress && (
        <TouchableOpacity
          onPress={action.onPress}
          style={{
            paddingVertical: 10,
            marginLeft: action.description ? 8 : 0,
          }}
        >
          <Text style={{ color: action.color, fontWeight: "bold" }}>{action.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View >
  )
}

export const ContrastActionPill = ({ action }: { action: BaseActionPillProps }) => {
  const colors = useThemeColors();
  return (
    <ActionPill
      action={{
        ...action,
        color: colors.contrastText,
        backgroundColor: colors.contrastBackground,
      }}
    />
  );
}

type ActionPillContextType = {
  appendAction: (action: BaseActionPillProps) => void;
}

export const ActionPillContext = createContext<ActionPillContextType>({
  appendAction: (action: BaseActionPillProps) => { },
});

const DEFAULT_TIMEOUT = 5000;

export const ActionPillProvider: React.FC<{ children: React.ReactNode }> = ({ children, }) => {
  const [actions, setActions] = useState<BaseActionPillProps[]>([]);

  const removeAction = useCallback((id: string) => {
    setActions((actions) => actions.filter((a) => a.id !== id));
  }, [actions]);

  const appendAction = useCallback((action: BaseActionPillProps) => {
    const actionWithTimeout = {
      ...action,
      onPress: () => {
        action.onPress();
        removeAction(actionWithTimeout.id);
      },
      timeout: action.timeout ?? DEFAULT_TIMEOUT
    }
    setActions((actions) => [...actions, actionWithTimeout]);
    setTimeout(() => {
      removeAction(actionWithTimeout.id);
    }, actionWithTimeout.timeout);
  }, [actions, removeAction]);

  // const hasActions = actions.length > 0;
  // const overlayStyle: StyleProp<ViewStyle> = hasActions ? { display: "flex", pointerEvents: "auto", } : { display: "none" };

  return (
    <ActionPillContext.Provider value={{ appendAction }}>
      <View style={styles.flex1}>
        <View style={styles.flex1}>
          {children}
        </View>
        <View style={styles.pillsContainer}>
          {actions.slice().reverse().map((action, index) => (
            <Animated.View
              key={action.id}
              entering={FadeInDown.duration(ANIMATION_DURATION)}
              exiting={FadeOutUp.duration(ANIMATION_DURATION)}
              style={[
                styles.pillPosition,
                { bottom: Platform.select({ web: 40, default: 80 }) + (index * 60) }
              ]}
            >
              <ContrastActionPill key={action.id} action={action} />
            </Animated.View>
          ))}
        </View>
      </View>
    </ActionPillContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1, position: "relative" },
  contentContainer: {},
  pillsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  pillPosition: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  }
});
