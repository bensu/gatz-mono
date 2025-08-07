import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { ActivityIndicator, Text, View } from "react-native";

import * as Font from "expo-font";

// used fonts
const bricolageMedium = require("../../assets/fonts/BricolageGrotesque-Medium.ttf");
const bricolageSemibold = require("../../assets/fonts/BricolageGrotesque-SemiBold.ttf");
const ralewayBold = require("../../assets/fonts/Raleway-Bold.ttf");
const ralewayRegular = require("../../assets/fonts/Raleway-Regular.ttf");

// unused fonts
// const bricolageRegular = require("../../assets/fonts/BricolageGrotesque-Regular.ttf");
// const bricolageMedium = require("../../assets/fonts/BricolageGrotesque-Medium.ttf");
// const bricolageBold = require("../../assets/fonts/BricolageGrotesque-Bold.ttf");

// ======================================================================
// Fonts

const fetchFonts = () => {
  return Font.loadAsync({
    "bricolage-semibold": bricolageSemibold,
    "bricolage-medium": bricolageMedium,
    "raleway-regular": ralewayRegular,
    "raleway-bold": ralewayBold,
  });
};

export type AssetContextType = { fontsLoading: boolean };

export const AssetContext = createContext<AssetContextType | null>({
  fontsLoading: true,
});

const Loading = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export const AssetProvider = ({ children }: PropsWithChildren) => {
  const [fontsLoading, setFontsLoading] = useState(true);
  // const value = useContext(AssetContext);

  useEffect(() => {
    fetchFonts().then(() => setFontsLoading(false));
  }, []);
  return (
    <AssetContext.Provider value={{ fontsLoading }}>
      {fontsLoading ? <Loading /> : children}
      {/* {children} */}
    </AssetContext.Provider>
  );
};
