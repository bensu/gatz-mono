import { PropsWithChildren, createContext, useContext } from "react";

import { FrontendDB } from "./FrontendDB";
import { ClientContext } from "./ClientProvider";

export type FrontendDBContextType = { db: FrontendDB };

export const FrontendDBContext = createContext<FrontendDBContextType | null>(
  null,
);

// This is no longer necessary
export const FrontendDBProvider = ({ children }: PropsWithChildren) => {
  const { db } = useContext(ClientContext);
  const value: FrontendDBContextType = { db };
  return (
    <FrontendDBContext.Provider value={value}>
      {children}
    </FrontendDBContext.Provider>
  );
};
