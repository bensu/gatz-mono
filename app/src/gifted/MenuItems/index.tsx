import React, { useMemo, useContext, useCallback } from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeInUp, useAnimatedStyle } from "react-native-reanimated";

import { ThemeContext } from "../../context/ThemeProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { MENU_ANIMATION_DURATION } from "../../context/PortalProvider";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);


// MenuItem


export type MenuItemProps = {
  text: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'],
  onPress?: (...args: any[]) => void;
  isTitle?: boolean;
  isDestructive?: boolean;
  withSeparator?: boolean;
};


type MenuItemComponentProps = {
  item: MenuItemProps;
  isLast?: boolean;
  onClose: () => void;
};

export const BORDER_LIGHT_COLOR = 'rgba(0, 0, 0, 0.1)';
export const BORDER_DARK_COLOR = 'rgba(255, 255, 255, 0.1)';


export const MENU_TITLE_COLOR = 'gray';
export const MENU_TEXT_LIGHT_COLOR = 'rgba(0, 0, 0, 1)';
export const MENU_TEXT_DARK_COLOR = 'rgb(255, 255, 255)';

export const MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT = 'rgb(255, 59,48)';
export const MENU_TEXT_DESTRUCTIVE_COLOR_DARK = 'rgb(255, 69,58)';

/**
 * Determines the appropriate text color for menu items based on their type and theme.
 * 
 * This function encapsulates the color selection logic for menu items, ensuring
 * consistent visual hierarchy and theme-aware styling across the application.
 * 
 * Key functionality and invariants:
 * - [title-priority] Title items always use gray color, overriding all other styling
 * - [destructive-theme-aware] Destructive items use different shades of red based on theme
 * - [fallback-hierarchy] Non-title, non-destructive items default to theme-based text colors
 * - [worklet-compatible] Marked as 'worklet' for use in reanimated style functions
 * - [pure-function] Always returns the same color for the same inputs with no side effects
 * 
 * Color priority order:
 * 1. isTitle -> MENU_TITLE_COLOR (gray)
 * 2. isDestructive -> theme-specific destructive colors (red variants)
 * 3. Default -> theme-specific text colors (black/white)
 * 
 * This function is critical for:
 * - Maintaining visual consistency in menu items
 * - Ensuring proper contrast ratios in different themes
 * - Providing clear visual feedback for destructive actions
 * 
 * @param isTitle - Whether the menu item is a title/header
 * @param isDestructive - Whether the menu item represents a destructive action
 * @param themeValue - Current theme ('light' or 'dark')
 * @returns Appropriate color string for the menu item text
 */
export const getColor = (
  isTitle: boolean | undefined,
  isDestructive: boolean | undefined,
  themeValue: 'light' | 'dark'
) => {
  'worklet'; // [worklet-compatible]
  return isTitle // [title-priority]
    ? MENU_TITLE_COLOR
    : isDestructive // [destructive-theme-aware]
      ? themeValue === 'dark'
        ? MENU_TEXT_DESTRUCTIVE_COLOR_DARK
        : MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT
      : themeValue === 'dark' // [fallback-hierarchy]
        ? MENU_TEXT_DARK_COLOR
        : MENU_TEXT_LIGHT_COLOR;
};


