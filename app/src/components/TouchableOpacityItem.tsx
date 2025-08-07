import React from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";

const TouchableOpacityItem: React.FC<
  TouchableOpacityProps & {
    onPress: () => void;
    children: React.ReactNode;
  }
> = (props) => {
  const { onPress, children, ...restProps } = props;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.4} {...restProps}>
      {children}
    </TouchableOpacity>
  );
};

export default TouchableOpacityItem;
