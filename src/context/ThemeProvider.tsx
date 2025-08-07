import React, { createContext, useState, useEffect, useCallback } from "react";
import { Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../gatz/styles";

export type ThemeType = "light" | "auto" | "dark";
export type CurrentThemeSelection = "light" | "dark";

type ThemeContextType = {
  theme: ThemeType;
  currentTheme: CurrentThemeSelection;
  setTheme: (theme: ThemeType) => void;
  colors: any;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "auto",
  currentTheme: "light",
  setTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeType>("auto");
  const systemColorScheme = useColorScheme();

  // Currently, we only support darkmode by reading it from the user's system settings
  const currentTheme = systemColorScheme; //  theme === "auto" ? systemColorScheme || "light" : theme;

  const colors = currentTheme === "light" ? lightColors : darkColors;

  const setTheme = useCallback(async (newTheme: ThemeType) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Failed to save theme", error);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      document.documentElement.style.colorScheme = currentTheme;
    }
  }, [currentTheme]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error("Failed to load theme", error);
      }
    };
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
