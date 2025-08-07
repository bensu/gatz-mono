import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { isRunningInExpoGo } from 'expo';
import { Slot, useNavigationContainerRef } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SessionProvider } from "../context/SessionProvider";
import { AssetProvider } from "../context/AssetProvider";
import { VersionProvider } from "../context/VersionProvider";
import { ThemeProvider } from "../context/ThemeProvider";

import { PostHogProvider } from "posthog-react-native";
import { POSTHOG_API_KEY, POSTHOG_HOST_URL } from "../sdk/posthog";
import * as Sentry from '@sentry/react-native';

const isPostHogDisabled = process.env.EXPO_PUBLIC_ENV_NAME === "development";

dayjs.extend(localizedFormat);
import "dayjs/locale/en";
dayjs.locale("en");

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
  useEffect(() => {
    navigationIntegration.registerNavigationContainer(ref);
  }, [ref]);

  return (
    <ThemeProvider>
      <VersionProvider>
        <PostHogProvider
          apiKey={POSTHOG_API_KEY}
          options={{ host: POSTHOG_HOST_URL, disabled: isPostHogDisabled }}
        >
          <GestureHandlerRootView style={styles.container}>
            <AssetProvider>
              <SessionProvider>
                <Slot />
              </SessionProvider>
            </AssetProvider>
          </GestureHandlerRootView>
        </PostHogProvider>
      </VersionProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(Layout);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
