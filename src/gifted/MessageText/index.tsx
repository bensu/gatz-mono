import React, { useCallback, useContext, useMemo, useState } from "react";
import { Platform, Linking, StyleSheet, View, ViewStyle, TextProps, Text } from "react-native";

import Animated from "react-native-reanimated";
import ParsedText, { ParseShape } from "react-native-parsed-text";

import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';

import { useChatContext } from "../GiftedChatContext";
import { error } from "../logging";
import { useDiscussionContext } from "../../context/DiscussionContext";
import { useThemeColors } from "../hooks/useThemeColors";
import * as T from "../../gatz/types";
import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { TEST_ID } from "../Constant";

const WWW_URL_PATTERN = /^www\./i;

const DEFAULT_OPTION_TITLES = ["Call", "Text", "Cancel"];

/**
 * Configuration options for post-related display behavior.
 * 
 * This type controls how messages are displayed when they are part of a post context.
 * It maintains two key invariants:
 * - [post-display-mode] isPost: When true, the message is rendered as part of a post view with special formatting
 *   (e.g., 6-line truncation, fade gradient, no username prefix)
 * - [active-state-styling] isActive: When true, indicates the post/message has special active state styling
 * 
 * Used by Bubble.tsx to configure MessageText rendering based on the message context.
 */
export type PostOpts = { isPost: boolean; isActive: boolean };

/**
 * Props interface for the MessageText component.
 * 
 * Defines the configuration options for rendering message text with various features:
 * - [phone-action-titles] optionTitles: Custom titles for phone number action sheet (defaults to ["Call", "Text", "Cancel"])
 * - [message-data] currentMessage: The message object to render, containing text, user_id, and other metadata
 * - [username-visibility] showLeftUsername: Whether to display the username prefix (ignored when postOpts.isPost is true)
 * - [text-truncation] showFull: When false, text is truncated to numberOfLines (2 for regular messages, 6 for posts)
 * - [post-rendering-mode] postOpts: Controls post-specific rendering behavior (required)
 * - [web-only-styles] textContainerStyle: Additional container styles (only applied on web platform)
 * - [search-highlighting] searchText: When provided, extracts and highlights matching text context using <highlight> tags
 * 
 * Used by Bubble.tsx to render message content with proper formatting and interactivity.
 */
export interface MessageTextProps {
  optionTitles?: string[];
  currentMessage?: T.Message;
  // user?: User;
  showLeftUsername?: boolean;
  showFull?: boolean;
  postOpts: PostOpts;
  textContainerStyle?: ViewStyle;
  searchText?: string;
}

// Whatever the link is that was shared, the app has to do the right thing!

type GatzUrlType = "mobile" | "web" | "app";
const GATZ_URL_PATTERN =
  /(chat\.gatz:\/\/|https:\/\/(?:app\.)?gatz\.chat\/)[^\s]+/;

/**
 * Custom hook for handling Gatz-specific URLs across different platforms.
 * 
 * This hook provides a unified way to handle deep links and navigation for Gatz URLs,
 * supporting three URL formats:
 * - [mobile-deep-links] Mobile deep links: chat.gatz://[path]
 * - [web-urls] Web URLs: https://gatz.chat/[path]
 * - [app-urls] App URLs: https://app.gatz.chat/[path]
 * 
 * Key functionality:
 * - [url-type-detection] Automatically detects URL type and extracts the navigation path
 * - [platform-routing] Handles platform-specific routing logic:
 *   - [web-deep-link-conversion] On web: Converts mobile deep links to web routes
 *   - [mobile-in-app-navigation] On mobile: Keeps all navigation in-app regardless of URL format
 * - [error-resilience] Provides error handling for invalid URLs
 * 
 * Returns:
 * - [main-handler] handleGatzUrl: Main function to process and navigate to Gatz URLs
 * - [type-identifier] getUrlType: Helper to identify the URL format type
 * - [path-extractor] extractPath: Helper to extract the navigation path from a URL
 * 
 * Invariants:
 * - [internal-navigation-only] All navigation stays within the app (no external browser opening)
 * - [path-structure-preserved] Path extraction preserves the route structure for router.push()
 * - [graceful-error-handling] Invalid URLs are logged but don't cause crashes
 * 
 * Used by MessageText component to handle Gatz URL clicks in parsed message text.
 */