const MenuItem = ({ item, isLast, onClose }: MenuItemComponentProps) => {
  const { currentTheme } = useContext(ThemeContext);

  const borderStyles = useAnimatedStyle(() => {
    const borderBottomColor =
      currentTheme === 'dark' ? BORDER_DARK_COLOR : BORDER_LIGHT_COLOR;

    return {
      borderBottomColor,
      borderBottomWidth: isLast ? 0 : 1,
    };
  }, [currentTheme, isLast, item]);

  const textColor = useMemo(() => {
    return getColor(item.isTitle, item.isDestructive, currentTheme);
  }, [currentTheme, item]);

  const handleOnPress = useCallback(() => {
    if (!item.isTitle) {
      if (item.onPress) item.onPress();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <>
      <AnimatedTouchable
        onPress={handleOnPress}
        activeOpacity={!item.isTitle ? 0.4 : 1}
        style={[styles.menuItem, borderStyles]}
        entering={FadeInUp.duration(MENU_ANIMATION_DURATION)}
      >
        {item.icon && <MaterialIcons style={{ marginRight: styleGuide.spacing }} name={item.icon} size={16} color={textColor} />}
        <Text
          style={[
            item.isTitle ? styles.menuItemTitleText : styles.menuItemText,
            { color: textColor },
          ]}
        >
          {item.text}
        </Text>
      </AnimatedTouchable>
      {item.withSeparator && <Separator />}
    </>
  );
};

const Separator = () => {
  const { currentTheme } = useContext(ThemeContext);
  const separatorStyles = useAnimatedStyle(() => {
    return {
      backgroundColor:
        currentTheme === 'dark' ? BORDER_DARK_COLOR : BORDER_LIGHT_COLOR,
    };
  }, [currentTheme]);

  return <Animated.View style={[styles.separator, { ...separatorStyles }]} />;
};




/**
 * Main menu component that renders a list of menu items with consistent styling.
 * 
 * This component serves as the container for menu items, handling layout, theming,
 * and item filtering. It provides a unified interface for creating context menus,
 * dropdown menus, and action sheets throughout the application.
 * 
 * Key functionality and invariants:
 * - [undefined-filtering] Filters out undefined items from the array before rendering
 * - [last-item-detection] Automatically detects and marks the last item for border styling
 * - [theme-integration] Uses ThemeContext to apply consistent background colors
 * - [item-mapping] Maps each valid item to a MenuItem component with proper props
 * - [close-propagation] Passes onClose callback to all child MenuItem components
 * - [index-based-keys] Uses array indices as React keys for menu items
 * 
 * Layout characteristics:
 * - Wraps items in a rounded container (8px border radius)
 * - Background color matches the app's theme background
 * - Each item receives its position information (isLast) for styling
 * 
 * This component is designed to:
 * - Handle arrays with potential undefined values gracefully
 * - Provide consistent menu appearance across the app
 * - Support dynamic theming without explicit theme props
 * - Enable easy dismissal of menus through the onClose callback
 * 
 * @param items - Array of menu item configurations (may contain undefined values)
 * @param onClose - Callback function to dismiss/close the menu
 * @returns Themed container with filtered and rendered menu items
 */
export const MenuItems = ({ items, onClose }: { items: (MenuItemProps | undefined)[], onClose: () => void }) => {
  const { colors } = useContext(ThemeContext); // [theme-integration]
  const lastIndex = items.filter(item => item).length - 1; // [undefined-filtering] [last-item-detection]
  return (
    <View style={{ borderRadius: 8, backgroundColor: colors.appBackground }} >
      {items.map((item: MenuItemProps, index: number) => { // [item-mapping]
        if (!item) return null; // [undefined-filtering]
        return (
          <MenuItem
            key={index} // [index-based-keys]
            item={item}
            isLast={index === lastIndex} // [last-item-detection]
            onClose={onClose} // [close-propagation]
          />
        );
      })}
    </View>
  );
};

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('screen');

const MENU_CONTAINER_WIDTH = 100;
const MENU_WIDTH = (WINDOW_WIDTH * 60) / 100;

const styleGuide = {
  spacing: 8,
  dimensionWidth: Dimensions.get('screen').width,
  dimensionHeight: Dimensions.get('screen').height,
  palette: {
    primary: '#0072ff',
    secondary: '#e2e2e2',
    common: {
      white: '#fff',
      black: '#000',
    },
  },
  typography: {
    body: {
      fontSize: 17,
      lineHeight: 20,
    },
    callout: {
      fontSize: 16,
      lineHeight: 20,
    },
    callout2: {
      fontSize: 14,
      lineHeight: 18,
    },
  },
};

const styles = StyleSheet.create({
  separator: {
    width: '100%',
    height: 8,
  },
  menuWrapper: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    width: MENU_WIDTH,
    borderRadius: styleGuide.spacing * 1.5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    overflow: 'hidden',
    zIndex: 15,
  },
  menuInnerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: styleGuide.spacing,
    paddingVertical: styleGuide.spacing * 1.25,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemText: {
    fontSize: styleGuide.typography.callout.fontSize,
    lineHeight: styleGuide.typography.callout.lineHeight,
    textAlign: 'left',
    width: '100%',
    flex: 1,
  },
  menuItemTitleText: {
    fontSize: styleGuide.typography.callout2.fontSize,
    lineHeight: styleGuide.typography.callout2.lineHeight,
    textAlign: 'center',
    width: '100%',
    flex: 1,
  },
  textDark: {
    color: 'black',
  },
  textLight: {
    color: 'white',
  },
});