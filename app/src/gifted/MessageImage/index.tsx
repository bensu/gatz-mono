import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, TouchableOpacity, Platform, ScrollView, StyleProp, ViewStyle, Modal } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
// import { Audio, setAudioModeAsync } from "expo-audio"; // Temporarily removed
import { ImageGallery as NativeImageGallery } from "../../../vendor/react-native-image-gallery/src";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

import * as T from "../../gatz/types";
import { TEST_ID } from "../Constant";

/**
 * Cache policy constant for media loading across the application.
 * 
 * Key functionality and invariants:
 * - [cache-policy-constant] Ensures all media uses disk caching for optimal performance
 * - [consistent-caching] Provides a single source of truth for media caching behavior
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - External Services: None
 * - Native Modules: expo-image (uses this policy)
 * 
 * This constant ensures that all images loaded through expo-image use disk caching,
 * which improves performance by persisting media across app sessions.
 */
export const MEDIA_CACHE_POLICY = "disk";

/**
 * Component for displaying a static video preview thumbnail.
 * Uses expo-video VideoView with auto-paused player for static preview.
 */
const MessageVideoPreview = ({ source, style, testID }: { 
  source: { uri: string }, 
  style: any, 
  testID: string 
}) => {
  const player = useVideoPlayer(source, player => {
    player.pause(); // [video-preview-static] Ensure video starts paused
  });
  
  return (
    <VideoView 
      player={player}
      style={style}
      testID={testID}
      nativeControls={false}
      contentFit="cover"
      accessibilityLabel="Video shouldPlay: false, controls: false"
    />
  );
};

/**
 * Component for displaying video in full-screen gallery.
 * Uses expo-video VideoView with controls that appear on tap (Android-friendly).
 */
const GalleryVideoView = ({ source, style, isSelected }: { 
  source: { uri: string }, 
  style: any,
  isSelected?: boolean
}) => {
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const player = useVideoPlayer(source, player => {
    // Configure player but don't auto-play yet
  });
  
  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);
  
  // Auto-play when video becomes visible, pause when not visible
  useEffect(() => {
    if (isSelected) {
      player.play();
      // Hide controls initially on auto-play to avoid Android overlay issue
      setShowControls(false);
    } else {
      player.pause();
    }
  }, [isSelected, player]);
  
  return (
    <TouchableOpacity 
      style={style}
      onPress={() => setShowControls(!showControls)}
      activeOpacity={1}
    >
      <VideoView 
        player={player}
        style={{ width: '100%', height: '100%' }}
        nativeControls={showControls}
        contentFit="contain"
        allowsFullscreen={true}
      />
    </TouchableOpacity>
  );
};

type Props = {
  media: T.Media;
  allMedia: T.Media[];
};

const isImage = (m: T.Media): m is T.ImageMedia => m.kind === "img";
const isVideo = (m: T.Media): m is T.VideoMedia => m.kind === "vid";
const isImageOrVideo = (m: T.Media): m is T.ImageMedia | T.VideoMedia => isImage(m) || isVideo(m);

/**
 * Component that displays a single media item (image or video) with appropriate preview.
 * 
 * Key functionality and invariants:
 * - [media-type-conditional] Renders different UI based on media.kind (video shows play button overlay)
 * - [video-preview-static] Videos are rendered with shouldPlay=false and no controls for preview
 * - [image-disk-cache] Images use MEDIA_CACHE_POLICY for consistent caching
 * - [platform-agnostic] Currently renders same UI for web and native platforms
 * - [fixed-dimensions] Media containers have fixed width (150) and height (100)
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None (leaf component)
 * - External Services: None
 * - Native Modules: expo-image (Image), expo-video (VideoView)
 * 
 * This component serves as a thumbnail renderer for media items in the message list.
 * Videos show a static preview with play button overlay, while images show directly.
 * The component maintains consistent sizing regardless of media dimensions.
 * 
 * @param props - Props containing media item and allMedia array (allMedia currently unused)
 * @returns Media thumbnail with appropriate overlay for videos
 */
