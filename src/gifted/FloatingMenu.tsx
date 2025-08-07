import { Dimensions, StyleSheet } from "react-native";
import { REACTION_MENU_HEIGHT } from "./QuickEmojiReactions";

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

export const MENU_GAP = 8;

export const MENU_HEIGHT = 168;
export const BUFFER = 70;
export const MAX_BUBBLE_HEIGHT = 200

// if the bubble starts above this y value, move the bubble and the menu
export const MAX_PAGE_Y = 80;
export const TEXT_CONTAINER_HEIGHT = 16;

export const calculateMinBubbleTop = (bubbleHeight: number, mediaHeight: number = 0, menuHeight: number = MENU_HEIGHT): number => {
    // Ensure all inputs are valid numbers
    const safeHeight = isNaN(bubbleHeight) || bubbleHeight <= 0 ? MAX_BUBBLE_HEIGHT : bubbleHeight;
    const safeMediaHeight = isNaN(mediaHeight) || mediaHeight < 0 ? 0 : mediaHeight;
    const safeMenuHeight = isNaN(menuHeight) || menuHeight <= 0 ? MENU_HEIGHT : menuHeight;
    
    const truncatedHeight = Math.min(MAX_BUBBLE_HEIGHT, safeHeight);
    // Also ensure WINDOW_HEIGHT is valid
    const windowHeight = isNaN(WINDOW_HEIGHT) || WINDOW_HEIGHT <= 0 ? 
        Dimensions.get("window").height : WINDOW_HEIGHT;
        
    return windowHeight - (truncatedHeight + safeMediaHeight + safeMenuHeight + BUFFER);
}

export const holdMenuStyles = StyleSheet.create({
    holdMenuAbsoluteContainer: {
        position: 'absolute',
        left: 0,
        width: "100%",
        flex: 1,
    },
    holdMenuRelativeContainer: {
        position: "relative",
        flexDirection: "column",
        flex: 1,
        maxWidth: 350,
    },
    holdMenuReactionContainer: {
        position: "absolute",
        top: -(REACTION_MENU_HEIGHT + MENU_GAP),
        left: 0,
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 2,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 2,
        elevation: 5,
    },
    shadowDark: {
        shadowColor: '#CCCCCC',
        shadowOffset: {
            width: 1,
            height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 5,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    postMenuContainer: {
        maxWidth: 350, flex: 1, flexDirection: "column", gap: MENU_GAP
    }
});


