import { Dimensions } from "react-native";
import { isMobile } from "../util";

// Breakpoints for responsive layout
export const DRAWER_COLLAPSE_THRESHOLD = 700;
export const CONTENT_COLLAPSE_THRESHOLD = 900;

// Layout modes for drawer
export type DrawerLayoutMode = "PERMANENT_DRAWER" | "SLIDE_DRAWER";

// Layout modes for content area
export type ContentLayoutMode = "NORMAL" | "NARROW" | "COMPACT";

// Determine drawer layout mode based on screen width
export const getDrawerLayoutMode = (width: number): DrawerLayoutMode => {
  if (isMobile() || width < DRAWER_COLLAPSE_THRESHOLD) {
    return "SLIDE_DRAWER";
  }
  return "PERMANENT_DRAWER";
};

// Determine content layout mode based on screen width and active discussion
export const getContentLayoutMode = (width: number, hasDid: boolean): ContentLayoutMode => {
  if (width <= CONTENT_COLLAPSE_THRESHOLD && hasDid) {
    return "NARROW";
  } else if (!hasDid) {
    return "COMPACT";
  }
  return "NORMAL";
};

// Helper to get current window width
export const getWindowWidth = (): number => {
  return Dimensions.get('window').width;
};

// Check if drawer should be showing
export const shouldShowDrawerButton = (): boolean => {
  return isMobile() || getDrawerLayoutMode(getWindowWidth()) === "SLIDE_DRAWER";
};