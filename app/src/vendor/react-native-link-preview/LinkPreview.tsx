import * as React from 'react'
import { useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageProps,
  ImageStyle,
  LayoutChangeEvent,
  Linking,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import Animated, { FadeInDown } from "react-native-reanimated";
import { SvgCssUri } from 'react-native-svg/css';
import { CrossPlatformWebView } from '../../components/CrossPlatformWebView';

import { MaterialIcons } from "@expo/vector-icons";

import { Styles as GatzStyles } from "../../gatz/styles";
import { LinkPreviewData, LinkPreviewDataMedia } from "../../gatz/types"


import { useThemeColors } from '../../gifted/hooks/useThemeColors'

type Size = {
  height: number;
  width: number;
}

const getImageSize = (url: string) => {
  return new Promise<Size>((resolve, reject) => {
    Image.getSize(
      url,
      (width, height) => resolve({ height, width }),
      // type-coverage:ignore-next-line
      (error) => reject(error)
    )
  })
}

export type LinkPreviewProps = {
  withShadow: boolean,
  withBorder: boolean,
  forceSmall?: boolean,
  previewData: LinkPreviewData,
  onClose?: () => void,
}

const isSvg = (uri: string): boolean => uri.endsWith('.svg') || uri.startsWith('data:image/svg+xml;base64,');

type FlexibleImageProps = {
  uri: string,
  style?: StyleProp<ImageStyle>,
  onError?: (error: Error) => void
} & Omit<ImageProps, 'onError'>;

const FlexibleImage = ({ uri, style, onError, ...props }: FlexibleImageProps) => {
  if (Platform.OS !== 'web' && isSvg(uri)) {
    const height = style && typeof style !== 'boolean' ? StyleSheet.flatten(style).height : undefined;
    const width = style && typeof style !== 'boolean' ? StyleSheet.flatten(style).width : undefined;

    return (
      <View style={style}>
        <SvgCssUri
          height={typeof height === 'number' ? height : undefined}
          width={typeof width === 'number' ? width : undefined}
          uri={uri}
          onError={onError as any}
        />
      </View>
    );
  } else {
    return (
      <Image
        style={style}
        source={{ uri }}
        onError={e => onError && onError(new Error(e.nativeEvent.error))}
        {...props}
      />
    );
  }
}

const calculateAspectRatio = ({ width, height }: LinkPreviewDataMedia): number | undefined => {
  return (width && height) ? width / height : undefined;
}

const isEmptyPreview = (previewData: LinkPreviewData) => {
  return !previewData?.title && !previewData?.description && !previewData?.images?.length;
}

const isWebviewPreview = (previewData: LinkPreviewData) => {
  return !!previewData?.html;
}

// add data-theme="dark" to the webview in the blockquote
const addThemeToWebview = (html: string, theme: string) => {
  return html.replace(/<blockquote/g, `<blockquote data-theme="${theme}"`);
}

const LinkPreviewWebview = (
  { backgroundColor, onClose, previewData }:
    { backgroundColor: string, onClose: () => void, previewData: LinkPreviewData }) => {
  const colors = useThemeColors();
  const html = addThemeToWebview(previewData.html, colors.theme);
  const styles = Platform.select({
    web: { width: 550 },
    default: { width: 350, backgroundColor, },
  })
  return (
    <View style={[linkPreviewStyles.webViewOuterContainer, !onClose && { justifyContent: "flex-start" }]}>
      <View style={[styles]}>
        <CrossPlatformWebView
          style={{ backgroundColor }}
          source={{ html }}
        />
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color={colors.greyText} />
        </TouchableOpacity>
      )}
    </View>
  )
}