export const useGatzUrlHandler = () => {
  const router = useRouter();

  // [type-identifier]
  const getUrlType = (url: string): GatzUrlType | null => {
    // [url-type-detection] [mobile-deep-links]
    if (url.startsWith("chat.gatz://")) return "mobile";
    // [url-type-detection] [web-urls]
    if (url.startsWith("https://gatz.chat/")) return "web";
    // [url-type-detection] [app-urls]
    if (url.startsWith("https://app.gatz.chat/")) return "app";
    return null;
  };

  // [path-extractor]
  const extractPath = (url: string, urlType: GatzUrlType): string => {
    switch (urlType) {
      case "mobile":
        // [path-structure-preserved]
        return url.replace("chat.gatz://", "/");
      case "web":
        // [path-structure-preserved]
        return url.replace("https://gatz.chat", "");
      case "app":
        // [path-structure-preserved]
        return url.replace("https://app.gatz.chat", "");
      default:
        return url;
    }
  };

  // [main-handler]
  const handleGatzUrl = (url: string) => {
    try {
      const urlType = getUrlType(url);
      if (!urlType) {
        // [error-resilience] [graceful-error-handling]
        console.warn("Invalid Gatz URL format:", url);
        return;
      }

      const path = extractPath(url, urlType);

      // [platform-routing] [web-deep-link-conversion]
      // If we're on web and it's a mobile deep link, convert it
      if (Platform.OS === "web" && urlType === "mobile") {
        const webPath = path.replace("/", "");
        // [internal-navigation-only]
        router.push(webPath);
        return;
      }

      // [platform-routing] [mobile-in-app-navigation]
      // If we're on mobile and it's a web/app link, keep in-app
      if (Platform.OS !== "web" && (urlType === "web" || urlType === "app")) {
        // [internal-navigation-only]
        router.push(path);
        return;
      }

      // [mobile-in-app-navigation]
      // Handle mobile deep links on mobile
      if (Platform.OS !== "web" && urlType === "mobile") {
        // [internal-navigation-only]
        router.push(path);
        return;
      }

      // Default case - just push to router
      // [internal-navigation-only]
      router.push(path);
    } catch (error) {
      // [error-resilience] [graceful-error-handling]
      console.error("Error handling Gatz URL:", error);
    }
  };

  return { handleGatzUrl, getUrlType, extractPath, };
};

// Keep in sync with backend at gatz.db.message/extract-mentions
const AT_MENTION_PATTERN =
  /(?:^|(?<![\w@]))@([a-z][a-z0-9_]*)(?:(?=\W|$)|(?=@))/;

