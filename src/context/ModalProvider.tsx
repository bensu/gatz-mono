import { ClientContext } from "./ClientProvider";
import React, {
  PropsWithChildren,
  useEffect,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StyleProp,
  ViewStyle,
  AppState,
} from "react-native";

import * as Sync from "../../vendor/shared/npm-package";

import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import { LocationPermissionRequest, LocationButtonModal } from "../location/Location";
import { useLocationPermission } from "../hooks/useLocationPermission";
import { GatzClient } from "../gatz/client";
import * as T from "../gatz/types";
import { useLocationStore } from "../gatz/store";

const olderThanYesterday = (ts: number) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return ts < yesterday.getTime();
}

// For testing
const olderThan30Seconds = (ts: number) => {
  const now = new Date();
  now.setSeconds(now.getSeconds() - 30);
  return ts < now.getTime();
}

const subscribeToMe = (syncEngine: Sync.SyncEngine): { user: T.User | null, error: Error | null, loading: boolean } => {
  const [user, setUser] = useState<T.User | null>(null);


  const [error, setIsError] = useState<Error | null>(null);
  const [loading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    try {
      setIsLoading(true);
      const { user, unsubscribe } = Sync.subscribe_to_me(syncEngine, "modal_provider", setUser);
      user.then(setUser)
        .catch((e) => {
          setIsError(e);
        })
        .finally(() => {
          setIsLoading(false);
        })
      return unsubscribe;
    } catch (e) {
      setIsError(e);
    }
  }, [syncEngine]);

  return { user, error, loading };
}



export const ModalProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();

  const colors = useThemeColors();

  const { gatzClient, db, syncEngine } = useContext(ClientContext);

  const { user: me } = subscribeToMe(syncEngine);


  // Location

  const { requestLocationPermission, getLocation } = useLocationPermission();

  const [locationResponse, setLocationResponse] = useState<T.NewLocationResponse | null>(null);

  const closeLocationHeader = useCallback(
    () => setLocationResponse(null),
    [setLocationResponse],
  );

  const [isRequestingLocationPermission, setIsRequestingLocationPermission] = useState(false);

  const onPostLocation = useCallback(async () => {
    closeLocationHeader();
    router.push("/post?location=" + locationResponse?.location.id);
  }, [router, locationResponse]);

  const onRequestLocationPermission = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();
      Sync.set_location_setting(syncEngine, granted);

      // we don't wait for the actual location to hide the modal
      setIsRequestingLocationPermission(false);

      if (granted) {
        const location = await getLocation();
        if (location) {
          gatzClient.markLocation(location);
        }
      }
    } finally {
      setIsRequestingLocationPermission(false);
    }
  }, [requestLocationPermission, gatzClient, syncEngine]);

  const closeLocationPermissionRequest = useCallback(
    async () => {
      setIsRequestingLocationPermission(false)
      Sync.set_location_setting(syncEngine, false);
    },
    [setIsRequestingLocationPermission, syncEngine],
  );

  const { addLocation, last_location } = useLocationStore();

  const checkLocation = useCallback(() => {
    // we only check this once a day
    if (!last_location || last_location && olderThanYesterday(last_location.ts)) {
      // if the user has the location permissions, we should check it
      getLocation().then(async (location) => {
        addLocation();

        // If the location has changed, we should suggest them to post about it
        const r = await gatzClient.markLocation(location);
        if ("location" in r) {
          setLocationResponse(r);
        }
      })
    }
  }, [last_location, gatzClient]);

  useEffect(() => {
    if (Platform.OS !== "web" && me) {
      const locationSettings: T.LocationSettings = me.settings?.location || { enabled: null };
      if (locationSettings?.enabled === null || locationSettings?.enabled === undefined) {
        // If the user doesn't have location permissions set, we ask for them
        setIsRequestingLocationPermission(true);
      }
    }
  }, [me]);

  const checkOnMount = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" && me) {
      const locationSettings: T.LocationSettings = me.settings?.location || { enabled: false };
      if (locationSettings.enabled) {
        // We check on mount
        if (!checkOnMount.current) {
          checkLocation();
          checkOnMount.current = true;
        }
        // We check on app state change
        const sub = AppState.addEventListener("change", (appState) => {
          if (appState === "active") {
            checkLocation();
          }
        });
        return () => sub.remove();
      }
    }

  }, [me, checkLocation])

  const [modalChildren, setModalChildren] = useState<React.ReactNode>(null);

  const modalOpen = !!modalChildren;
  const overlayStyle: StyleProp<ViewStyle> = modalOpen
    ? { display: "flex", pointerEvents: "auto" }
    : { display: "none" };

  const closeModal = useCallback(() => {
    if (modalChildren) {
      setModalChildren(null);
      router.navigate("/");
    }
  }, [modalChildren, router]);

  const openModal = useCallback(() => {
    setModalChildren(
      <MaintenanceModal
        gatzClient={gatzClient}
        closeModal={closeModal}
      />,
    );
  }, [gatzClient, closeModal]);

  useEffect(() => {
    gatzClient.hookMaintenanceModal(openModal, closeModal);
  }, [gatzClient, openModal, closeModal]);

  return (
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
        <View style={[styles.contentContainer]}>{modalChildren}</View>
      </View>
      {locationResponse && (
        <LocationButtonModal
          db={db}
          locationResponse={locationResponse}
          visible={!!locationResponse}
          onClose={closeLocationHeader}
          onAction={onPostLocation}
        />
      )}
      {isRequestingLocationPermission && (
        <LocationPermissionRequest
          visible={isRequestingLocationPermission}
          onClose={closeLocationPermissionRequest}
          onAction={onRequestLocationPermission}
        />
      )}
    </View>
  );
};

