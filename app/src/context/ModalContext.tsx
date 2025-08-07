import React, { createContext, useCallback, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../gifted/hooks/useThemeColors';

// Create Modal Context
export const ModalContext = createContext<{
  setModalChildren: (children: React.ReactNode) => void;
  closeModal: () => void;
}>({
  setModalChildren: () => { },
  closeModal: () => { },
});

// Modal Provider Component
export const ModalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useThemeColors();
  const [modalChildren, setModalChildrenState] = useState<React.ReactNode>(null);

  const modalOpen = !!modalChildren;
  const overlayStyle: StyleProp<ViewStyle> = modalOpen
    ? { display: 'flex', pointerEvents: 'auto' }
    : { display: 'none' };

  const closeModal = useCallback(() => {
    setModalChildrenState(null);

    // Restore scrolling for web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, []);


  const setModalChildren = useCallback((children: React.ReactNode) => {
    setModalChildrenState(children);

    // Prevent background scrolling for web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }, []);

  return (
    <ModalContext.Provider value={{ setModalChildren, closeModal }}>
      <View style={styles.flex1}>
        <View style={styles.flex1}>{children}</View>
        {modalChildren && (
          <BlurView
            tint={colors.theme}
            style={StyleSheet.absoluteFill}
            intensity={Platform.select({ android: 100, default: 20 })}
          />
        )}
        <View
          style={[StyleSheet.absoluteFill, styles.modalStyles, overlayStyle]}
        >
          <View style={styles.contentContainer}>{modalChildren}</View>
        </View>
      </View>
    </ModalContext.Provider>
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
  contentContainer: {
    flex: 1,
    position: 'relative'
  },
});