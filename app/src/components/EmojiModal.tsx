import * as React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Platform,
    TextStyle,
    TouchableOpacity,
    FlatList,
    TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import groupBy from 'just-group-by';
import mapValues from 'just-map-values';
import { frequentEmojiStore } from '../gatz/store';

const emojiDB = require('./emoji.json') as Array<Emoji>;

const prepareEmojisByCategory = () => {
    const blocklistedEmojis = ['white_frowning_face', 'keycap_star', 'eject'];

    const filteredEmojis = emojiDB.filter((emoji: Emoji) => {
        if (blocklistedEmojis.includes(emoji.short_name)) return false;
        if (Platform.OS === 'android') {
            const addedIn = parseFloat(emoji.added_in);
            if (Number.isNaN(addedIn)) return true;
            if (addedIn < 2) return true;
            if (addedIn === 2) return Platform.Version >= 23;
            if (addedIn <= 4) return Platform.Version >= 24;
            if (addedIn <= 5) return Platform.Version >= 26;
            if (addedIn <= 11) return Platform.Version >= 28;
            else return Platform.Version >= 29;
        } else {
            return true;
        }
    });

    const groupedEmojis = groupBy(
        filteredEmojis,
        (emoji: Emoji) => emoji.category,
    );

    const emojisByCategory = mapValues(groupedEmojis, (group: Array<Emoji>) =>
        group.map(charFromEmojiObj),
    );

    return { emojisByCategory, filteredEmojis };
}


const r = prepareEmojisByCategory();

const emojisByCategory: Record<string, Array<string>> = r.emojisByCategory;
const filteredEmojis: Array<Emoji> = r.filteredEmojis;
// const groupedEmojis: Record<string, Array<Emoji>> = r.groupedEmojis;

const noop = () => { };

interface Emoji {
    category: string;
    unified: string;
    short_name: string;
    added_in: string;
    _score: number;
}

// Conversion of codepoints and surrogate pairs. See more here:
// https://mathiasbynens.be/notes/javascript-unicode
// https://mathiasbynens.be/notes/javascript-escapes#unicode-code-point
// and `String.fromCodePoint` on MDN
function charFromUtf16(utf16: string) {
    return String.fromCodePoint(
        ...(utf16.split('-').map((u) => '0x' + u) as any),
    );
}

function charFromEmojiObj(obj: Emoji): string {
    return charFromUtf16(obj.unified);
}

export type Category = string | null;

type LocalizedCategories = [
    string, // Smileys & Emotion
    string, // People & Body
    string, // Animals & Nature
    string, // Food & Drink
    string, // Activities
    string, // Travel & Places
    string, // Objects
    string, // Symbols
    string, // Flags
];

const CATEGORIES: LocalizedCategories = [
    'Smileys & Emotion',
    'People & Body',
    'Animals & Nature',
    'Food & Drink',
    'Activities',
    'Travel & Places',
    'Objects',
    'Symbols',
    'Flags',
];

function categoryToIcon(cat: string) {
    if (cat === 'Smileys & Emotion') return 'emoticon';
    if (cat === 'People & Body') return 'human-greeting';
    if (cat === 'Animals & Nature') return 'cat';
    if (cat === 'Food & Drink') return 'food-apple';
    if (cat === 'Activities') return 'tennis-ball';
    if (cat === 'Travel & Places') return 'car';
    if (cat === 'Objects') return 'lightbulb';
    if (cat === 'Symbols') return 'alert';
    if (cat === 'Flags') return 'flag-variant';
    return 'emoticon-cool';
}

const DEFAULT_EMOJI_SIZE = 36;
const SHORTCUT_SIZE = DEFAULT_EMOJI_SIZE * 0.75;
const PADDING = 5;
const DEFAULT_COLUMNS = Platform.OS === 'web' ? 10 : 8;
const ROWS_VISIBLE = DEFAULT_COLUMNS;
const EMOJI_GROUP_PADDING_BOTTOM = PADDING * 3;
const TOTAL_HEIGHT = DEFAULT_EMOJI_SIZE * ROWS_VISIBLE + PADDING * 2;

const SEARCH_ICON_SIZE = 32;

