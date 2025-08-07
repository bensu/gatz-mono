// Stryker disable all
import PropTypes from "prop-types";
import React, {
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  StyleSheet,
  View,
  Keyboard,
  ActivityIndicator,
  Platform,
  LayoutChangeEvent,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";

import { Image } from "expo-image";
import { ResizeMode, Video } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { ImagePickerResult } from "expo-image-picker";

import { Composer, ComposerPropsFromChat } from "../Composer";
import { Send, CENTER_ON_INPUT_MARGIN_BOTTOM } from "../Send";
import { ActionsProps } from "../Actions";

import { toBlob, prepareFile, uploadPicture, pickMedias, isVideoAsset } from "../../mediaUtils";
import { filterToUndefined } from "../../util";

import { FrontendDBContext } from "../../context/FrontendDBProvider";
import { ReplyToPreview } from "../../components/ReplyToPreview";

import { MAX_MEDIA_COUNT, ReplyDraftStore } from "../../gatz/store";
import { Discussion, LinkPreviewData, Media } from "../../gatz/types";
import * as T from "../../gatz/types";
import { GatzClient, GatzSocket } from "../../gatz/client";
import { Styles as GatzStyles } from "../../gatz/styles";

import { MEDIA_CACHE_POLICY } from "../MessageImage";
import { useDiscussionContext } from "../../context/DiscussionContext";
import { PotentialMentionRow, USERNAME_REGEX } from "../AtMentions";
import { useThemeColors } from "../hooks/useThemeColors";
import { activeLinkPreviews, addLoadedPreviews, addLoadingPreviews, extractUrls, LinkPreviews, removeLinkPreview, removeLinkPreviewsWithoutData, removeStuckLinkPreviews, UrlToLinkPreviewState } from "../../vendor/react-native-link-preview/LinkPreview";
import { ScrollView } from "react-native-gesture-handler";
import { debounce } from "lodash";

export type MessageDraft = {
  text: string;
  media: T.Media[];
  reply_to?: T.Message["id"];
  editingId?: T.Message["id"];
  link_previews: LinkPreviewData[];
};

const OUTER_H_PADDING = 4;
const VERTICAL_SPACING = 4;

const styles = StyleSheet.create({
  playCircleContainer: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  replyToContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: VERTICAL_SPACING,
    marginRight: 20,
    marginLeft: 4,
  },
  buttonContainer: {
    height: 44,
    // marginHorizontal: 8,
    marginBottom: CENTER_ON_INPUT_MARGIN_BOTTOM,
    justifyContent: Platform.select({
      ios: "flex-end",
      android: "flex-end",
      web: undefined,
    }),
  },
  container: {
    paddingTop: VERTICAL_SPACING + Platform.select({ default: 0, web: 4 }),
    paddingBottom: VERTICAL_SPACING * 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    right: 0,
  },
  primary: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 2,
  },
  accessory: { height: 44 },
});

const AT_MENTION_HEIGHT = 40;

/**
 * Media preview component that displays a horizontal scrollable list of media items.
 * 
 * This component renders media thumbnails (images/videos) with close buttons,
 * allowing users to preview and remove media before sending messages.
 * 
 * Key functionality and invariants:
 * - [media-type-routing] Routes rendering based on media.kind ("img" vs "vid")
 * - [video-overlay] Videos display with a play icon overlay
 * - [horizontal-scroll] Media items are displayed in a horizontal scrollable list
 * - [remove-capability] Each media item has a close button for removal
 * - [add-more-conditional] Shows add button only when addMore prop is provided
 * - [media-limit-enforcement] Add button respects MAX_MEDIA_COUNT limit via parent
 * - [consistent-sizing] All media previews have uniform MEDIA_PREVIEW_SIZE dimensions
 * - [theme-aware] Uses theme colors for background and icons
 * - [style-objects] Style definitions ensure consistent layout across media items
 * 
 * This component provides:
 * - Visual feedback for attached media before sending
 * - Easy removal of unwanted media items
 * - Ability to add more media when under the limit
 * - Consistent preview appearance regardless of media type
 * 
 * The inPost prop affects styling:
 * - true: Uses rowBackground color for add button
 * - false: Uses appBackground color for add button
 * 
 * @param props - MediaPreview props including media array and handlers
 * @returns Horizontal scrollable media preview component
 */
