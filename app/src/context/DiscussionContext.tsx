import * as React from "react";
import * as T from "../gatz/types";
import { FrontendDBContext } from "./FrontendDBProvider";

export interface IDiscussionContext {
  usernameToId: Map<T.User["name"], T.User["id"]>;
  userId: T.User["id"] | undefined;
  memberSet: Set<T.User["id"]>;
}

export const DiscussionContext = React.createContext<IDiscussionContext>({
  usernameToId: new Map(),
  userId: undefined,
  memberSet: new Set(),
});

export const DiscussionContextProvider = ({
  discussion,
  userId,
  children,
}: {
  discussion: T.Discussion;
  userId: T.User["id"];
  children: React.ReactNode;
}) => {
  const { db } = React.useContext(FrontendDBContext);
  const usernameToId = new Map();
  for (const uid of discussion.members) {
    const user = db.maybeGetUserById(uid);
    if (user) {
      usernameToId.set(user.name, uid);
    }
  }
  const memberSet = new Set(discussion.members);
  const value = {
    usernameToId,
    userId,
    memberSet,
  };
  return (
    <DiscussionContext.Provider value={value}>
      {children}
    </DiscussionContext.Provider>
  );
};

export const useDiscussionContext = () => React.useContext(DiscussionContext);