const styles = StyleSheet.create({
    emojiTextStyle: {
        fontSize: DEFAULT_EMOJI_SIZE * Platform.select({ default: 0.8, android: 0.6 }),
        textAlign: 'center' as const,
        lineHeight: DEFAULT_EMOJI_SIZE,
    },
    emojiTouchableStyle: {
        width: DEFAULT_EMOJI_SIZE,
        height: DEFAULT_EMOJI_SIZE,
        margin: PADDING,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        padding: 0,
        borderRadius: 10,
        flexDirection: 'column',
    },

    scrollerContainer: {
        minHeight: TOTAL_HEIGHT,
        maxHeight: TOTAL_HEIGHT,
        ...Platform.select({
            web: {
                overflowY: 'scroll',
            },
        }),
    },

    scroller: {
        flexDirection: 'column',
        minHeight: TOTAL_HEIGHT,
        maxHeight: TOTAL_HEIGHT,
    },

    searchContainer: {
        position: 'relative',
        flexDirection: 'row',
        paddingVertical: PADDING,
        marginBottom: 8
    },

    search: {
        flex: 1,
        marginTop: 3,
        marginHorizontal: 3,
        paddingVertical: 4,
        paddingLeft: 44,
        paddingRight: 12,
        zIndex: 10,
        height: 44,
        fontSize: 16,
        borderRadius: 8,
        // paddingHorizontal: 10,

    },

    searchIcon: {
        position: 'absolute',
        left: 8,
        top: 14,
        zIndex: 20,
    },

    headerText: {
        padding: PADDING,
        // color: 'black',
        fontWeight: 'bold',
        justifyContent: 'center',
        textAlignVertical: 'center',
    },

    categoryOuter: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingBottom: PADDING,
    },

    emojiGroup: {
        marginBottom: EMOJI_GROUP_PADDING_BOTTOM,
        alignItems: 'center',
        flexWrap: 'wrap',
        flexDirection: 'row',
    },

    shortcutsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: PADDING,
        marginBottom: 12,
    },
    shortcut: { padding: PADDING, },
});

type EmojiGroupProps = {
    category: string;
    emojis: Array<string>;
    onEmojiSelected: (e: string) => void;
    columns?: number;
    colors: any,
    onUndoReaction: (reaction: string) => void;
    userReactions: Record<string, string>;
}

class EmojiGroup extends React.Component<EmojiGroupProps> {

    renderEmoji = (e: string) => {
        const { colors, userReactions, onEmojiSelected, onUndoReaction } = this.props;
        const userHasReacted = userReactions[e];
        return (
            <TouchableOpacity
                key={e}
                style={[
                    styles.emojiTouchableStyle,
                    userHasReacted && { backgroundColor: colors.reactionsBg }
                ]}
                onPress={() => {
                    if (userHasReacted) {
                        onUndoReaction(e);
                    } else {
                        onEmojiSelected(e)
                    }
                }}
            >
                <Text style={styles.emojiTextStyle}>
                    {e}
                </Text>
            </TouchableOpacity>
        );

    }
    public render(): React.ReactNode {
        const emojis = this.props.emojis;
        const size = DEFAULT_EMOJI_SIZE;
        const cols = DEFAULT_COLUMNS;
        const maxWidth = (size + PADDING * 2) * cols + 2;
        const minWidth = maxWidth;

        return (
            <View style={[styles.emojiGroup, { minWidth, maxWidth }]}>
                {emojis.filter((e) => !!e).map((e) => this.renderEmoji(e))}
            </View>
        );
    }
}

type EmojiCategoryProps = {
    category: string;
    onEmojiSelected: (e: string) => void;
    columns?: number;
    localizedCategories?: LocalizedCategories;
    colors: any;
    userReactions: Record<string, string>;
    onUndoReaction: (reaction: string) => void;
};

const RecentEmojiCategory = (props: EmojiCategoryProps) => {
    const {
        onEmojiSelected,
        columns,
        colors,
        userReactions,
        onUndoReaction,
    } = props;

    const { getTopEmojis } = frequentEmojiStore();

    const topEmojis = getTopEmojis(DEFAULT_COLUMNS * 2);

    return (
        <View style={[styles.categoryOuter]}>
            <EmojiGroup
                category={RECENT_CATEGORY}
                colors={colors}
                userReactions={userReactions}
                emojis={topEmojis}
                onEmojiSelected={onEmojiSelected}
                onUndoReaction={onUndoReaction}
                columns={columns}
            />
        </View>
    );
}

class EmojiCategory extends React.Component<EmojiCategoryProps> {

    shouldComponentUpdate(nextProps: Readonly<EmojiCategoryProps>): boolean {
        return nextProps.category !== this.props.category || nextProps.colors !== this.props.colors;
    }

