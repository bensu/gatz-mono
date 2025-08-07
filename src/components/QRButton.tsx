import { useState } from "react";
import * as React from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useAsync } from "react-async-hook";
import { QrCodeSvg } from "react-native-qr-svg";

import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

export const QRModal = ({ title, fetchUrl, children, }: {
  children: React.ReactNode;
  fetchUrl: () => Promise<{ url: string }>;
  title: string;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const colors = useThemeColors();

  const asyncQRCode = useAsync(
    async () => {
      const { url } = await fetchUrl();
      return url;
    },
    [fetchUrl],
    { executeOnMount: false },
  );

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          setModalVisible(true);
          asyncQRCode.execute();
        }}
      >
        {children}
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[qrButtonStyles.modalView, { backgroundColor: colors.appBackground }]}>
          <TouchableOpacity
            style={qrButtonStyles.buttonClose}
            onPress={() => setModalVisible(false)}
          >
            <MaterialIcons name="close" size={40} color={colors.greyText} />
          </TouchableOpacity>
          {asyncQRCode.loading && <ActivityIndicator size="small" color={colors.primaryText} />}
          {asyncQRCode.error && <Text style={{ color: colors.error }}>Error: {asyncQRCode.error.message}</Text>}
          {asyncQRCode.result && (
            <>
              <Text style={[qrButtonStyles.title, { color: colors.primaryText }]}>Gatz invite to:</Text>
              <Text style={[qrButtonStyles.title, { fontWeight: "600", color: colors.primaryText }]}>
                {title}
              </Text>
              <QrCodeSvg
                style={{ marginTop: 24 }}
                value={asyncQRCode.result}
                frameSize={200}
              />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const qrButtonStyles = StyleSheet.create({
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { fontWeight: "bold", },
  buttonClose: {
    position: "absolute",
    top: 0,
    right: 0,
    margin: 20,
  },
  modalView: {
    position: "relative",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { flex: 1 },
  modalOverlay: { backgroundColor: "rgba(0,0,0,0.5)" },
});