import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from './hooks/useThemeColors';

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "🔥", "❗", "❓"];

import { MENU_ANIMATION_DURATION } from "../context/PortalProvider";
import { TEST_ID } from './Constant';

export const REACTION_MENU_HEIGHT = 52;
export const REACTION_MENU_WIDTH = 350;

export const QuickReactions = ({ onSelectReaction, onMore, reactions, userId }: {
    onMore: () => void,
    onSelectReaction: (emoji: string) => void
    reactions: Record<string, Record<string, string>>,
    userId: string
}) => {
    const colors = useThemeColors();
    const userReactions = reactions[userId] || {};
    const userHasReaction = (reaction: string) => userReactions[reaction] !== undefined;

    return (
        <Animated.View
            style={[styles.container, { backgroundColor: colors.appBackground }]}
            entering={FadeInDown.duration(MENU_ANIMATION_DURATION)}
            testID={TEST_ID.QUICK_REACTIONS}
        >
            <View style={styles.reactionsRow}>
                {QUICK_REACTIONS.map((emoji, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onSelectReaction(emoji)}
                        style={[
                            styles.reactionButton,
                            userHasReaction(emoji) && { backgroundColor: colors.softGrey },
                        ]}
                    >
                        <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    onPress={onMore}
                    style={[styles.moreReactionsButton, { backgroundColor: colors.defaultBackground }]}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.secondaryText} />
                </TouchableOpacity>

            </View>
        </Animated.View>
    );
};

const MORE_REACTIONS_RADIUS = 16;

const styles = StyleSheet.create({
    container: {
        height: REACTION_MENU_HEIGHT,
        width: REACTION_MENU_WIDTH,
        borderRadius: 8,
        padding: 8,
    },
    reactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reactionButton: {
        padding: 6,
        marginHorizontal: Platform.select({ ios: 2, android: 4 }),
        borderRadius: 12,
    },
    emoji: { fontSize: Platform.select({ default: 24, android: 18 }), },
    moreReactionsButton: {
        // padding: 12,
        marginHorizontal: 2,
        paddingTop: 2,
        paddingLeft: 1,
        width: MORE_REACTIONS_RADIUS * 2,
        height: MORE_REACTIONS_RADIUS * 2,
        borderRadius: MORE_REACTIONS_RADIUS,
        // position: "relative",
        justifyContent: "center",
        alignItems: "center",
    }
});

