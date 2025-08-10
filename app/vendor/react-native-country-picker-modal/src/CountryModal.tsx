import * as React from 'react'
import { Modal, ModalProps, SafeAreaView, StyleSheet, Platform } from 'react-native'
import { AnimatedModal } from './AnimatedModal'
import { useTheme } from './CountryTheme'
import { CountryModalContext } from './CountryModalProvider'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

const defaultProps = {
  animationType: 'slide' as const,
  animated: true,
  withModal: true,
  disableNativeModal: false,
};

export const CountryModal = (propsWithDefaults: ModalProps & {
  children: React.ReactNode
  withModal?: boolean
  disableNativeModal?: boolean
}) => {
  const mergedProps = { ...defaultProps, ...propsWithDefaults };
  const {
    children,
    withModal,
    disableNativeModal,
    ...props
  } = mergedProps;
  const { backgroundColor } = useTheme()
  const { teleport } = React.useContext(CountryModalContext)
  const content = (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {children}
    </SafeAreaView>
  )
  React.useEffect(() => {
    if (disableNativeModal) {
      teleport!(<AnimatedModal {...props}>{content}</AnimatedModal>)
    }
  }, [disableNativeModal])
  if (withModal) {
    if (Platform.OS === 'web') {
      return <Modal {...props}>{content}</Modal>
    }
    if (disableNativeModal) {
      return null
    }
    return <Modal {...props}>{content}</Modal>
  }
  return content
}