export const LinkPreview = (
  { withShadow, withBorder, previewData, forceSmall = false, onClose }: LinkPreviewProps
) => {
  const colors = useThemeColors();

  if (isWebviewPreview(previewData)) {
    return (
      <LinkPreviewWebview
        backgroundColor={withBorder ? colors.appBackground : colors.rowBackground}
        onClose={onClose}
        previewData={previewData}
      />
    )
  }



  const [containerWidth, setContainerWidth] = React.useState(0)
  const data = previewData
  const mainImage = data?.images?.[0]
  const [imageDimensions, setImageDimensions] = React.useState<{ width?: number, height?: number }>({
    width: mainImage?.width,
    height: mainImage?.height,
  })
  const aspectRatio = mainImage ? calculateAspectRatio({
    ...mainImage,
    width: mainImage.width || imageDimensions.width,
    height: mainImage.height || imageDimensions.height
  }) : undefined

  useEffect(() => {
    if (mainImage?.uri && (!mainImage.width || !mainImage.height)) {
      getImageSize(mainImage.uri)
        .then(dimensions => {
          setImageDimensions(dimensions)
        })
        .catch(error => {
          console.warn('Failed to get image dimensions:', error)
        })
    }
  }, [mainImage?.uri]);

  const handleContainerLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      setContainerWidth(event.nativeEvent.layout.width)
    },
    []
  )

  const handlePress = () => data?.uri && Linking.openURL(data.uri)

  const renderDescriptionNode = useCallback((description: string, host: string) => {
    const text = (description && description.length > 0) ? description : (host && host.length > 0) ? host : null
    if (text) {
      return (
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[styles.description, { color: colors.primaryText }]}
        >
          {text}
        </Text>
      )
    } else {
      return null
    }
  }, [colors]);

  const renderImageNode = useCallback((image: LinkPreviewDataMedia) => {
    const ar = aspectRatio ?? 1

    return (
      <FlexibleImage
        accessibilityRole='image'
        resizeMode='contain'
        uri={image.uri}
        style={[
          styles.image,
          ar < 1
            ? {
              height: containerWidth,
              minWidth: 170,
              width: "100%",
            }
            : {
              height: containerWidth / ar,
              // maxHeight: 300,
              width: "100%",
            },
        ]}
      />
    );
  }, [aspectRatio, containerWidth]);

  const withImage = !!mainImage;
  const withBigImage = !forceSmall && withImage && (aspectRatio !== 1 || (!data?.description && !data.title));
  const withSmallImage = withImage && (aspectRatio === 1 || forceSmall);
  const favicon = data?.favicons[0];
  const hasText = !!(data?.description || data?.title);

  const renderLinkPreviewNode = () => {
    return (
      <View style={[
        styles.nodeOuterContainer,
        !withBorder && { backgroundColor: colors.appBackground }
      ]}>
        {withBigImage && renderImageNode(mainImage)}
        <View style={styles.textContainer}>
          {(hasText || (mainImage && aspectRatio === 1)) && (
            <View style={styles.metadataContainer}>
              {withSmallImage && renderMinimizedImageNode(mainImage)}
              {!mainImage && favicon && renderIconNode(favicon)}
              <View style={styles.metadataTextContainer}>
                {renderTitleNode(data.title)}
                {renderDescriptionNode(data.description, data.host)}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  const renderMinimizedImageNode = useCallback((image: LinkPreviewDataMedia) => {
    return (
      <FlexibleImage accessibilityRole='image' uri={image.uri} style={styles.minimizedImage} />
    )
  }, []);

  const renderIconNode = useCallback((iconUrl: string) => {
    return (
      <FlexibleImage accessibilityRole='image' uri={iconUrl} style={styles.icon} />
    )
  }, []);

  const renderTitleNode = useCallback((title: string | undefined) => {
    if (title && title.length > 0) {
      return (
        <Text numberOfLines={1} style={[styles.title, { color: colors.primaryText }]}>
          {title}
        </Text>
      )
    } else {
      return null;
    }
  }, [colors]);

  if (!data) return null;
  if (isEmptyPreview(data)) return null;

  return (
    <View
      style={[
        styles.outerContainer,
        linkPreviewStyles.linkPreviewItem,
        withShadow && styles.wrapperShadow,
        withBorder && styles.withBorder,
        withBorder && {
          borderColor: colors.thinBorder,
          backgroundColor: colors.appBackground
        }
      ]}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        key={data.id}
        accessibilityRole='button'
        onPress={handlePress}
      >
        <View onLayout={handleContainerLayout}>
          {renderLinkPreviewNode()}
        </View>
      </TouchableOpacity>
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={linkPreviewStyles.closeContainer}
        >
          <MaterialIcons name="close" size={24} color={colors.greyText} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const OUTER_BORDER_RADIUS = 10;

const styles = StyleSheet.create({
  withBorder: { borderWidth: 1, },
  description: { marginTop: 4, },
  header: { marginBottom: 6, },
  icon: {
    width: 44,
    height: 44,
    marginRight: 8,
    marginTop: 2,
    borderRadius: OUTER_BORDER_RADIUS,
  },
  image: {
    alignSelf: 'center',
    borderTopLeftRadius: OUTER_BORDER_RADIUS,
    borderTopRightRadius: OUTER_BORDER_RADIUS,
  },
  metadataContainer: { flexDirection: 'row' },
  metadataTextContainer: { flex: 1, justifyContent: 'space-around' },
  minimizedImage: {
    borderRadius: OUTER_BORDER_RADIUS,
    height: 44,
    marginRight: 8,
    width: 44,
  },
  textContainer: { margin: 8, },
  title: { fontWeight: 'bold', },
  outerContainer: {
    borderRadius: OUTER_BORDER_RADIUS,
    marginTop: 2,
    marginBottom: 2,
  },
  nodeOuterContainer: {
    borderRadius: OUTER_BORDER_RADIUS,
    overflow: "hidden",
  },

  wrapperShadow: { ...GatzStyles.thinDropShadow },
})

// Link Preview
const URL_PATTERN =
  /https?:\/\/(www\.)?[-\p{L}\p{M}0-9@:%._\+~#=]{1,256}\.[a-z]{2,12}\b([-\p{L}\p{M}0-9()@:%_\+.~#?&//=]*)/gu;

export const extractUrls = (text: string): string[] => {
  if (!text || text.length === 0) return [];
  const matches = text.match(URL_PATTERN);
  // only return unique urls
  return matches ? [...new Set(matches.map(m => m.trim()))] : [];
}

export type LinkPreviewState = {
  loading: boolean,
  show: boolean,
  previewData?: LinkPreviewData,
  uri: string
};

export type UrlToLinkPreviewState = Record<string, LinkPreviewState> | undefined;

export const addLoadingPreviews = (prevPreviews: UrlToLinkPreviewState, incomingUrls: string[]): UrlToLinkPreviewState => {
  if (!prevPreviews) {
    prevPreviews = {};
  }
  const existingUrls = new Set<string>(Object.keys(prevPreviews));
  const newUrls = incomingUrls.filter(url => !existingUrls.has(url));

  for (const url of newUrls) {
    prevPreviews[url] = { loading: true, show: true, previewData: null, uri: url };
  }

  return prevPreviews;
}

export const addLoadedPreviews = (prevPreviews: UrlToLinkPreviewState, incomingPreviews: LinkPreviewData[]): UrlToLinkPreviewState => {
  if (!prevPreviews) {
    prevPreviews = {};
  }
  for (const preview of incomingPreviews) {
    prevPreviews[preview.uri] = { loading: false, show: true, previewData: preview, uri: preview.uri };
  }

  return prevPreviews;
}

export const removeLinkPreview = (prevPreviews: UrlToLinkPreviewState, url: string): UrlToLinkPreviewState => {
  if (!prevPreviews) {
    prevPreviews = {};
  }
  prevPreviews[url].show = false;
  return { ...prevPreviews };
}

export const removeLinkPreviewsWithoutData = (prevPreviews: UrlToLinkPreviewState, urlsToRemove: string[]): UrlToLinkPreviewState => {
  if (!prevPreviews) {
    prevPreviews = {};
  }
  for (const url of urlsToRemove) {
    delete prevPreviews[url];
  }
  return { ...prevPreviews };
}

export const removeStuckLinkPreviews = (prevPreviews: UrlToLinkPreviewState, urlsToRemove: string[]): UrlToLinkPreviewState => {
  if (!prevPreviews) {
    prevPreviews = {};
  }
  for (const url of urlsToRemove) {
    if (!prevPreviews[url].previewData) {
      delete prevPreviews[url];
    }
  }
  return { ...prevPreviews };
}

export const activeLinkPreviews = (text: string, linkPreviews: UrlToLinkPreviewState): LinkPreviewState[] => {
  const orderedUrls = extractUrls(text);
  const orderedLinkPreviews = orderedUrls
    .map(url => linkPreviews[url])
    .filter(lp => lp !== undefined)
    .filter(({ show, loading }) => show && !loading);
  return orderedLinkPreviews;
}

export const LinkPreviews = (
  {
    colors,
    text,
    linkPreviews,
    onClose,
    withShadow,
    withBorder = false,
    containerStyle
  }: {
    colors: any,
    text: string,
    onClose: (uri: string) => void
    linkPreviews: UrlToLinkPreviewState,
    withShadow: boolean,
    withBorder?: boolean,
    containerStyle?: StyleProp<ViewStyle>,
  }) => {

  if (!linkPreviews) return null;

  const orderedLinkPreviews = activeLinkPreviews(text, linkPreviews);
  if (orderedLinkPreviews.length === 0) return null;


  const renderItem = ({ item: linkPreview }) => {
    if (linkPreview.loading) {
      return (
        <View style={linkPreviewStyles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.greyText} />
          <Text style={{ color: colors.primaryText }}>
            Loading link previews
          </Text>
        </View>
      );
    } else {
      const cancelPreview = () => onClose(linkPreview.uri);
      return (
        <LinkPreview
          key={linkPreview.uri}
          forceSmall
          withBorder={withBorder}
          withShadow={withShadow}
          previewData={linkPreview.previewData}
          onClose={cancelPreview}
        />
      );
    }
  };

  return (
    <Animated.View
      style={[linkPreviewStyles.linkPreviewContainer, containerStyle]}
      entering={FadeInDown.duration(300)}
    >
      <FlatList<LinkPreviewState>
        style={linkPreviewStyles.linkPreviewList}
        scrollEnabled
        keyboardShouldPersistTaps="always"
        data={orderedLinkPreviews}
        renderItem={renderItem}
      />
    </Animated.View>
  );
}

const LINK_PREVIEW_HEIGHT = 180;

const linkPreviewStyles = StyleSheet.create({
  webViewOuterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
    marginLeft: 36,
    paddingTop: 4,
  },
  linkPreviewItem: {
    // flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeContainer: {
    marginHorizontal: 2,
    width: 34, height: 24,
    justifyContent: "center", alignItems: "center"
  },
  linkPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxHeight: LINK_PREVIEW_HEIGHT,
    marginBottom: 4,
  },
  linkPreviewList: { maxHeight: LINK_PREVIEW_HEIGHT, },
});