export function MessageImage({ media, allMedia }: Props) {
  // const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  // const allMediaItems = allMedia.filter(isImageOrVideo) as (T.ImageMedia | T.VideoMedia)[];

  // // Find the initial index of the clicked media
  // const initialIndex = allMediaItems.findIndex(m => m.id === media.id);

  // Render media thumbnail based on its type
  const renderMediaThumbnail = () => {
    // [media-type-conditional]
    if (media.kind === 'vid') {
      return (
        <View style={styles.mediaContainer}>
          <MessageVideoPreview
            testID={TEST_ID.MESSAGE_IMAGE_VIDEO}
            style={styles.video}
            source={{ uri: media.url }}
          />
          <View style={styles.playButtonOverlay} testID={TEST_ID.MESSAGE_IMAGE_PLAY_BUTTON}>
            <MaterialIcons name="play-circle-filled" size={40} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.mediaContainer}>
          <Image
            testID={TEST_ID.MESSAGE_IMAGE_IMAGE}
            cachePolicy={MEDIA_CACHE_POLICY} // [image-disk-cache]
            style={styles.image}
            source={{ uri: media.url }}
          />
        </View>
      );
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container]} testID={TEST_ID.MESSAGE_IMAGE_CONTAINER}>
        {renderMediaThumbnail()}
      </View>
    );
  } else {
    return (
      <View style={[styles.container]} testID={TEST_ID.MESSAGE_IMAGE_CONTAINER}>
        {renderMediaThumbnail()}
      </View>
    );
  }
}

/**
 * StyleSheet containing all styles for MessageImage and MessageMedia components.
 * 
 * Key functionality and invariants:
 * - [consistent-media-dimensions] Media containers have fixed 150x100 dimensions
 * - [overlay-positioning] Play button overlay uses absolute positioning to cover video
 * - [border-radius-consistency] All media containers use 6px border radius
 * - [responsive-gallery] Gallery components adapt to full screen dimensions
 * 
 * Dependencies (for testing strategy):
 * - Child Components: None
 * - External Services: None
 * - Native Modules: React Native StyleSheet
 * 
 * The styles maintain visual consistency across all media types and ensure
 * proper layout for both thumbnail and full-screen gallery views.
 */
