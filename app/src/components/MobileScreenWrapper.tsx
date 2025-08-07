import React from "react";
import { Dimensions } from "react-native";
// import { Styles as GatzStyles, Color as GatzColor } from "../gatz/styles";

const { width, height } = Dimensions.get("window");
export const CONTENT_WIDTH = Math.min(width, 800); // 90% of screen width, max 400px

export const MobileScreenWrapper = ({
  children,
  backgroundColor,
}: {
  backgroundColor?: string;
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};
