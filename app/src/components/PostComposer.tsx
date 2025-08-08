import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";

import { MaterialIcons } from "@expo/vector-icons";

import { cachedDeviceHeights } from "../gifted/keyboardAdjustment";

import { FrontendDBContext } from "../context/FrontendDBProvider";

import { MediaPreview } from "../gifted/InputToolbar";
import { messageTextStyle } from "../gifted/MessageText";
import { ReactiveAvatarWithName } from "../gifted/GiftedAvatar";

import * as T from "../gatz/types";
import { GatzClient } from "../gatz/client";
import { useDraftStore, MAX_MEDIA_COUNT } from "../gatz/store";
import { useProductAnalytics } from "../sdk/posthog";
import { MEDIA_CACHE_POLICY } from "../gifted/MessageImage";
import {
  USERNAME_REGEX,
  PotentialMentionRow,
  styles as atMentionStyles,
} from "../gifted/AtMentions";

import { prepareFile, uploadPicture, pickImages, pickMedias, toBlob, fileToPromise, isVideoAsset } from "../mediaUtils";
import { extractUrls, LinkPreviews, UrlToLinkPreviewState } from "../vendor/react-native-link-preview/LinkPreview";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { InLocation, LocationSelectionSheet } from "../location/Location";
import { SessionContext } from "../context/SessionProvider";
import { multiPlatformAlert } from "../util";

export const OUTER_H_PADDING = 10;

/**
 * Component for displaying a video preview with native controls in post composer.
 * Uses expo-video VideoView with paused player but shows native controls.
 */
const PostVideoPreview = ({ source, style }: { 
  source: { uri: string }, 
  style: any 
}) => {
  const player = useVideoPlayer(source, player => {
    player.pause(); // Start paused
  });
  
  return (
    <VideoView 
      player={player}
      style={style}
      nativeControls={true} // Show controls for post preview
      contentFit="cover"
    />
  );
};

const InlineMedia = ({ media }: { media: T.Media }) => {
  switch (media.kind) {
    case "img":
      return (
        <Image
          cachePolicy={MEDIA_CACHE_POLICY}
          source={{ uri: media.url }}
          style={{ width: 150, height: 150 }}
        />
      );
    case "vid":
      return (
        <View style={{ width: 150, height: 150, position: 'relative' }}>
          <PostVideoPreview
            source={{ uri: media.url }}
            style={{ width: 150, height: 150 }}
          />
          <View style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 150, height: 150,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <MaterialIcons name="play-circle-filled" size={40} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      );
    case "aud":
      return <Text>Audio</Text>;
    default:
      return null;
  }
};

export type FromOriginalMessage = {
  message: T.Message;
  discussion: T.Discussion;
  discussionUser: T.Contact;
  messageUser: T.Contact;
  active: boolean;
}

export type UpstreamDraftRef = {
  draft: string;
  medias?: T.Media[];
  linkPreviews: UrlToLinkPreviewState;
  clearDraft: () => void;
  isLoadingMedia: boolean;
  location?: T.Location;
};