// Maintenace Modal

const MaintenanceModal = ({
  gatzClient,
  closeModal,
}: {
  gatzClient: GatzClient;
  closeModal: () => void;
}) => {
  const colors = useThemeColors();

  const [isLoading, setIsLoading] = useState(false);
  const [gatzIsStillDown, setGatzIsStillDown] = useState(false);

  const checkIfGatzIsBack = useCallback(() => {
    setIsLoading(true);
    gatzClient
      .getMe()
      .then(() => {
        closeModal();
      })
      .catch(() => {
        setGatzIsStillDown(true);
        setTimeout(() => setGatzIsStillDown(false), 3000);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gatzClient]);

  return (
    <View
      style={[
        styles.maintenanceContainer,
        { backgroundColor: colors.modalBackground },
      ]}
    >
      <View style={styles.handle} />
      <Text style={[styles.maintenanceText, { color: colors.primaryText }]}>
        Sorry, Gatz is down for maintenance
      </Text>
      <View
        style={{ height: 50, justifyContent: "center", alignItems: "center" }}
      >
        {gatzIsStillDown ? (
          <Text style={[styles.tryAgainText, { color: colors.primaryText }]}>
            Gatz is still down for maintenance
          </Text>
        ) : isLoading ? (
          <ActivityIndicator size="small" color={colors.buttonActive} />
        ) : (
          <TouchableOpacity
            style={[styles.tryAgainButton]}
            onPress={checkIfGatzIsBack}
          >
            <Text style={[styles.tryAgainText, { color: colors.buttonActive }]}>
              Check if Gatz is back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  modalStyles: {
    position: "absolute",
    zIndex: 1000,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: { flex: 1, position: "relative" },
  maintenanceContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: "center",
    paddingBottom: Platform.select({ ios: 40, android: 20 }), // Extra padding for iOS home indicator
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  maintenanceText: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "400",
    marginBottom: 20,
  },
  tryAgainButton: {
    marginTop: 16,
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: "500",
  },
  overlay: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
});
