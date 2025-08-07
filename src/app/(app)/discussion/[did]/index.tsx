import { useLocalSearchParams } from "expo-router";
import { DiscussionScreen } from "../../../../components/DiscussionScreen";

export default function () {
  const params = useLocalSearchParams();
  const did = params.did as string;
  return <DiscussionScreen did={did} onDesktopClose={() => { }} />;
}