export const PostComposer = ({
  draftRef,
  gatzClient,
  initialDraft,
  members,
  onNewPost,
  placeholder = "What's on your mind?",
  initialLocation,
  fromOriginalMessage,
  toggleOriginalMessage,
}: {
  draftRef?: React.MutableRefObject<UpstreamDraftRef>;
  members: Set<T.Contact["id"]>;
  gatzClient: GatzClient;
  initialDraft?: string;
  onNewPost: () => void;
  placeholder?: string;
  initialLocation?: T.Location;
  fromOriginalMessage?: FromOriginalMessage;
  toggleOriginalMessage: () => void;
}) => {
  const { session: { userId } } = useContext(SessionContext);
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();
  const {
    draft, setDraft, clearDraft,
    medias, removeMedia, addMedias, location, setLocation,
    linkPreviews, addLoadingPreviews, addLoadedPreviews, removeLinkPreview
  } = useDraftStore();
  const [atMentionDraft, setAtMentionDraft] = useState<string | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const isDM: boolean = members.size === 1;

  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
    }
  }, [initialDraft]);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (draftRef) {
      draftRef.current = { draft, medias, clearDraft, isLoadingMedia, linkPreviews, location };
    }
  }, [isLoadingMedia, draft, medias, clearDraft, draftRef, linkPreviews, location]);


  // Location

  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const openLocationModal = useCallback(async () => setLocationSheetVisible(true), []);
  const closeLocationModal = useCallback(async () => setLocationSheetVisible(false), []);

  const selectLocation = useCallback((location: T.Location | null) => {
    setLocation(location);
    closeLocationModal();
  }, [setLocation, closeLocationModal]);

  const memberUsernames = useMemo(() => {
    return db
      .getAllUsers()
      .filter((u) => members.has(u.id))
      .map((u) => u.name);
  }, [db, members]);

  const onMentionPress = useCallback(
    (contact: T.Contact) => {
      const newText = draft.replace(USERNAME_REGEX, `@${contact.name} `);
      setDraft(newText);
      setAtMentionDraft(undefined);
      inputRef.current?.focus();
    },
    [draft, setDraft],
  );

  const checkUrls = useCallback(async (text: string) => {
    const urls = extractUrls(text);
    if (urls.length > 0) {
      const existingUrls = new Set<string>(Object.keys(linkPreviews));
      const newUrls = urls.filter(url => !existingUrls.has(url));
      if (newUrls.length > 0) {
        addLoadingPreviews(newUrls);
        const { previews } = await gatzClient.getLinkPreviews(newUrls);
        addLoadedPreviews(previews);
      }
    }
  }, [gatzClient, linkPreviews, addLoadedPreviews, addLoadingPreviews]);


  const onTextChanged = useCallback(
    (text: string) => {
      setDraft(text);
      const match = text.match(USERNAME_REGEX);
      if (match) {
        setAtMentionDraft(match[1]);
      } else {
        setAtMentionDraft(undefined);
      }
      checkUrls(text);
    },
    [setDraft],
  );

  const analytics = useProductAnalytics();
  const haveReportedDraft = useRef(false);

  useEffect(() => {
    if (draft.length > 0 && !haveReportedDraft.current) {
      analytics.capture("draft.new");
      haveReportedDraft.current = true;
    }
  }, [draft.length > 0]);

  const handleMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      const { presigned_url, id, url } =
        await gatzClient.getPresignedUrl("media");
      const mediaResult = await pickMedias({
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA_COUNT - (medias?.length || 0),
      });
      if (mediaResult && !mediaResult.canceled) {
        if (mediaResult.assets.length > MAX_MEDIA_COUNT) {
          multiPlatformAlert(`You can send up to ${MAX_MEDIA_COUNT} files at most`);
          return;
        }
        try {
          const mediaUploadsPromises = mediaResult.assets.map(async (asset) => {
            const { presigned_url, id, url } =
              await gatzClient.getPresignedUrl("media");
            const blob = await prepareFile(asset);
            // TODO: check if the response is good?
            const r = await uploadPicture(presigned_url, blob);

            // Determine if it's a video or image using utility function
            const isVideo = isVideoAsset(asset);
            const mediaKind = isVideo ? "video" : "image";

            const mediaResponse = await gatzClient.newMedia(id, url, {
              ...asset,
              type: mediaKind
            });
            return mediaResponse.media;
          });
          const medias = await Promise.all(mediaUploadsPromises);
          addMedias(medias);
        } catch (e) {
          multiPlatformAlert("Failed to upload", "Please try again later");
        }
      } else {
        console.log("failed to get images or videos from device");
      }
    } finally {
      setIsLoadingMedia(false);
    }
  }, [gatzClient, addMedias, medias?.length, setIsLoadingMedia]);

  const Toolbar = (
    <View style={[styles.toolbarContainer, { borderTopColor: colors.midGrey }]}>
      {isLoadingMedia ? (
        <View>
          <ActivityIndicator size={30} color={colors.active} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={handleMedia} style={{ marginRight: 10 }}>
            <MaterialIcons name="perm-media" size={30} color={colors.active} />
          </TouchableOpacity>
        </View>
      )}
      <View>
        <TouchableOpacity onPress={openLocationModal}>
          <MaterialIcons name="place" size={30} color={colors.active} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAtMentions = () => {
    const usernameMatches = memberUsernames.filter((u) =>
      u.toLowerCase().includes(atMentionDraft.toLowerCase()),
    );
    const userMatches = usernameMatches
      .map((name) => db.maybeUserByName(name))
      .filter(Boolean);
    return (
      <View>
        <FlatList<T.Contact>
          style={{ maxHeight: atMentionStyles.mentionContainer.height * 3 }}
          data={userMatches}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <PotentialMentionRow
              key={item.id}
              contact={item}
              onPress={onMentionPress}
            />
          )}
        />
      </View>
    );
  };

  const hasMedia = !atMentionDraft && medias && medias.length > 0;

  const handleKeyDown = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (Platform.OS === "web") {
      // For web, we need to cast to any to access browser-specific properties
      const nativeEvent = event.nativeEvent as any;
      if (nativeEvent.key === "Enter" && (nativeEvent.metaKey || nativeEvent.ctrlKey)) {
        event.preventDefault();
        onNewPost();
      }
    }
  };

  if (Platform.OS === "web") {
    const handlePaste = useCallback(async (clipboardEvent: ClipboardEvent) => {
      // Only handle paste if our input is focused
      const inputElement = inputRef.current as unknown as HTMLInputElement;
      if (!inputElement || document.activeElement !== inputElement) {
        return;
      }

      setIsLoadingMedia(true);
      try {
        const items = clipboardEvent.clipboardData?.items;
        if (items) {
          const ps: Promise<T.Media>[] = Array.from(items).map(async (item) => {
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
          const medias = (await Promise.all(ps)).filter((m): m is T.Media => m !== undefined);
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

  const canHandleMoreMedia = medias && medias.length < MAX_MEDIA_COUNT;


  // TODO: this might be coming from somebody else's message
  const renderOriginMessage = useCallback((fromOriginalMessage) => {
    if (fromOriginalMessage) {
      const isOriginalMessageMine = userId === fromOriginalMessage.messageUser?.id;
      return (
        <TouchableOpacity style={styles.centeredRow} onPress={toggleOriginalMessage}>
          <Text
            style={[
              styles.originalMessageText,
              !fromOriginalMessage.active && styles.originalMessageTextInactive,
              { color: colors.active },
            ]}
          >
            {isOriginalMessageMine
              ? <Text>From <Text style={styles.bold}>@{fromOriginalMessage.discussionUser?.name}</Text>'s discussion</Text>
              : <Text>From <Text style={styles.bold}>@{fromOriginalMessage.messageUser?.name}</Text>'s message</Text>}
          </Text>
        </TouchableOpacity>
      );
    } else {
      return null;
    }
  }, [toggleOriginalMessage, colors]);

  return (
    <View style={[styles.contentContainer, { paddingBottom: cachedDeviceHeights.homeIndicatorHeight },]}        >
      <View style={[styles.centeredRow, styles.innerPostHeader]}>
        <View style={styles.row}>
          <ReactiveAvatarWithName size="medium" userId={userId} />
          {location && (
            <TouchableOpacity onPress={openLocationModal}>
              <InLocation location={location} />
            </TouchableOpacity>
          )}
        </View>
        {renderOriginMessage(fromOriginalMessage)}
      </View>

      <View style={{ flex: 1, paddingHorizontal: OUTER_H_PADDING }}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { backgroundColor: colors.appBackground, color: colors.primaryText },
          ]}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.softFont}
          value={draft}
          onChangeText={onTextChanged}
          onKeyPress={handleKeyDown}
        // autoFocus
        />
        {isDM && (
          <View style={styles.dmNoticeContainer}          >
            <Text style={{ fontSize: 14, color: colors.softFont }}>
              Gatz DMs will show up on their feed like other posts. The
              recipient won't receive a notification, so don't use this if your
              message is urgent.
            </Text>
          </View>
        )}
        {hasMedia && (
          <View style={{ marginBottom: 8 }}>
            <MediaPreview
              inPost
              medias={medias}
              onPress={removeMedia}
              addMore={canHandleMoreMedia ? handleMedia : undefined}
            />
          </View>
        )}
        <LinkPreviews
          withBorder
          withShadow={false}
          colors={colors}
          text={draft}
          onClose={removeLinkPreview}
          linkPreviews={linkPreviews}
        />
      </View>
      {atMentionDraft ? renderAtMentions() : Toolbar}
      {locationSheetVisible && (
        <LocationSelectionSheet
          visible={locationSheetVisible}
          onClose={closeLocationModal}
          onSelect={selectLocation}
          scrollEnabled={false}
        />
      )}

    </View >
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    paddingVertical: 8,
    paddingHorizontal: OUTER_H_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    // borderTopColor: "#A2A2A2",
    height: 44,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    ...messageTextStyle,
    flex: 1,
    paddingVertical: 10,
    marginBottom: 12,
    textAlignVertical: "top", // Aligns text to the top on Android
    ...(Platform.OS === "web" && {
      outlineStyle: "none",
      ":focus": {
        outlineStyle: "none",
      },
    }),
  },
  dmNoticeContainer: {
    paddingVertical: 16,
    marginHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    flex: 1,
  },
  centeredRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  innerPostHeader: {
    justifyContent: "space-between",
    paddingHorizontal: OUTER_H_PADDING,
  },
  row: { flexDirection: "row", alignItems: "center" },
  originalMessageText: {
    fontSize: 12,
    marginRight: 4,
    opacity: 1,
  },
  originalMessageTextInactive: {
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
  bold: { fontWeight: "600" },
  locationText: {
    fontSize: 16,
    justifyContent: "center",
    alignItems: "center",
  },


});

