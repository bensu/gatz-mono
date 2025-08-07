import React, {
  PropsWithChildren,
  createContext,
  useEffect,
  useContext,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AnalyticsWrapper, useProductAnalytics } from "../sdk/posthog";
import { GatzClient, OpenClient, GatzSocket, BASE_URL } from "../gatz/client";
import * as T from "../gatz/types";
import { FrontendDB } from "./FrontendDB";

import { SessionContext, SessionContextType } from "./SessionProvider";

import { useSocketStore } from "../gatz/store";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

import * as Sync from "../../vendor/shared/npm-package";

export type ClientContextType = {
  gatzClient: GatzClient;
  openClient: OpenClient;
  socket: GatzSocket;
  syncEngine: Sync.SyncEngine;
  // socketState: SocketState;
  db: FrontendDB;
};

export const ClientContext = createContext<ClientContextType | null>(null);

const withinSeconds = (seconds: number, b: Date, a: Date): boolean => {
  return b.getTime() - a.getTime() < seconds * 1000;
};

export const ConnectionStatus = () => {
  const { socketState } = useSocketStore();
  const colors = useThemeColors();
  switch (socketState.strategy) {
    case "CONNECTING": {
      // don't show the overlay if the disconnection is very recent
      if (!withinSeconds(3, new Date(), socketState.disconnectedAt)) {
        return (
          <View
            style={[
              styles.overlay,
              { backgroundColor: colors.overlayBackground },
            ]}
          >
            <Text style={[{ color: colors.overlayText }]}>
              {socketState.counter === 0
                ? "Connecting to server"
                : `Disconnected from server. Reconnecting in ${socketState.counter / 1000
                }s...`}
            </Text>
          </View>
        );
      } else {
        return null;
      }
    }
    case "OPEN": {
      return null;
    }
  }
};

interface Singletons {
  userId: T.User["id"];
  db: FrontendDB;
  gatzClient: GatzClient;
  socket: GatzSocket;
  openClient: OpenClient;
  syncEngine: Sync.SyncEngine;
}

var singletons: Singletons | null = null;

function initializeSingletons(
  userId: T.User["id"],
  sessionContext: SessionContextType,
  analytics: AnalyticsWrapper,
): Singletons {
  if (!singletons) {
    const gatzClient = new GatzClient(sessionContext, analytics);
    const db = new FrontendDB(gatzClient);
    const socket = new GatzSocket(
      userId,
      sessionContext.session.token,
      analytics,
    );
    const openClient = new OpenClient();
    const syncEngine = Sync.new_sync_engine(
      BASE_URL,
      sessionContext.session.token,
      userId,
    );
    singletons = {
      userId,
      db,
      gatzClient,
      socket,
      openClient,
      syncEngine,
    };
    return singletons;
  } else {
    return singletons;
  }
}

const destroySingletons = () => {
  singletons = null;
};

export const ClientProvider = ({ children }: PropsWithChildren) => {
  const analytics = useProductAnalytics();
  const sessionContext = useContext(SessionContext);
  const {
    session: { userId },
    addSignOutListener,
  } = sessionContext;
  const clients = initializeSingletons(userId, sessionContext, analytics);

  useEffect(() => {
    addSignOutListener(() => {
      clients.socket.close();
      destroySingletons();
    });
  }, [clients, addSignOutListener]);

  const [me, setMe] = useState<T.User | null>(clients.db.getMe());
  const [isLoadingMe, setIsLoadingMe] = useState(me !== null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    try {
      if (!me) {
        clients.gatzClient.getMe().then((response) => {
          clients.db.storeMeResult(response);
          setMe(response.user);
        });
      }
    } catch (e) {
      setIsError(true);
    } finally {
      setIsLoadingMe(false);
    }
  }, [clients]);

  const socketStore = useSocketStore();

  useEffect(() => {
    clients.socket.connect({
      onConnection: () => socketStore.handleConnection(),
      onFail: ({ delay }) => socketStore.handleFailure({ delay }),
    });

    const intervalId = setInterval(() => socketStore.handleInterval(), 1000);

    const { socket, db } = clients;

    const ednLid = socket.listenToEdn((edn) => {
      Sync.handle_ws_edn(clients.syncEngine, edn);
    });

    const listenerId = socket.listenToMessage((event: T.SocketEvent) => {
      switch (event.type) {
        case "message_edited": {
          const { message, discussion } = event.data;
          db.transaction(() => {
            if (message.deleted_at) {
              db.deleteMessage(discussion.id, message.id);
            } else {
              db.appendMessage(message, discussion);
            }
          });
          break;
        }
        case "new_feed_item": {
          const { feed_item, contacts, groups } = event.data;
          db.processIncomingFeed({
            discussions: [],
            items: [feed_item],
            users: contacts,
            groups: groups,
          });
        }
        default: {
          console.log("unhandled websocket message", event);
        }
      }
    });

    // remove event listener on unmount
    return () => {
      socket.removeListener(listenerId);
      socket.removeEdnListener(ednLid);
      clearInterval(intervalId);
    };
  }, [clients]);

  if (isLoadingMe) {
    return <ActivityIndicator />;
  }

  if (isError) {
    return <Text>Error</Text>;
  }

  return (
    <ClientContext.Provider value={clients}>
      {children}
    </ClientContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
});

