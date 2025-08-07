import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProductAnalytics } from "../sdk/posthog";
import { usePathname } from "expo-router";

// ======================================================================
// Local storage

const LOCAL_SESSION_KEY = "gatz/auth";

export type Session = {
  userId: string;
  token: string;
  is_admin: boolean;
  is_test: boolean;
};

const SESSION_DEFAULTS = {
  is_admin: false,
};

const setLocalSession = async (localAuth: Session) => {
  await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(localAuth));
};

// TODO: userId is not always cleared from the store.

const getLocalSession = async (): Promise<Session | null> => {
  try {
    const localAuthString = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
    if (localAuthString !== null && localAuthString !== undefined) {
      const parsed = JSON.parse(localAuthString);
      if (!parsed) {
        return null;
      }

      // Checking you actually have everything you need,
      // otherwise, it is a brick risk
      if (parsed.token === undefined || parsed.token === null) {
        return null;
      }
      if (parsed.userId === undefined || parsed.userId === null) {
        return null;
      }

      const out = {
        userId: parsed.userId,
        token: parsed.token,
        is_admin: parsed.is_admin || false,
        is_test: parsed.is_test || false,
      } as Session;
      return out;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
};

const migrateLocalToken = async (tokenFrom: string, tokenTo: string) => {
  const localAuth = await getLocalSession();
  if (localAuth && localAuth.token === tokenFrom) {
    await setLocalSession({ ...localAuth, token: tokenTo });
  }
};

// TODO: shouldn't this clear all the local storage logs in stores?
const clearLocalSession = async () => {
  await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
};

// ======================================================================
// Provider

type SignInOpts = { redirectTo: string };

export type SessionContextType = {
  signIn: (session: Session, signInOpts?: SignInOpts) => void;
  signOut: () => void;
  migrateLocalToken: (tokenFrom: string, tokenTo: string) => void;
  session?: Session;
  isLoading: boolean;
  addSignOutListener: (listener: () => void) => void;
};

export const SessionContext = React.createContext<SessionContextType>({
  signIn: () => null,
  signOut: () => null,
  migrateLocalToken,
  session: null,
  isLoading: false,
  addSignOutListener: () => null,
});

type ProviderState = {
  isLoading: boolean;
  session: Session | null;
}
const initialState: ProviderState = { isLoading: true, session: null, }

export function SessionProvider(props: React.PropsWithChildren) {
  const router = useRouter();
  const analytics = useProductAnalytics();

  const signOutListeners = useRef<(() => void)[]>([]);
  const addSignOutListener = useCallback((listener: () => void) => {
    signOutListeners.current.push(listener);
  }, []);

  const [{ isLoading, session }, setComponentState] = useState<ProviderState>(initialState);

  const handleSignIn = useCallback((
    session: Session,
    opts: SignInOpts = { redirectTo: "/" },
  ) => {
    setLocalSession(session);
    setComponentState({ isLoading: false, session });
    router.replace(opts.redirectTo);
  }, [router, setLocalSession, setComponentState]);

  const handleSignOut = useCallback(() => {
    clearLocalSession();
    setLocalSession(null);
    setComponentState({ isLoading: false, session: null });
    AsyncStorage.clear();
    analytics.capture("user.sign_out");
    analytics.reset();
    router.replace("/sign-in");
    signOutListeners.current.forEach((listener) => listener());
  }, [router, setLocalSession, setComponentState, analytics, addSignOutListener]);

  const path = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      const localAuth = await getLocalSession();
      if (localAuth) {
        handleSignIn(localAuth, { redirectTo: path });
        analytics.identify(localAuth.userId, {
          is_test: localAuth.is_test,
          is_admin: localAuth.is_admin,
        });
      } else {
        router.push("/welcome");
      }
    };
    checkSession();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        signIn: handleSignIn,
        signOut: handleSignOut,
        migrateLocalToken,
        session,
        isLoading,
        addSignOutListener,
      }}
    >
      {props.children}
    </SessionContext.Provider>
  );
}
