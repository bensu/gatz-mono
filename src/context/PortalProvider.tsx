import React, { createContext, useState, useCallback, useContext } from "react";
import { StyleProp, TouchableWithoutFeedback, ViewStyle } from "react-native";
import { View, Platform, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext } from "./ThemeProvider";

export const MENU_ANIMATION_DURATION = 200;


type PortalContextType = {
  openPortal: (onCloseCallback: () => void, portalChildren: React.ReactNode) => void;
  closePortal: () => void;
}

export const PortalContext = createContext<PortalContextType>({
  openPortal: (onCloseCallback: () => void, portalChildren: React.ReactNode) => { },
  closePortal: () => { }
});

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children, }) => {
  const { currentTheme } = useContext(ThemeContext);
  const [portalChildren, setPortalChildren] = useState<React.ReactNode>(null);
  const portalOpen = portalChildren !== null;

  const overlayStyle: StyleProp<ViewStyle> = portalOpen ? { display: "flex", pointerEvents: "auto", } : { display: "none" };

  const closePortalCallback = React.useRef<() => void>(() => { });

  const closePortal = () => {
    setPortalChildren(null);
    closePortalCallback.current();
    closePortalCallback.current = () => { };
  }

  const openPortal = useCallback((onCloseCallback: () => void, portalChildren: React.ReactNode) => {
    setPortalChildren(portalChildren);
    closePortalCallback.current = onCloseCallback;
  }, [setPortalChildren]);

  return (
    <PortalContext.Provider value={{ openPortal, closePortal }}>
      <View style={styles.flex1}>
        <View style={styles.flex1}>
          {children}
        </View>
        {portalChildren && (
          <BlurView
            tint={currentTheme}
            style={StyleSheet.absoluteFill}
            intensity={Platform.select({ android: 100, default: 20 })}
          />
        )}
        <View style={[StyleSheet.absoluteFill, styles.modalStyles, overlayStyle]}>
          <TouchableWithoutFeedback onPress={closePortal}>
            <Pressable onPress={closePortal} style={[
              StyleSheet.absoluteFill,
              Platform.select({ android: { backgroundColor: 'rgba(0,0,0,0.5)' } })
            ]}>
              <View style={[styles.contentContainer]}>
                {portalChildren}
              </View>
            </Pressable>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </PortalContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  modalStyles: {
    position: 'absolute',
    zIndex: 1000,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: { flex: 1, position: "relative", }
});
