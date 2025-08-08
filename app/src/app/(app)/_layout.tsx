import { useContext } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { usePushNotificationRouter } from "../../push";

import { ClientProvider } from "../../context/ClientProvider";
import { FrontendDBProvider } from "../../context/FrontendDBProvider";
import { SessionContext } from "../../context/SessionProvider";
import { PortalProvider } from "../../context/PortalProvider";
import { ActionPillProvider } from "../../context/ActionPillProvider";
import { ModalContextProvider } from "../../context/ModalContext";
import { MigrationProvider } from "../../context/MigrationProvider";

export default function Layout() {
  usePushNotificationRouter();
  const { isLoading, session } = useContext(SessionContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return (
    <ClientProvider>
      <MigrationProvider>
        <FrontendDBProvider>
          <ActionPillProvider>
            <PortalProvider>
              <ModalContextProvider>
                <Stack />
              </ModalContextProvider>
            </PortalProvider>
          </ActionPillProvider>
        </FrontendDBProvider>
      </MigrationProvider>
    </ClientProvider >
  );
}