    public render(): React.ReactNode {
        const {
            onEmojiSelected,
            columns,
            category,
            localizedCategories,
            colors,
            userReactions,
            onUndoReaction,
        } = this.props;

        const emojis = emojisByCategory[category];
        const categoryText = localizedCategories
            ? localizedCategories[CATEGORIES.indexOf(category)]
            : category;

        return (
            <View style={[styles.categoryOuter]}>
                <Text style={[styles.headerText, { color: colors.primaryText }]}>{categoryText}</Text>
                <EmojiGroup
                    category={category}
                    colors={colors}
                    userReactions={userReactions}
                    emojis={emojis}
                    onEmojiSelected={onEmojiSelected}
                    onUndoReaction={onUndoReaction}
                    columns={columns}
                />
            </View>
        );
    }
}

class SearchField extends React.Component<{ colors: any; onChanged: (str: string) => void; }> {
    public render(): React.ReactNode {
        const { onChanged, colors } = this.props;
        return (
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                    key="a"
                    size={SEARCH_ICON_SIZE}
                    style={styles.searchIcon}
                    color={colors.softGrey}
                    name="magnify"
                />
                <TextInput
                    key="b"
                    style={[styles.search, {
                        backgroundColor: colors.rowBackground,
                        color: colors.primaryText
                    }]}
                    onChangeText={onChanged}
                    autoFocus={false}
                    multiline={false}
                    returnKeyType="search"
                    underlineColorAndroid="transparent"
                />
            </View>
        );
    }
}

type CategoryShortcutsProps = {
    colors: any;
    show: boolean;
    // activeCategory: string;
    onPressCategory?: (cat: string) => void;
    setActiveCategoryRef: React.MutableRefObject<((category: string) => void) | null>;
};

type CategoryShortcutsState = {
    activeCategory: string;
}


class CategoryShortcuts extends React.Component<CategoryShortcutsProps, CategoryShortcutsState> {
    constructor(props: CategoryShortcutsProps) {
        super(props);
        this.state = {
            activeCategory: CATEGORIES[0]
        };
        // Use mutable ref callback pattern instead of direct assignment
        if (this.props.setActiveCategoryRef.current === null) {
            this.props.setActiveCategoryRef.current = (category: string) => {
                this.setState({ activeCategory: category });
            };
        }
    }

    public render(): React.ReactNode {
        // Scroll doesn't work on react-native-web due to bad FlatList support

        const { colors, onPressCategory, show } = this.props;
        const { activeCategory } = this.state;

        return (
            <View style={styles.shortcutsContainer}>
                {CATEGORIES.map((category) => {
                    if (show) {
                        return (
                            <TouchableOpacity key={category} onPress={() => onPressCategory?.(category)}>
                                <MaterialCommunityIcons
                                    size={SHORTCUT_SIZE}
                                    style={styles.shortcut}
                                    color={category === activeCategory ? colors.primaryText : colors.softGrey}
                                    name={categoryToIcon(category)}
                                />
                            </TouchableOpacity>
                        );
                    } else {
                        return (
                            <MaterialCommunityIcons
                                key={category}
                                size={SHORTCUT_SIZE}
                                style={styles.shortcut}
                                name={categoryToIcon(category)}
                                color="transparent"
                            />
                        );
                    }
                })}
            </View>
        );
    }
}

function normalize(str: string) {
    return str
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ +/g, '')
        .replace(/_+/g, ' ')
        .trim();
}

type Props = {
    colors: any;
    onEmojiSelected: (reaction: string) => void;
    onUndoReaction: (reaction: string) => void;
    localizedCategories?: LocalizedCategories;
    shortcutColor?: string;
    activeShortcutColor?: string;
    reactions: Record<string, string>;
};

type State = {
    searchResults: Array<string>;
}
const RECENTS_HEIGHT = DEFAULT_EMOJI_SIZE * 2 + PADDING * 4;

const calculateLayouts = (): Array<{ length: number; offset: number; index: number }> => {
    let heightsSoFar = RECENTS_HEIGHT;
    return CATEGORIES.map((category, i) => {
        const numEmojis = emojisByCategory[category].length;
        const numColumns = DEFAULT_COLUMNS;
        const emojiSize = DEFAULT_EMOJI_SIZE;
        const numRows = Math.ceil(numEmojis / numColumns);
        const headerHeight = 16 + 2 * PADDING;
        const offset = heightsSoFar;
        const rowHeight = emojiSize + 2 * PADDING;
        const bottomPadding = EMOJI_GROUP_PADDING_BOTTOM;
        const height = headerHeight + numRows * rowHeight + bottomPadding;
        heightsSoFar += height;
        return { length: height, offset, index: i };
    });
};

const LAYOUTS: Array<{ length: number; offset: number; index: number }> = calculateLayouts();


