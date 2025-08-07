import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Platform, View, ViewStyle, StyleProp, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import { useThemeColors } from '../gifted/hooks/useThemeColors';
import { assertNever } from '../util';

type WebViewProps = React.ComponentProps<typeof RNWebView>;

type IFrameMessage =
    | { type: "resize", id: string, height: number }
    | { type: "loaded", id: string };

const generateWebViewId = () => `webview-${Math.random().toString(36).substr(2, 9)}`;

const createInjectedJavaScript = (id: string) => `
    window.addEventListener('load',()=>{
        const sh=()=>{
            const h=document.documentElement.scrollHeight;
            const m={type:'resize',height:h,id:'${id}'};
            const s=JSON.stringify(m);
            window.ReactNativeWebView?window.ReactNativeWebView.postMessage(s):window.parent.postMessage(s,'*');
        };
        const sl=()=>{
            const m={type:'loaded',id:'${id}'};
            const s=JSON.stringify(m);
            window.ReactNativeWebView?window.ReactNativeWebView.postMessage(s):window.parent.postMessage(s,'*');
        };
        const f =document.getElementById('twitter-widget-0');
        if(f){
            f.addEventListener('load',()=>{
                sl();sh();
            });
        }else{sl();}
        sh();
        const o=new MutationObserver(ms=>{
            ms.forEach(m=>{
                m.addedNodes.forEach(n=>{
                    if(n.nodeName==='IFRAME'){
                        n.addEventListener('load',()=>{sl();sh();});
                    }
                });
            });
            sh();
        });
        o.observe(document.body,{childList:true,subtree:true});
        window.addEventListener('load',sh);
        document.addEventListener('DOMContentLoaded',sh);
    });
`;

const wrapHtml = (html: string, color: string, webviewId: string) => {
    const bodyStyles = Platform.select({
        web: `margin: 0; margin-top: -8px;`,
        ios: `margin: 0; margin-top: -8px;`,
        android: `margin: 0; margin-top: -8px;`,
    });
    const wrappedHtml = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                    <style>
                        body { 
                            ${bodyStyles}
                            padding: 0;
                            background: ${color};
                        }
                    </style>
                    <script>${createInjectedJavaScript(webviewId)}</script>
                </head>
                <body>
                    ${html}
                </body>
            </html>
        `;
    return wrappedHtml;
};

const getSourceContent = (source: WebViewProps['source'], color: string, webviewId: string) => {
    if (!source) return undefined;

    if ('uri' in source) {
        return source.uri;
    }
    if ('html' in source) {
        const wrappedHtml = wrapHtml(source.html, color, webviewId);
        return `data:text/html,${encodeURIComponent(wrappedHtml)}`;
    }
    return undefined;
};

const INITIAL_HEIGHT = 100;
const getInitialHeight = (style: any): number => {
    return INITIAL_HEIGHT;
}

const getBackgroundColor = (style: StyleProp<ViewStyle>): string | undefined => {
    if (!style) return undefined;

    const flattenedStyle = StyleSheet.flatten(style);
    return flattenedStyle?.backgroundColor as string | undefined;
};

const PLACEHOLDER_HEIGHT = 250;
const FADE_OUT_DURATION = 300;

const styles = StyleSheet.create({
    loaderOuterContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: PLACEHOLDER_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
});

export const CrossPlatformWebView = (props: WebViewProps) => {
    const colors = useThemeColors();
    const [height, setHeight] = useState<number>(getInitialHeight(props.style));
    const [isLoading, setIsLoading] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const webviewId = useRef(generateWebViewId()).current;
    const backgroundColor = getBackgroundColor(props.style);

    const LoadingOverlay = () => (
        <View style={[
            styles.loaderOuterContainer,
            { backgroundColor: colors.appBackground },
            { justifyContent: 'center', alignItems: 'center' }
        ]} >
            <ActivityIndicator size="large" color={colors.activityIndicator} />
        </View>
    );

    const handleMessage = useCallback((event: any) => {
        try {
            const payload = Platform.OS === 'web' ? event.data : event.nativeEvent.data;
            if (typeof payload !== 'string') return;
            const data = JSON.parse(payload) as IFrameMessage;
            if (data.id === webviewId) {
                switch (data.type) {
                    case 'resize':
                        // Add 4px to avoid the scrollbar from appearing
                        setHeight(data.height + 6);
                        break;
                    case 'loaded':
                        setTimeout(() => {
                            setIsLoading(false);
                        }, 2000);
                        break;
                    default:
                        assertNever(data);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [webviewId]);

    if (Platform.OS === 'web') {
        useEffect(() => {
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, [handleMessage]);

        const srcContent = getSourceContent(props.source, backgroundColor, webviewId);
        return (
            <View style={{ position: 'relative' }}>
                <iframe
                    ref={iframeRef}
                    src={srcContent}
                    style={{
                        width: '100%',
                        height: typeof height === 'number' ? `${height}px` : height,
                        border: 'none',
                        margin: 0,
                        opacity: isLoading ? 0 : 1,
                        ...(props.style as any),
                    }}
                />
                {isLoading && <LoadingOverlay />}
            </View>
        );
    } else {
        let source: WebViewProps['source'];
        if ('uri' in props.source) {
            source = props.source;
        } else {
            const html = wrapHtml(props.source.html, backgroundColor, webviewId);
            source = { html };
        }

        return (
            <View style={{ height: height, position: 'relative' }}>
                <View style={{
                    height: '100%',
                    backgroundColor: 'transparent',
                    opacity: isLoading ? 0 : 1,
                }}>
                    <RNWebView
                        {...props}
                        style={[
                            { backgroundColor: 'transparent', height: '100%', },
                            props.style
                        ]}
                        source={source}
                        containerStyle={{ backgroundColor: 'transparent' }}
                        androidLayerType="software"
                        onMessage={handleMessage}
                    />
                </View>
                {isLoading && <LoadingOverlay />}
            </View >
        );
    }
}; 