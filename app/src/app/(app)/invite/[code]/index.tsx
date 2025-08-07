import InviteLinkScreen from "../../../../components/InviteLinkScreen";
import React from "react";
import { useLocalSearchParams } from "expo-router";

export default function InviteLinkHandler() {
  const params = useLocalSearchParams();
  const code = params.code as string;
  const id = params.id as string | undefined;

  return <InviteLinkScreen code={code} linkId={id} />;
}