export default class EmojiModal extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { searchResults: [], };
        this.setActiveCategoryRef = React.createRef() as React.MutableRefObject<((category: string) => void) | null>;
    }

    setActiveCategoryRef: React.MutableRefObject<((category: string) => void) | null>;

    private readonly ref = React.createRef<FlatList<Category>>();
    private readonly viewabilityConfig = {
        minimumViewTime: Platform.select({ web: 150, ios: 100, android: 250 }),
        viewAreaCoveragePercentThreshold: 51,
    };

    private renderItem = ({ item }: { item: Category }) => {
        const { searchResults } = this.state;
        if (searchResults.length > 0) {
            return <EmojiGroup category="search" {...this.props} emojis={searchResults} userReactions={this.props.reactions} />;
        } else {
            const category = item as unknown as string;
            return (
                <EmojiCategory
                    {...this.props}
                    userReactions={this.props.reactions}
                    colors={this.props.colors}
                    category={category}
                    key={category}
                />
            );
        }
    };

    private onSearchChanged = (input: string) => {
        if (input.length === 0) {
            if (this.state.searchResults.length > 0) {
                this.setState({ searchResults: [] });
            }
            return;
        }
        if (input.length < 2) {
            return;
        }

        const query = normalize(input);

        const searchResults = filteredEmojis
            .map((emoji) => {
                const shortName = normalize(emoji.short_name);
                const score =
                    shortName === query
                        ? 3
                        : shortName.startsWith(query)
                            ? 2
                            : shortName.includes(query)
                                ? 1
                                : 0;
                emoji._score = score;
                return emoji;
            })
            .filter((emoji) => emoji._score > 0)
            .sort((a, b) => b._score - a._score)
            .map(charFromEmojiObj);

        if (searchResults.length === 0) searchResults.push('');

        this.setState({ searchResults });
    };

    private onPressCategory = (category: string) => {

        const index = CATEGORIES.indexOf(category);
        if (index >= 0) {
            this.ref.current?.scrollToIndex({
                index: index,
                viewPosition: 0,
                viewOffset: 0,
            });

            this.setActiveCategoryRef.current(category);
        }
    };

    getItemLayout = (data: Array<Category> | null | undefined, index: number) => {
        if (data?.[0] === null) return { length: TOTAL_HEIGHT, offset: 0, index: 0 };
        return LAYOUTS[index];
    };

    onViewableItemsChanged = ({ viewableItems }: any) => {
        if (viewableItems.length === 0) return;
        const category = viewableItems[0].key;
        this.setActiveCategoryRef.current(category);
    };

    renderHeader = () => {
        const { searchResults } = this.state;

        if (searchResults.length > 0) {
            return null;
        }

        return (
            <View style={{ height: RECENTS_HEIGHT }}>
                <RecentEmojiCategory
                    {...this.props}
                    category={RECENT_CATEGORY}
                    colors={this.props.colors}
                    userReactions={this.props.reactions}
                    onEmojiSelected={this.props.onEmojiSelected}
                    onUndoReaction={this.props.onUndoReaction}
                />
            </View>
        );
    }


    public render(): React.ReactNode {
        const { colors } = this.props;
        const { searchResults } = this.state;

        return (
            <View style={[{ backgroundColor: colors.appBackground }]}>
                <View style={[styles.container]}>
                    <SearchField colors={colors} onChanged={this.onSearchChanged} />
                    <View style={styles.scrollerContainer}>
                        <FlatList<Category>
                            ref={this.ref}
                            data={searchResults.length > 0 ? [null] : CATEGORIES}
                            horizontal={false}
                            numColumns={1}
                            onEndReachedThreshold={Platform.OS === 'web' ? 1 : 1000}
                            onScrollToIndexFailed={noop}
                            style={[styles.scroller]}
                            initialNumToRender={1}
                            maxToRenderPerBatch={1}
                            keyExtractor={(category) => category as unknown as string}
                            getItemLayout={this.getItemLayout}
                            onViewableItemsChanged={this.onViewableItemsChanged}
                            viewabilityConfig={this.viewabilityConfig}
                            renderItem={this.renderItem}
                            ListHeaderComponent={this.renderHeader}
                        />
                    </View>
                    <CategoryShortcuts
                        setActiveCategoryRef={this.setActiveCategoryRef}
                        colors={colors}
                        show={searchResults.length === 0}
                        onPressCategory={this.onPressCategory}
                    />
                </View>
            </View>
        );
    }
}


const RECENT_CATEGORY = "Recent";