const URL_PATTERN =
  /https?:\/\/(www\.)?[-\p{L}\p{M}0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-\p{L}\p{M}0-9()@:%_\+.~#?&//=]*)/gu;

const HIGHLIGHT_PATTERN = /<highlight>(.*?)<\/highlight>/;

const renderHighlightedText = (_matchingString: string, matches: string[]): string => {
  return matches[1]; // matches[1] contains the content between <highlight> tags
};

const onUrlPress = (url: string) => {
  const cleanUrl = url.replace(/\.$/, "");
  // When someone sends a message that includes a website address beginning with "www." (omitting the scheme),
  // react-native-parsed-text recognizes it as a valid url, but Linking fails to open due to the missing scheme.
  if (WWW_URL_PATTERN.test(cleanUrl)) {
    onUrlPress(`https://${cleanUrl}`);
  } else {
    Linking.openURL(cleanUrl).catch((e) => {
      error(e, "No handler for URL:", cleanUrl);
    });
  }
};

const onEmailPress = (email: string) =>
  Linking.openURL(`mailto:${email}`).catch((e) =>
    error(e, "No handler for mailto"),
  );

const estimateNumberOfLines = (text: string): number => {
  const lines = text.split("\n");
  return lines.reduce((total, line) => {
    const words = line.split(" ");
    return total + Math.ceil(words.length / 30);
  }, 0);
};

const extractSearchContext = (text: string, searchText: string, contextChars: number = 50): string | null => {
  if (!searchText || !text) return null;
  const searchIndex = text.toLowerCase().indexOf(searchText.toLowerCase());
  if (searchIndex === -1) return null;

  // [search-context-window]
  const start = Math.max(0, searchIndex - contextChars);
  const end = Math.min(text.length, searchIndex + searchText.length + contextChars);

  let excerpt = text.slice(start, searchIndex) +
    // [highlight-tag-wrapping]
    '<highlight>' + text.slice(searchIndex, searchIndex + searchText.length) + '</highlight>' +
    text.slice(searchIndex + searchText.length, end);
  // [context-ellipsis]
  if (start > 0) excerpt = '...' + excerpt;
  // [context-ellipsis]
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
};

/**
 * Main component for rendering message text with rich interactive features.
 * 
 * This component handles the display of chat messages with support for:
 * - [rich-text-parsing] Rich text parsing (URLs, emails, phone numbers, @mentions, Gatz-specific links)
 * - [platform-optimized] Platform-specific rendering optimizations
 * - [post-truncation-gradient] Text truncation with fade gradients for posts
 * - [search-context-extraction] Search result highlighting with context extraction
 * - [interactive-elements] Interactive elements (clickable links, usernames, phone action sheets)
 * 
 * Key features and invariants:
 * 1. Username Display:
 *    - [username-prefix-conditional] Shows username prefix in bold unless postOpts.isPost is true
 *    - [username-db-lookup] Username is fetched from the database using the message's user_id
 * 
 * 2. Text Truncation:
 *    - [message-line-limit] Regular messages: 2 lines when showFull is false
 *    - [post-line-limit-gradient] Posts: 6 lines when showFull is false, with fade gradient overlay
 *    - [platform-truncation-detection] Web platform uses estimation, native platforms use onTextLayout
 * 
 * 3. Search Highlighting:
 *    - [search-context-window] When searchText is provided, extracts context around the match
 *    - [highlight-tag-wrapping] Wraps matches in <highlight> tags for visual emphasis
 *    - [context-ellipsis] Shows ellipsis (...) for truncated context
 * 
 * 4. Interactive Parsing:
 *    - [mention-validation-navigation] @mentions: Validated against usernameToId map, navigates to contact page
 *    - [gatz-url-internal-routing] Gatz URLs: Handled by useGatzUrlHandler for in-app navigation
 *    - [external-url-browser] Regular URLs: Opens in default browser (prepends https:// for www. links)
 *    - [phone-action-sheet] Phone numbers: Shows action sheet with Call/Text options
 *    - [email-client-launch] Emails: Opens default mail client
 * 
 * 5. Styling:
 *    - [theme-color-support] Uses theme colors for proper light/dark mode support
 *    - [highlighted-message-colors] Highlighted messages have special color treatment
 *    - [base-text-style-consistency] All text uses consistent messageTextStyle base
 * 
 * Used extensively by Bubble.tsx to render message content in chat bubbles.
 */
export function MessageText({
  // user,
  // [message-data]
  currentMessage = {} as T.Message,
  // [phone-action-titles]
  optionTitles = DEFAULT_OPTION_TITLES,
  // [username-visibility]
  showLeftUsername = true,
  // [text-truncation]
  showFull = true,
  // [post-rendering-mode]
  postOpts = { isPost: false, isActive: false },
  // [web-only-styles]
  textContainerStyle,
  // [search-highlighting]
  searchText,
}: MessageTextProps) {
  const { actionSheet } = useChatContext();
  const { usernameToId } = useDiscussionContext();
  const router = useRouter();
  // [theme-color-support]
  const colors = useThemeColors();

  const { handleGatzUrl } = useGatzUrlHandler();

  // [highlighted-message-colors]
  const isHighlighted = false; // currentMessage.isHighlighted;
  const textColorStyle = isHighlighted
    ? { color: colors.activeBackgroundText }
    : { color: colors.primaryText };

  // [phone-action-sheet]
  const onPhonePress = (phone: string) => {
    // [phone-action-titles]
    const options =
      optionTitles && optionTitles.length > 0
        ? optionTitles.slice(0, 3)
        : DEFAULT_OPTION_TITLES;
    const cancelButtonIndex = options.length - 1;
    // [interactive-elements]
    actionSheet().showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      (buttonIndex: number) => {
        switch (buttonIndex) {
          case 0:
            Linking.openURL(`tel:${phone}`).catch((e) => {
              error(e, "No handler for telephone");
            });
            break;
          case 1:
            Linking.openURL(`sms:${phone}`).catch((e) => {
              error(e, "No handler for text");
            });
            break;
          default:
            break;
        }
      },
    );
  };

  const { db } = useContext(FrontendDBContext);

  // [username-db-lookup]
  const user = useMemo(() => {
    // [message-data]
    return currentMessage.user_id ? db.maybeGetUserById(currentMessage.user_id) : null;
  }, [currentMessage.user_id]);

  const renderUsername = () => {
    return (
      // [username-bold-style] [base-text-style-consistency]
      <Text style={[styles.messageUsername, textColorStyle]}>
        {user?.name}{" "}
      </Text>
    );
  };

  // [mention-validation-navigation]
  const validateUsername = (matchingString: string, matches: string[]) => {
    const username = matches[1];
    const contactId = usernameToId.get(username);
    if (contactId) {
      return matchingString;
    } else {
      return null;
    }
  };
  // [mention-validation-navigation]
  const onUsernamePress = (username: string) => {
    const contactId = usernameToId.get(username);
    if (contactId) {
      router.push(`/contact/${contactId}`);
    }
  };
  // [post-line-limit-gradient] [message-line-limit]
  const numberOfLines = postOpts.isPost ? 6 : 2;

  // [platform-truncation-detection]
  const estimatedNumberOfLines: number | undefined = useMemo(() => {
    // [platform-optimized]
    if (Platform.OS === "web") {
      if (!currentMessage.text) return 0;
      return estimateNumberOfLines(currentMessage.text);
    } else {
      return undefined;
    }
  }, [currentMessage.text]);

  const [isTruncated, setIsTruncated] = useState(
    showFull
      ? false
      : estimatedNumberOfLines !== undefined
        ? estimatedNumberOfLines >= numberOfLines
        : true
  );

  // [platform-truncation-detection]
  const onTextLayout = useCallback(({ nativeEvent: { lines } }) => {
    // [text-truncation]
    if (!showFull) {
      setIsTruncated(lines.length >= numberOfLines);
    }
  }, [numberOfLines, showFull]);

  const messageText = useMemo(() => {
    // [search-highlighting] [search-context-extraction]
    if (searchText && currentMessage.text) {
      return extractSearchContext(currentMessage.text, searchText) || currentMessage.text;
    }
    // [message-data]
    return currentMessage.text;
  }, [currentMessage.text, searchText]);

  const linkStyle = [styles.messageLink];
  const baseParsers: ParseShape[] = [
    {
      pattern: AT_MENTION_PATTERN,
      renderText: validateUsername,
      style: styles.messageUsername,
      onPress: onUsernamePress,
    },
    {
      // Replace the separate patterns with the unified one
      pattern: GATZ_URL_PATTERN,
      style: linkStyle,
      onPress: handleGatzUrl,
    },
    {
      pattern: URL_PATTERN,
      style: linkStyle,
      onPress: onUrlPress,
    },
    { type: "phone", style: linkStyle, onPress: onPhonePress },
    { type: "email", style: linkStyle, onPress: onEmailPress },
  ];

  const highlightParser: ParseShape = {
    pattern: HIGHLIGHT_PATTERN,
    renderText: renderHighlightedText,
    // TODO: fix for darkmode
    style: { backgroundColor: 'yellow', fontWeight: 'bold', color: "black" }
  };

  const parsers: ParseShape[] = searchText ? [...baseParsers, highlightParser] : baseParsers;

  return (
    <Animated.View style={[
      styles.messageContainer,
      // [web-only-styles]
      Platform.OS === "web" ? textContainerStyle : undefined,
    ]}>
      <View style={{ position: "relative" }}>
        <Text
          testID={TEST_ID.MESSAGE_TEXT}
          onTextLayout={onTextLayout}
          style={textColorStyle}
          // [text-truncation]
          numberOfLines={showFull ? null : numberOfLines}
          ellipsizeMode="tail"
        >
          {/* [username-prefix-conditional] [post-display-mode] */}
          {postOpts.isPost ? null : renderUsername()}
          {messageText && (
            <ParsedText
              // [base-text-style-consistency] [message-body-style]
              style={[styles.messageText, textColorStyle]}
              parse={parsers}
            >
              {messageText}
            </ParsedText>
          )}
        </Text>
        {/* [post-truncation-gradient] [post-display-mode] */}
        {isTruncated && postOpts.isPost ? <PostFadeGradient colors={colors} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {},
  // [message-body-style] [base-text-style-consistency]
  messageText: {
    // [font-size-standard]
    fontSize: 16,
    // [line-height-spacing]
    lineHeight: 20,
  },
  // [link-underline-style]
  messageLink: { 
    // [font-size-standard]
    fontSize: 16,
    // [line-height-spacing]
    lineHeight: 20,
    textDecorationLine: "underline" 
  },
  // [username-bold-style]
  messageUsername: { 
    // [font-size-standard]
    fontSize: 16,
    // [line-height-spacing]
    lineHeight: 20,
    fontWeight: "bold" 
  },
});

/**
 * Standard text style configuration for message rendering.
 * 
 * Provides consistent typography settings used throughout the message display:
 * - [font-size-standard] fontSize: 16 (standard readable size for chat messages)
 * - [line-height-spacing] lineHeight: 20 (provides proper vertical spacing for readability)
 * 
 * This style is applied to all text elements within messages including:
 * - [message-body-style] Message body text
 * - [username-bold-style] Usernames (with additional bold weight)
 * - [link-underline-style] Links (with additional underline decoration)
 * 
 * [consistent-typography] Exported for use by other components that need to maintain consistent
 * text styling with the chat interface (e.g., Bubble.tsx).
 */
// [consistent-typography]
export const messageTextStyle = styles.messageText;

const PostFadeGradient = ({ colors }: { colors: any }) => (
  <LinearGradient
    colors={[`${colors.appBackground}00`, colors.appBackground,]}
    style={[gradientStyles.postContainer, colors.theme === "light" ? gradientStyles.lightHeight : gradientStyles.darkHeight]}
  />
);

const gradientStyles = StyleSheet.create({
  lightHeight: { height: 12 },
  darkHeight: { height: 10 },
  postContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});

