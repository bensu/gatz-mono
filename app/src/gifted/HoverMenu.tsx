import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Styles as GatzStyles } from "../gatz/styles";

export const HoverMenu = (
  { colors, onReply, onReactji, onCopyText, onEdit, openBottomMenu }:
    {
      colors: any,
      onReply?: () => void,
      onReactji?: () => void,
      onCopyText?: () => void,
      onEdit?: () => void,
      openBottomMenu?: () => void
    }
) => {
  return (
    <View
      style={[
        hoverMenuStyles.container,
        { backgroundColor: colors.appBackground, borderColor: colors.midGrey, },
      ]}
    >
      {onReply && (
        <View style={hoverMenuStyles.mirror}>
          <TouchableOpacity onPress={onReply}>
            <MaterialIcons name="reply" size={24} color={colors.strongGrey} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={onReactji}>
        <MaterialIcons
          name="add-reaction"
          size={24}
          color={colors.strongGrey}
        />
      </TouchableOpacity>

      {onCopyText && (
        <TouchableOpacity onPress={onCopyText}>
          <MaterialIcons
            name="content-copy"
            size={24}
            color={colors.strongGrey}
          />
        </TouchableOpacity>
      )}

      {onEdit && (
        <TouchableOpacity onPress={onEdit}>
          <MaterialIcons
            name="edit"
            size={24}
            color={colors.strongGrey}
          />
        </TouchableOpacity>
      )}

      {openBottomMenu && (
        <TouchableOpacity onPress={openBottomMenu}>
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={colors.strongGrey}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};



const hoverMenuStyles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GatzStyles.platformSeparator.backgroundColor,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mirror: { transform: [{ scaleX: -1 }] },

});

