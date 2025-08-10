import { useMemo } from "react";
import { usePostHog } from "posthog-react-native";

export const POSTHOG_HOST_URL = "https://us.i.posthog.com";

export const POSTHOG_API_KEY =
  "phc_abqkICUI7qZDw1rNLR53fB8uC41kOOjKWfE54NfoHus";

// keep in sync with server/src/sdk/posthog.clj
export type AnalyticsEvents =
  | "settings.viewed"
  | "contacts.viewed"
  | "contact.viewed"
  | "discussion.viewed"
  | "invites.viewed"
  | "cities.viewed"
  | "draft.new"
  | "draft.cancel"
  | "user.sign_out"
  | "group.viewed"
  | "websocket.connected"
  | "websocket.reconnected"
  | "websocket.disconnected"
  | "websocket.error";

export type AnalyticsWrapper = {
  capture: (event: AnalyticsEvents, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
};

// Real PostHog wrapper
export const useProductAnalytics = (): AnalyticsWrapper => {
  const posthog = usePostHog();
  
  return useMemo(() => {
    return {
      capture: (event: AnalyticsEvents, properties?: Record<string, any>) => {
        console.log(`[PostHog] capture: ${event}`, properties);
        posthog?.capture(event, properties);
      },
      identify: (userId: string, properties?: Record<string, any>) => {
        console.log(`[PostHog] identify: ${userId}`, properties);
        posthog?.identify(userId, properties);
      },
      reset: () => {
        console.log(`[PostHog] reset`);
        posthog?.reset();
      },
    };
  }, [posthog]);
};
