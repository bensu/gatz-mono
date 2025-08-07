import React from "react";
import { StyleSheet, Image, View } from "react-native";
import { useThemeColors } from "../gifted/hooks/useThemeColors";
// import { MaterialIcons } from "@expo/vector-icons";

// import { getLocationAsync, pickImages, takePictureAsync } from "../mediaUtils";
// import { ImagePickerResult } from "expo-image-picker";
import { Media } from "../gatz/types";

type Props = {
  // onImages: (result: ImagePickerResult) => void;
  media?: Media;
};

export default class AccessoryBar extends React.Component<Props> {
  render() {
    const { media } = this.props;
    const colors = useThemeColors()

    return (
      <View style={[styles.container, {backgroundColor: colors.appBackground }]}>
        <Image style={{ height: 40, width: 40 }} source={{ uri: media.url }} />
        {/* <Button
            name="photo"
            onPress={async () => {
              const result = await pickImages();
              if (result && !result.canceled) {
                onImages(result);
              }
            }}
          /> */}
        {/* <Button onPress={() => takePictureAsync(onSend)} name="camera" /> */}
        {/* <Button onPress={() => getLocationAsync(onSend)} name="my-location" /> */}
        {/* <Button onPress={() => isTyping()} name="chat" /> */}
      </View>
    );
  }
}

// const Button = ({
//   onPress,
//   size = 30,
//   color = "rgba(0,0,0,0.5)",
//   ...props
// }) => (
//   <TouchableOpacity onPress={onPress}>
//     <MaterialIcons size={size} color={color} {...props} />
//   </TouchableOpacity>
// );

const styles = StyleSheet.create({
  container: {
    height: 44,
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.3)",
  },
});