export const MediaPreview = ({
  medias,
  onPress,
  addMore,
  inPost = false,
}: {
  medias: T.Media[];
  onPress: (id: T.Media["id"]) => void;
  addMore?: () => void;
  inPost: boolean;
}) => {
  const colors = useThemeColors();

  const renderMedia = (media: T.Media) => {
    // Stryker restore all
    // [media-type-routing]
    switch (media.kind) {
      // Stryker disable all
      case "img":
        return (
          <Image
            cachePolicy={MEDIA_CACHE_POLICY}
            // [consistent-sizing]
            style={mediaPreviewStyles.image}
            source={{ uri: media.url }}
          />
        );
      case "vid":
        return (
          <View style={{ position: 'relative' }}>
            <Video
              source={{ uri: media.url }}
              resizeMode={ResizeMode.COVER}
              // [consistent-sizing]
              style={mediaPreviewStyles.image}
              shouldPlay={false}
              useNativeControls={false}
            />
            {/* Stryker restore all */}
            {/* [video-overlay] */}
            <View style={styles.playCircleContainer}>
              <MaterialIcons name="play-circle-filled" size={30} color="rgba(255,255,255,0.8)" />
            </View>
            {/* Stryker disable all */}
          </View>
        );
      default:
        return (
          <Image
            cachePolicy={MEDIA_CACHE_POLICY}
            // [consistent-sizing]
            style={mediaPreviewStyles.image}
            source={{ uri: media.url }}
          />
        );
    }
  };

  return (
    // [horizontal-scroll]
    <ScrollView
      horizontal
      contentContainerStyle={[
        mediaPreviewStyles.mediaPreviewContainer,
        { backgroundColor: "transparent" }
      ]}
    >
      {medias.map((media) => (
        <TouchableOpacity
          key={media.id}
          // Stryker restore all
          // [remove-capability]
          onPress={() => onPress(media.id)}
          // Stryker disable all
          style={{ position: "relative", marginRight: 8 }}
        >
          <View
            style={[
              mediaPreviewStyles.closeContainer,
              mediaPreviewStyles.floatTopRight,
              // Stryker restore all
              // [theme-aware]
              { backgroundColor: colors.rowBackground },
              // Stryker disable all
            ]}
          >
            <MaterialIcons name="close" size={18} color={colors.greyText} />
          </View>
          {renderMedia(media)}
        </TouchableOpacity>
      ))}
      {/* Stryker restore all */}
      {/* [add-more-conditional] [media-limit-enforcement] */}
      {addMore && (
        // Stryker disable all
        <TouchableOpacity
          onPress={addMore}
          style={[
            mediaPreviewStyles.addMoreContainer,
            // Stryker restore all
            // [theme-aware]
            { backgroundColor: inPost ? colors.rowBackground : colors.appBackground },
            // Stryker disable all
          ]}
        >
          <MaterialIcons name="add" size={32} color={colors.greyText} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const CLOSE_ICON_SIZE = 24;
const MEDIA_PREVIEW_SIZE = 90;

// Stryker restore all
// [style-objects] Style definitions for media preview components
const mediaPreviewStyles = StyleSheet.create({
// Stryker disable all
  mediaPreviewContainer: {
    minHeight: 100,
    flexDirection: "row",
    justifyContent: "flex-start",
    // paddingHorizontal: OUTER_H_PADDING * 2,
    paddingVertical: OUTER_H_PADDING,
    paddingRight: 24,
  },
  floatTopRight: {
    zIndex: 2,
    position: "absolute",
    top: -4,
    right: -4,
  },
  closeContainer: {
    borderRadius: CLOSE_ICON_SIZE,
    height: CLOSE_ICON_SIZE,
    width: CLOSE_ICON_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    zIndex: 1,
    borderRadius: 6,
    height: MEDIA_PREVIEW_SIZE,
    width: MEDIA_PREVIEW_SIZE,
    marginRight: 8,
  },
  addMoreContainer: {
    height: MEDIA_PREVIEW_SIZE,
    width: MEDIA_PREVIEW_SIZE,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});

// Input Toolbar

export interface InputToolbarProps extends ComposerPropsFromChat {
  did: Discussion["id"];
  draftReplyStore: ReplyDraftStore;
  gatzClient: GatzClient;
  renderActions?(props: ActionsProps): React.ReactNode;
  onPressActionButton?(): void;
  onSend: (messageDraft: MessageDraft) => void;
  inputToolbarHeightRef: React.MutableRefObject<number>;
  onInputToolbarHeightChange: (height: number) => void;
}

/**
 * Main input toolbar component for composing and sending messages in chat.
 * 
 * This component manages the entire message composition experience including
 * text input, media attachments, replies, mentions, and link previews.
 * 
 * Key functionality and invariants:
 * - [draft-state-management] Manages complete message draft state via draftReplyStore
 * - [media-attachment-flow] Handles media selection, upload, and preview
 * - [reply-context] Maintains reply-to message context and preview
 * - [edit-mode] Supports editing existing messages with state tracking
 * - [at-mention-detection] Detects @mentions and shows user suggestions
 * - [link-preview-generation] Automatically generates link previews with debouncing
 * - [keyboard-position-sync] Adjusts position based on keyboard visibility
 * - [height-change-notification] Notifies parent of height changes via callback
 * - [send-validation] Only enables send when content exists (text or media)
 * - [media-count-limit] Enforces MAX_MEDIA_COUNT limit on attachments
 * - [paste-media-support] Supports pasting images/videos on web platform
 * - [remove-media-filtering] Filters out media by ID when removing
 * - [dependency-arrays] Ensures hooks update correctly when dependencies change
 * 
 * State management patterns:
 * - Uses local state for UI-specific concerns (loading, position)
 * - Delegates message draft state to draftReplyStore
 * - Synchronizes with database for message lookups
 * 
 * Platform-specific features:
 * - Web: Clipboard paste support for media
 * - Mobile: Native image picker integration
 * - Keyboard event handling differs by platform
 * 
 * The component orchestrates:
 * - Text composition with Composer component
 * - Media preview and management
 * - Reply/edit context display
 * - @mention suggestions
 * - Link preview generation
 * - Send button state and action
 * 
 * @param props - InputToolbarProps including handlers and configuration
 * @returns Complete message input toolbar component
 */
export function InputToolbar(props: InputToolbarProps) {
  const { did, gatzClient, draftReplyStore, inputToolbarHeightRef } = props;
  const colors = useThemeColors();
  // [draft-state-management]
  const {
    text,
    medias,
    replyTo,
    editingId,
    linkPreviews,
    setReplyTo,
    clearReplyDraft,
    removeReplyMedia,
    addReplyMedias,
    setReplyText,
    setEditingId,
    setReplyLinkPreviews,
  } = draftReplyStore();

  const { db } = useContext(FrontendDBContext);
  const { memberSet } = useDiscussionContext();

  // Stryker restore all
  // [reply-context]
  const replyToMessage: T.Message | undefined = useMemo(() => {
    return db.getMessageById(did, replyTo);
  }, [replyTo, db, did]);

  // [edit-mode]
  const editingMessage: T.Message | undefined = useMemo(() => {
    return db.getMessageById(did, editingId);
  }, [editingId, db, did]);
  // Stryker disable all

  const [localMedias, setLocalMedias] = useState<Media[] | undefined>(medias);

  // this === is a problem now comparing arrays
  useEffect(() => {
    if (localMedias !== medias && medias !== undefined) setLocalMedias(medias);
  }, [medias, setLocalMedias]);

  // [media-attachment-flow]
  const addMedias = useCallback(
    (medias: T.Media[]) => {
      setLocalMedias((prevMedias) => {
        const newMedias = [...(prevMedias || []), ...medias];
        // Stryker restore all
        // [media-count-limit]
        return newMedias.length > MAX_MEDIA_COUNT
          ? newMedias.slice(0, MAX_MEDIA_COUNT)
          : newMedias;
        // Stryker disable all
      });
      addReplyMedias(medias);
    },
    // Stryker restore all
    // [dependency-arrays] Ensures callback is recreated when dependencies change
    [setLocalMedias, addReplyMedias],
    // Stryker disable all
  );

  // Stryker restore all
  // [remove-media-filtering] Filters out media by ID and updates both local and store state
  const removeMedia = useCallback(
    (mediaId: T.Media["id"]) => {
      setLocalMedias((medias: T.Media[]) =>
        filterToUndefined((m) => m.id !== mediaId, medias || []),
      );
      removeReplyMedia(mediaId);
    },
    // [dependency-arrays] Ensures callback is recreated when dependencies change
    [setLocalMedias, removeReplyMedia],
  );
  // Stryker disable all

  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // [paste-media-support]
  if (Platform.OS === "web") {
    const handlePaste = useCallback(async (clipboardEvent: ClipboardEvent) => {
      // Stryker restore all
      // Only handle paste if our input is focused
      const composerInput = props.textInputProps.ref?.current as unknown as HTMLInputElement;
      if (!composerInput || document.activeElement !== composerInput) {
        return;
      }
      // Stryker disable all

      setIsLoadingMedia(true);
      try {
        const items = clipboardEvent.clipboardData?.items;
        if (items) {
          const ps: Promise<Media>[] = Array.from(items).map(async (item) => {
            const dataTransferItem = item as DataTransferItem;
            // Handle both images and videos
            if (dataTransferItem.type.startsWith("image/") || dataTransferItem.type.startsWith("video/")) {
              const file = dataTransferItem.getAsFile();
              if (file) {
                const e = await fileToPromise(file)
                const arrayBuffer = e.target?.result;
                if (arrayBuffer) {
                  const blob = toBlob(arrayBuffer, file.type);
                  const { presigned_url, id, url } =
                    await gatzClient.getPresignedUrl("media");
                  const r = await uploadPicture(presigned_url, { blob, type: file.type });

                  // Determine if it's a video or image using utility function
                  const isVideo = isVideoAsset(file);
                  const mediaKind = isVideo ? "video" : "image";

                  const mediaResponse = await gatzClient.newMedia(id, url, {
                    uri: file.name,
                    width: 100,
                    height: 100,
                    type: mediaKind
                  });
                  return mediaResponse.media;
                }
              }
            }
            return undefined;
          })
          const medias = (await Promise.all(ps)).filter((m): m is Media => m !== undefined);
          console.log("Pasted medias:", medias);
          if (medias.length > 0) {
            addMedias(medias);
          }
        }
      } finally {
        setIsLoadingMedia(false);
      }
    }, [gatzClient, addMedias, setIsLoadingMedia]);

    useEffect(() => {
      window.addEventListener("paste", handlePaste);
      return () => window.removeEventListener("paste", handlePaste)

    }, [handlePaste]);
  }

  const onMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      const mediaResult: ImagePickerResult = await pickMedias({
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA_COUNT - (localMedias?.length || 0),
      });
      if (mediaResult && !mediaResult.canceled) {
        try {
          if (mediaResult.assets.length > MAX_MEDIA_COUNT) {
            Alert.alert(`You can send up to ${MAX_MEDIA_COUNT} media files at most`);
            throw new Error("Too many media files");
          }
          const mediaUploadsPromises = mediaResult.assets.map(async (asset) => {
            const { presigned_url, id, url } =
              await gatzClient.getPresignedUrl("media");
            const blob = await prepareFile(asset);
            // TODO: check if the response is good?
            const r = await uploadPicture(presigned_url, blob);

            // Determine if it's a video or image using utility function
            const isVideo = isVideoAsset(asset);
            const assetType = isVideo ? "video" : "image";

            console.log("asset", asset);
            console.log("assetType", assetType);

            const mediaResponse = await gatzClient.newMedia(id, url, {
              ...asset,
              type: assetType
            });
            return mediaResponse.media;
          });
          const medias = await Promise.all(mediaUploadsPromises);
          addMedias(medias);
        } catch (e) {
          Alert.alert("Failed to upload", "Please try again later");
        } finally {
          setIsLoadingMedia(false);
        }
      } else {
        setIsLoadingMedia(false);
      }
    } finally {
      setIsLoadingMedia(false);
    }
  }, [gatzClient, addMedias, localMedias?.length, setIsLoadingMedia]);

  // Stryker restore all
  // [keyboard-position-sync]
  const [position, setPosition] = useState<"absolute" | "relative">("absolute");
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      "keyboardWillShow",
      () => setPosition("relative"),
    );
    const keyboardWillHideListener = Keyboard.addListener(
      "keyboardWillHide",
      () => setPosition("absolute"),
    );
    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);
  // Stryker disable all

  const removeMediaAlert = (mediaId: T.Media["id"]) => {
    if (Platform.OS === "web") {
      const isRemove = confirm(
        "Do you want to remove the image from the message?",
      );
      if (isRemove) {
        removeMedia(mediaId);
      }
    } else {
      Alert.alert("Do you want to remove the image from the message?", "", [
        {
          text: "No, keep",
          onPress: () => null,
        },
        {
          text: "Yes, remove",
          onPress: () => removeMedia(mediaId),
          style: "destructive",
        },
      ]);
    }
  };

  // Stryker restore all
  // [send-validation]
  const showSend = !!localMedias || (text && text.trim().length > 0);
  // Stryker disable all

  // [height-change-notification]
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      const previousHeight = inputToolbarHeightRef.current;
      // Stryker restore all
      if (previousHeight !== height) {
        inputToolbarHeightRef.current = height;
        // TODO: send event to parent
        props.onInputToolbarHeightChange(height);
      }
      // Stryker disable all
    },
    [inputToolbarHeightRef],
  );

  const [atMentionDraft, setAtMentionDraft] = useState(undefined);
  const [isLoadingLinkPreviews, setIsLoadingLinkPreviews] = useState(false);

  const checkUrls = useCallback(
    async (text: string) => {
      const urls = extractUrls(text);
      if (urls.length > 0) {
        const existingUrls = new Set<string>(Object.keys(linkPreviews || {}));
        const newUrls = urls.filter(url => !existingUrls.has(url));
        if (newUrls.length > 0) {
          setIsLoadingLinkPreviews(true);
          setReplyLinkPreviews((prevState: UrlToLinkPreviewState) => addLoadingPreviews(prevState, newUrls));
          try {
            const { previews } = await gatzClient.getLinkPreviews(newUrls);
            const urlsNotFound = newUrls.filter(url => !previews.some(p => p.uri === url));
            setReplyLinkPreviews((prevState: UrlToLinkPreviewState) =>
              removeLinkPreviewsWithoutData(
                addLoadedPreviews(prevState, previews),
                urlsNotFound
              )
            );
          } catch (e) {
            setReplyLinkPreviews((prevState: UrlToLinkPreviewState) => removeStuckLinkPreviews(prevState, newUrls));
          } finally {
            setIsLoadingLinkPreviews(false);
          }
        }
      }
    },
    [gatzClient, linkPreviews, setReplyLinkPreviews],
  );

  // [link-preview-generation] - Create a debounced version of checkUrls that only runs after 500ms of no typing
  const debouncedCheckUrls = useMemo(
    () => debounce(checkUrls, 500),
    [checkUrls],
  );

  // Clean up the debounced function when the component unmounts
  useEffect(() => {
    return () => debouncedCheckUrls.cancel()
  }, [debouncedCheckUrls]);

  const onTextChanged = useCallback(
    (text: string) => {
      setReplyText(text);
      // Stryker restore all
      // [at-mention-detection]
      const match = text.match(USERNAME_REGEX);
      if (match) {
        setAtMentionDraft(match[1]);
      } else {
        setAtMentionDraft(undefined);
      }
      // Stryker disable all
      debouncedCheckUrls(text);
    },
    [setReplyText, debouncedCheckUrls],
  );

  const onSendFinal = () => {
    const link_previews: LinkPreviewData[] = activeLinkPreviews(text || "", linkPreviews || {})
      .map(({ previewData }) => previewData);
    const messageDraft: MessageDraft = {
      text: (text || "").trim(),
      media: localMedias ? localMedias : [],
      reply_to: replyTo,
      editingId: editingId,
      link_previews,
    };
    props.onSend(messageDraft);
    setLocalMedias(undefined);
    clearReplyDraft();
    onTextChanged("");
  };

  const memberUsernames = useMemo(() => {
    return db
      .getAllUsers()
      .filter((u) => memberSet.has(u.id))
      .map((u) => u.name);
  }, [db, memberSet]);

  const inputTextRef = props.textInputProps.ref;

  const onMentionPress = useCallback(
    (contact: T.Contact) => {
      const newText = text.replace(USERNAME_REGEX, `@${contact.name} `);
      setReplyText(newText);
      setAtMentionDraft(undefined);
      inputTextRef.current?.focus();
    },
    [text, setReplyText, setAtMentionDraft],
  );

  const renderAtMentions = () => {
    const usernameMatches = memberUsernames.filter((u) => u.includes(atMentionDraft));
    const userMatches = usernameMatches.map((name) => db.maybeUserByName(name));
    if (userMatches.length === 0) return null;
    return (
      <View style={{ marginBottom: 8 }}>
        <FlatList<T.Contact>
          style={{ maxHeight: AT_MENTION_HEIGHT * 3 }}
          data={userMatches}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => {
            const contact = item;
            return (
              <PotentialMentionRow
                key={contact.id}
                contact={contact}
                onPress={onMentionPress}
              />
            );
          }}
        />
      </View>
    );
  };

  // Stryker restore all
  const canHandleMoreMedia = localMedias && localMedias.length < MAX_MEDIA_COUNT;
  // Stryker disable all

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        GatzStyles.gutter,
        {
          position,
          backgroundColor: colors.rowBackground,
          borderTopColor: colors.inputToolbarBorder,
        },
      ]}
    >
      {/* Stryker restore all */}
      {editingMessage && !atMentionDraft && (
        // Stryker disable all
        <View
          style={[
            styles.replyToContainer,
            { backgroundColor: colors.rowBackground },
          ]}
        >
          <TouchableOpacity onPress={() => setEditingId(undefined, undefined)}>
            <MaterialIcons
              style={{ paddingHorizontal: 2, marginRight: 4 }}
              size={24}
              color={colors.greyText}
              name="close"
            />
          </TouchableOpacity>
          <Text style={{ color: colors.primaryText }}>Editing</Text>
        </View>
      )}
      {/* Stryker restore all */}
      {replyToMessage && !atMentionDraft && !editingMessage && (
        // Stryker disable all
        <View
          style={[
            styles.replyToContainer,
            { backgroundColor: colors.rowBackground },
          ]}
        >
          <TouchableOpacity
            style={{ paddingHorizontal: 2, marginRight: 2 }}
            onPress={() => setReplyTo(undefined)}
          >
            <MaterialIcons size={24} color={colors.greyText} name="close" />
          </TouchableOpacity>
          <View style={{ paddingBottom: 4 }}>
            <ReplyToPreview message={replyToMessage} />
          </View>
        </View>
      )}
      {/* Stryker restore all */}
      {localMedias && !atMentionDraft && (
        // Stryker disable all
        <View style={{ paddingHorizontal: OUTER_H_PADDING * 2 }}>
          <MediaPreview
            inPost={false}
            onPress={(mediaId: T.Media["id"]) => removeMediaAlert(mediaId)}
            medias={localMedias}
            // Stryker restore all
            addMore={canHandleMoreMedia && onMedia}
            // Stryker disable all
          />
        </View>
      )}
      {/* Stryker restore all */}
      {atMentionDraft && renderAtMentions()}
      {/* Stryker disable all */}
      <LinkPreviews
        withShadow={false}
        colors={colors}
        text={text}
        linkPreviews={linkPreviews}
        onClose={(url: string) => setReplyLinkPreviews((ps) => removeLinkPreview(ps, url))}
        containerStyle={{ marginHorizontal: 4 }}
      />
      <View style={[styles.primary, { backgroundColor: colors.rowBackground }]}>
        <View style={styles.buttonContainer}>
          {isLoadingMedia || isLoadingLinkPreviews ? (
            <View style={{ marginHorizontal: 2 }}>
              <ActivityIndicator size={30} color={colors.primaryText} />
            </View>
          ) : !localMedias && !editingMessage ? (
            <TouchableOpacity style={{ marginHorizontal: 2 }} onPress={onMedia}>
              <MaterialIcons size={30} color={colors.greyText} name="add" />
            </TouchableOpacity>
          ) : (
            <View style={{ padding: OUTER_H_PADDING }} />
          )}
        </View>

        <Composer
          onTextChanged={onTextChanged}
          onSendFinal={onSendFinal}
          text={text}
          {...props}
        />
        <View style={{ marginLeft: 2, paddingHorizontal: 2 }}>
          {/* Stryker restore all */}
          <Send disabled={!showSend || isLoadingMedia || isLoadingLinkPreviews} onPress={onSendFinal} />
          {/* Stryker disable all */}
        </View>
      </View>
    </View>
  );
}

InputToolbar.propTypes = {
  renderAccessory: PropTypes.func,
  renderActions: PropTypes.func,
  onPressActionButton: PropTypes.func,
};


const fileToPromise = (file: File): Promise<ProgressEvent<FileReader>> => {
  const reader = new FileReader();
  // this could have a timeout
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        resolve(e)
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsArrayBuffer(file); // or readAsDataURL(file) if you need a base64 string
  });
}