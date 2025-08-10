import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { isRunningInExpoGo } from 'expo';
import { Slot, useNavigationContainerRef } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SessionProvider } from "../context/SessionProvider";
import { AssetProvider } from "../context/AssetProvider";
import { VersionProvider } from "../context/VersionProvider";
import { ThemeProvider } from "../context/ThemeProvider";
import { configureGoogleSignIn } from "../gatz/auth";

import * as Sentry from '@sentry/react-native';


dayjs.extend(localizedFormat);
import "dayjs/locale/en";
dayjs.locale("en");

// Configure Google Sign-In
configureGoogleSignIn();

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: "https://a79655a34432c8e21de8fef286caf465@o4508620521078784.ingest.us.sentry.io/4508620526059520",
  debug: true, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  tracesSampleRate: 1.0, // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing. Adjusting this value in production.
  environment: process.env.EXPO_PUBLIC_ENV_NAME,
  enabled: process.env.EXPO_PUBLIC_ENV_NAME === "production",
  integrations: [
    // Pass integration
    navigationIntegration,
  ],
});

function Layout() {
  const ref = useNavigationContainerRef();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  
  useEffect(() => {
    // Check if navigation is ready by testing if ref.current exists
    const checkNavigationReady = () => {
      if (ref.current && !isNavigationReady) {
        setIsNavigationReady(true);
        navigationIntegration.registerNavigationContainer(ref);
      }
    };

    const interval = setInterval(checkNavigationReady, 100);
    return () => clearInterval(interval);
  }, [ref, isNavigationReady]);

  return (
    <ThemeProvider>
      <VersionProvider>
        <GestureHandlerRootView style={styles.container}>
          <AssetProvider>
            <SessionProvider>
              <Slot />
            </SessionProvider>
          </AssetProvider>
        </GestureHandlerRootView>
      </VersionProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(Layout);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
