import PropTypes from "prop-types";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  TextInputKeyPressEventData,
} from "react-native";
import {
  MIN_COMPOSER_HEIGHT,
  TEST_ID,
  MAX_COMPOSER_HEIGHT,
} from "../Constant";
import Color from "../Color";

import * as T from "../../gatz/types";
import { useThemeColors } from "../hooks/useThemeColors";

const MIN_HEIGHT = 40;

const PADDING_VERTICAL = Platform.select({ ios: 10, default: 4 });
// const colors = useThemeColors();

const styles = StyleSheet.create({
  textInput: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,
    lineHeight: 24,
    minHeight: MIN_HEIGHT,
    borderRadius: 6,
    // backgroundColor: colors.appBackground,
    paddingHorizontal: 8,
    paddingVertical: PADDING_VERTICAL,
    ...Platform.select({
      android: {
        textAlignVertical: "center",
      },
      ios: {
        lineHeight: MIN_HEIGHT / 2,
      },
      web: {
        outlineWidth: 0,
        outlineColor: "transparent",
        outlineOffset: 0,
        // paddingVertical: 8,
        // lineHeight: 28,
        lineHeight: MIN_HEIGHT / 2,
      },
    }),
    // marginLeft: 10,
    marginTop: Platform.select({
      ios: 0,
      android: 0,
      web: 0,
    }),
    marginBottom: Platform.select({
      ios: 0,
      android: 0,
      web: 0,
    }),
  },
});

export type ComposerPropsFromInput = {
  text: string;
  onTextChanged(text: string): void;
  onSendFinal: () => void;
};

export type ComposerPropsFromChat = {
  did: T.Discussion["id"];
  onEdit: (messageId: string) => void;
  lastUserMessageId: T.Message["id"] | null;
  textInputProps?: Partial<TextInputProps> & {
    ref?: React.MutableRefObject<TextInput>;
  };
};

export type ComposerProps = ComposerPropsFromInput & ComposerPropsFromChat;

/**
 * Main text input component for composing and editing messages in the chat interface.
 * 
 * This component provides a multi-line text input with auto-resizing capabilities,
 * keyboard shortcuts for power users, and theme-aware styling.
 * 
 * Key functionality and invariants:
 * - [auto-resize] Automatically adjusts height based on content within MIN/MAX bounds
 * - [height-constraints] Maintains height between MIN_COMPOSER_HEIGHT and MAX_COMPOSER_HEIGHT
 * - [dimension-tracking] Tracks and updates dimensions only when they actually change
 * - [keyboard-shortcuts] Supports Cmd/Ctrl+Enter to send on web platform
 * - [edit-previous] Allows editing last message via ArrowUp when composer is empty
 * - [discussion-reset] Resets input state when discussion ID changes via key prop
 * - [theme-aware] Applies theme colors for background and text
 * - [platform-specific] Handles platform-specific styling differences (iOS/Android/Web)
 * - [multiline-support] Maintains proper text input behavior across multiple lines
 * - [content-size-responsive] Responds to content size changes for dynamic height
 * 
 * This pattern provides:
 * - Responsive text input that grows with content
 * - Consistent behavior across platforms
 * - Quick actions via keyboard shortcuts
 * - Seamless message editing flow
 * - Theme integration for dark/light mode support
 * 
 * The component manages its own height state internally while delegating
 * text content management to parent components via callbacks.
 * 
 * @param props - ComposerProps including text state, callbacks, and optional TextInput props
 * @returns A themed, auto-resizing TextInput component
 */
export function Composer({
  onSendFinal,
  did,
  onTextChanged,
  lastUserMessageId,
  text,
  onEdit,
  textInputProps = {},
}: ComposerProps): React.ReactElement {
  const dimensionsRef = useRef<{ width: number; height: number }>();
  const [composerHeight, setComposerHeight] = useState(MIN_COMPOSER_HEIGHT);
  const previousTextRef = useRef<string | undefined>(text);

  const colors = useThemeColors();

  // Reset height when text goes from non-empty to empty (after submission)
  useEffect(() => {
    if (previousTextRef.current && previousTextRef.current.trim() !== '' && (!text || text.trim() === '')) {
      // Text was cleared after having content, reset height
      setComposerHeight(MIN_COMPOSER_HEIGHT);
      dimensionsRef.current = undefined;
    }
    previousTextRef.current = text;
  }, [text]);

  const determineInputSizeChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      // [dimension-tracking]
      if (
        !dimensionsRef.current ||
        (dimensionsRef.current &&
          (dimensionsRef.current.width !== dimensions.width ||
            dimensionsRef.current.height !== dimensions.height))
      ) {
        // [height-constraints] [auto-resize]
        const newComposerHeight = Math.max(
          MIN_COMPOSER_HEIGHT!,
          Math.min(
            MAX_COMPOSER_HEIGHT!,
            dimensions.height + PADDING_VERTICAL * 2,
          ),
        );
        dimensionsRef.current = {
          height: newComposerHeight,
          width: dimensions.width,
        };
        setComposerHeight(newComposerHeight);
      }
    },
    [setComposerHeight],
  );

  // [content-size-responsive]
  const handleContentSizeChange = ({
    nativeEvent: { contentSize },
  }: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) =>
    determineInputSizeChange(contentSize);

  const handleKeyDown = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (Platform.OS === "web") {
      // For web platform, access key properties from nativeEvent
      const nativeEvent = event.nativeEvent as any;
      // [keyboard-shortcuts]
      if (nativeEvent.key === "Enter" && (nativeEvent.metaKey || nativeEvent.ctrlKey)) {
        event.preventDefault();
        onSendFinal();
      }
      // [edit-previous]
      if (nativeEvent.key === "ArrowUp" && text === "") {
        event.preventDefault();
        // edit previous message
        if (lastUserMessageId) {
          onEdit(lastUserMessageId);
        }
      }
    }
  };

  return (
    <TextInput
      key={did} // [discussion-reset]
      testID={TEST_ID.COMPOSER_ID}
      accessible
      accessibilityLabel={TEST_ID.COMPOSER_ID}
      placeholder="Message"
      placeholderTextColor={Color.defaultColor}
      multiline // [multiline-support]
      editable
      onContentSizeChange={handleContentSizeChange}
      onChangeText={onTextChanged}
      onKeyPress={handleKeyDown}
      value={text}
      // style={[styles.textInput, { height: composerHeight }]}
      style={[
        styles.textInput, // [platform-specific]
        {
          height: composerHeight, // [auto-resize]
          backgroundColor: colors.appBackground, // [theme-aware]
          color: colors.primaryText, // [theme-aware]
        },
      ]}
      autoFocus={false}
      enablesReturnKeyAutomatically
      underlineColorAndroid="transparent"
      keyboardAppearance="default"
      {...textInputProps}
    />
  );
}

Composer.propTypes = {
  text: PropTypes.string,
  textInputProps: PropTypes.object,
  onTextChanged: PropTypes.func,
};