export const styles = StyleSheet.create({
  container: {},
  imageActive: { flex: 1, resizeMode: "contain", },
  mediaContainer: {
    position: 'relative',
    // [fixed-dimensions]
    width: 150,
    height: 100,
    borderRadius: 6,
    marginVertical: 3,
    marginRight: 6,
    marginLeft: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: "cover",
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    // [overlay-positioning]
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

const OneMedia = ({ media, allMedia }: { media: T.Media, allMedia: T.Media[] }) => {
  switch (media.kind) {
    case "img":
      return <MessageImage key={media.id} media={media} allMedia={allMedia} />;
    case "vid":
      return <MessageImage key={media.id} media={media} allMedia={allMedia} />;
    default:
      return null;
  }
};


/**
 * Component that displays a horizontal scrollable list of media items with gallery support.
 * 
 * Key functionality and invariants:
 * - [horizontal-scroll-list] Renders media items in a horizontal ScrollView
 * - [gallery-modal-state] Manages gallery open state with index tracking
 * - [platform-specific-gallery] Uses different gallery implementations for web vs native
 * - [video-autoplay] Videos auto-play when visible with hidden controls, show controls on tap
 * - [touch-to-open] Each media item opens gallery on touch with correct index
 * - [close-button-overlay] Gallery includes close button in header
 * 
 * Dependencies (for testing strategy):
 * - Child Components: MessageImage, OneMedia (use real implementations)
 * - External Services: None
 * - Native Modules: expo-video (VideoView), expo-image (Image), react-native-image-gallery, react-image-gallery
 * 
 * This component provides a media carousel with full-screen gallery viewing.
 * It handles both images and videos with auto-play functionality for videos.
 * The gallery implementation differs between web (react-image-gallery) and native
 * (react-native-image-gallery) for optimal platform performance.
 * 
 * Features:
 * - Horizontal scrolling with momentum
 * - Touch to open full-screen gallery
 * - Platform-specific gallery implementations
 * - Video auto-play when visible with tap-to-show-controls (Android-friendly)
 * - Close button overlay in gallery view
 * 
 * @param props - Contains scrollViewRef, allMedia array, and optional contentContainerStyle
 * @returns Horizontal media carousel with gallery functionality
 */
export const MessageMedia = ({
  scrollViewRef,
  allMedia,
  contentContainerStyle,
}: {
  scrollViewRef: React.RefObject<ScrollView>,
  allMedia: T.Media[],
  contentContainerStyle: StyleProp<ViewStyle>,
}) => {
  // [gallery-modal-state]
  const [isGalleryOpenAtIndex, setIsGalleryOpenAtIndex] = useState<number | null>(null);

  // TODO: do this one for the entire app
  // Configure audio session for iOS if needed
  // [audio-configuration]
  // Temporarily disabled audio configuration to test if expo-video handles it automatically
  // useEffect(() => {
  //   if (allMedia.some(m => m.kind === "vid")) {
  //     const setupAudio = async () => {
  //       try {
  //         // Use setAudioModeAsync directly imported from expo-audio
  //         await setAudioModeAsync({
  //           playsInSilentMode: true,
  //           shouldPlayInBackground: false,
  //           allowsRecording: false,
  //         });
  //       } catch (e) {
  //         console.error("Failed to configure audio", e);
  //       }
  //     };
  //     setupAudio();
  //   }
  // }, [allMedia]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.closeButton} testID={TEST_ID.MESSAGE_MEDIA_CLOSE_BUTTON} onPress={() => setIsGalleryOpenAtIndex(null)}>
        <Ionicons name="close" size={24} color="white" style={styles.closeIcon} />
      </TouchableOpacity>
    </View>
  );

  const renderGallery = () => {
    // [platform-specific-gallery]
    if (Platform.OS === "web") {
      // Convert media to gallery format (including videos)
      const images = allMedia.map(m => ({
        id: m.id,
        original: m.url,
        thumbnail: m.url,
        // For react-image-gallery, we'll handle videos specially through renderItem prop
        renderItem: m.kind === 'vid' ?
          (item: { original: string }) => (
            <div className="image-gallery-image">
              <video
                src={item.original}
                controls
                style={{ width: '100%', height: 'auto', maxHeight: '80vh' }}
              />
            </div>
          ) : undefined
      }));
      const isOpen = isGalleryOpenAtIndex !== null
      return (
        <Modal animationType={isOpen ? 'slide' : 'fade'} visible={isOpen} testID={TEST_ID.MESSAGE_MEDIA_GALLERY}>
          <View style={{ flex: 1, paddingTop: 40 }}>
            <ImageGallery
              items={images}
              showPlayButton={false}
              showFullscreenButton={false}
              showThumbnails={false}
              startIndex={isGalleryOpenAtIndex}
            />
          </View>
          {renderHeader()}
        </Modal>
      )
    } else {
      const images = allMedia
        .filter(isImageOrVideo)
        .map(m => ({ id: m.id, url: m.url, kind: m.kind, mime: m.mime }));
      return (
        <NativeImageGallery
          images={images}
          isOpen={isGalleryOpenAtIndex !== null}
          close={() => setIsGalleryOpenAtIndex(null)}
          renderHeaderComponent={renderHeader}
          initialIndex={isGalleryOpenAtIndex}
          hideThumbs
          renderCustomImage={(item, index, isSelected) => {
            const media = images[index];
            if (media.kind === 'vid') {
              return (
                <GalleryVideoView 
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  isSelected={isSelected}
                />
              );
            } else if (media.kind === 'img') {
              // Render images explicitly since we're taking over all rendering
              return (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  cachePolicy={MEDIA_CACHE_POLICY}
                />
              );
            }
            return null;
          }}
        />
      )
    }
  }

  return (
    <View>
      <ScrollView
        testID={TEST_ID.MESSAGE_MEDIA_SCROLL_VIEW}
        ref={scrollViewRef}
        horizontal // [horizontal-scroll-list]
        style={[messageMediaStyles.outerContainer]}
        contentContainerStyle={[messageMediaStyles.contentContainer, contentContainerStyle]}
        contentOffset={{ x: 0, y: 0 }}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        overScrollMode="always"
        bounces={true}
        alwaysBounceHorizontal={true}
        decelerationRate="fast" // Smoother scrolling
      >
        {allMedia.map((media, index) => (
          /* [touch-to-open] */
          <TouchableOpacity key={media.id} testID={TEST_ID.MESSAGE_MEDIA_ITEM} onPress={() => setIsGalleryOpenAtIndex(index)}>
            <OneMedia media={media} allMedia={allMedia} />
          </TouchableOpacity>
        ))}
        {renderGallery()}
      </ScrollView>
    </View>
  );

}

const messageMediaStyles = StyleSheet.create({
  outerContainer: {
    flexDirection: "row",
    flexGrow: 0,
    alignSelf: 'flex-start',
    width: '100%', // Allow it to take full width
    overflow: 'visible' // Important for overflow to work
  },
  contentContainer: {
    flexDirection: "row",
    paddingLeft: 0, // Start aligned with the bubble
    paddingRight: 80, // Add extra space at the end to ensure content is scrollable
    overflow: 'visible',
    // paddingBottom: 14,
  },
})


