import { StyleSheet, Text, View } from "react-native";

import { Styles as GatzStyles, Color as GatzColor } from "../gatz/styles";

export const Logo = ({
  fontSize = 72,
  color = "black",
}: {
  fontSize?: number;
  color?: string;
}) => {
  return (
    <View style={logoStyles.outerContainer}>
      <Text style={[logoStyles.title, { fontSize, color }]}>Gatz</Text>
    </View>
  );
};

export const Tagline = ({
  fontSize = 36,
  color = "black",
  text = "Cafe discussions",
}: {
  fontSize?: number;
  color?: string;
  text?: string;
}) => {
  return (
    <View style={logoStyles.outerContainer}>
      <Text style={[logoStyles.tagline, { fontSize, color }]}>{text}</Text>
    </View>
  );
};

const logoStyles = StyleSheet.create({
  outerContainer: {},
  title: {
    fontSize: 72,
    fontFamily: GatzStyles.logo.fontFamily,
  },
  tagline: {
    fontSize: 36,
    fontFamily: GatzStyles.tagline.fontFamily,
  },
});
