import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import * as T from "./gatz/types";
import { PendingNotificationsStore, useNotificationStore } from "./gatz/store";
import { assertNever } from "./util";

// These code is mostly taken from:
// https://levelup.gitconnected.com/push-notifications-with-react-native-expo-and-node-js-30aa824c7956

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EXPO_PUBLIC_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID;

export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  if (Device.isDevice && Platform.OS !== "web") {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("existingStatus", existingStatus);
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      console.log("finalStatus", finalStatus);
      return;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PUBLIC_PROJECT_ID,
      })
    ).data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        showBadge: true,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FE9018",
      });
    }

    // The token should be sent to the server
    // so that it can be used to send push notifications to the device
    return token;
  } else {
    return Promise.resolve(undefined);
  }
}

// Type safety wrappers, the notifications come untyped. Check gatz.notify for the server types

const getRequestData = (
  request: Notifications.NotificationRequest,
): T.PushData => {
  const {
    content: { data },
  } = request;
  const pushData = data as T.PushData;
  return pushData;
};

const getResponseData = (
  response: Notifications.NotificationResponse,
): T.PushData => {
  const {
    notification: {
      request: {
        content: { data },
      },
    },
  } = response;
  const pushData = data as T.PushData;
  return pushData;
};


export const clearActivityNotifications = async (
  store: PendingNotificationsStore,
) => {
  try {
    const presentedNotifications =
      await Notifications.getPresentedNotificationsAsync();

    // Filter and dismiss notifications for the activity group
    const presentedIds = presentedNotifications
      .filter((nt) => {
        const pushData = getRequestData(nt.request);
        return pushData.scope === "activity";
      })
      .map((nt) => nt.request.identifier);

    const deliveredIds = store.getActivityNotifications();

    const allIds = presentedIds.concat(deliveredIds);

    const dismissPromises = allIds.map((id) =>
      Notifications.dismissNotificationAsync(id),
    );
    await Promise.all(dismissPromises);

    store.clearActivityNotifications();

    console.log("Activity notifications cleared");
  } catch (error) {
    console.error("Error clearing activity notifications:", error);
  }
};



export const usePushNotificationRouter = () => {
  const ntsListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [expoPushToken, setExpoPushToken] = useState("");

  const store = useNotificationStore();
  const { addDiscussionNotification, addActivityNotification } = store;

  const router = useRouter();

  const handleNotification = useCallback(
    async (nt: Notifications.Notification) => {
      const pushData = getRequestData(nt.request);
      const scope = pushData.scope;
      switch (scope) {
        case "discussion": {
          addDiscussionNotification(pushData.did, nt.request.identifier);
          break;
        }
        case "message": {
          addDiscussionNotification(pushData.did, nt.request.identifier);
          break;
        }
        case "activity": {
          // When receiving a new activity notification,
          // we clear previous activity notifications

          // Find all previous activity notifications
          const presentedNotifications =
            await Notifications.getPresentedNotificationsAsync();
          const oldNtIds = presentedNotifications
            .filter((nt) => {
              const pushData = getRequestData(nt.request);
              return pushData.scope === "activity";
            })
            .filter((oldNt) => oldNt.request.identifier !== nt.request.identifier)
            .map((nt) => nt.request.identifier);
          const deliveredIds = store.getActivityNotifications();
          const idsToDismiss = oldNtIds.concat(deliveredIds);

          // Dismiss all previous activity notifications
          const dismissPromises = idsToDismiss.map((id) =>
            Notifications.dismissNotificationAsync(id),
          );
          await Promise.all(dismissPromises);

          // Add the new activity notification
          addActivityNotification(nt.request.identifier);
          break;
        }
        default: {
          console.error("invalid notification scope", scope);
        }
      }

      // We could delete older notification with
      // Notifications.cancelScheduledNotificationAsync(
      //   olderNotification.request.identifier
      // );
    },
    [addDiscussionNotification, addActivityNotification],
  );

  const navToUrl = useCallback(
    (response: Notifications.NotificationResponse) => {
      console.log("incoming notification", response);
      if (response) {
        try {
          const data = getResponseData(response);
          if (data) {
            const { url } = data;
            if (url) {
              router.push(url);
            }
          } else {
            console.log("notification missing data", response);
          }
        } catch (e) {
          console.error("error dealing with the a notification", response);
          console.error(e);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    // This listener is fired when a notification is received while the app is being used
    ntsListener.current =
      Notifications.addNotificationReceivedListener(handleNotification);

    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is foregrounded, backgrounded, or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(navToUrl);

    return () => {
      Notifications.removeNotificationSubscription(ntsListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [handleNotification, navToUrl]);

  return [expoPushToken, setExpoPushToken];
};

export const clearDiscussionNotifications = async (
  store: PendingNotificationsStore,
  did: T.Discussion["id"],
) => {
  try {
    const presentedNotifications =
      await Notifications.getPresentedNotificationsAsync();

    // Filter and dismiss notifications for the specific chat group
    const presentedIds = presentedNotifications
      .filter((nt) => {
        const pushData = getRequestData(nt.request);
        if (pushData.scope === "discussion" || pushData.scope === "message") {
          return pushData.did === did;
        } else {
          return false;
        }
      })
      .map((nt) => nt.request.identifier);

    const deliveredIds = store.getDiscussionNotifications(did);
    const allIds = presentedIds.concat(deliveredIds);

    const dismissPromises = allIds.map((id) =>
      Notifications.dismissNotificationAsync(id),
    );
    await Promise.all(dismissPromises);

    store.clearDiscussion(did);

    console.log(`Notifications for discussion ${did} cleared`);
  } catch (error) {
    console.error("Error clearing discussion notifications:", error);
  }
};
