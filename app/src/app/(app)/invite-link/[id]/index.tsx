import React from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Color as GatzColor } from "../../../../gatz/styles";
import InviteLinkScreen from "../../../../components/InviteLinkScreen";
import { MobileScreenWrapper } from "../../../../components/MobileScreenWrapper";
import { useThemeColors } from "../../../../gifted/hooks/useThemeColors";

export default function InviteLinkHandler() {
  const params = useLocalSearchParams();
  const linkId = params.id as string;
  const colors = useThemeColors();

  return (
    <MobileScreenWrapper>
      <View style={{ flex: 1, backgroundColor: colors.defaultBackground }}>
        <InviteLinkScreen linkId={linkId} />
      </View>
    </MobileScreenWrapper>
  );
}
