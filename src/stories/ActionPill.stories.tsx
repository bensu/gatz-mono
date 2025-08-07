import React from "react";
import { ActionPill, ContrastActionPill } from "../context/ActionPillProvider";

const Switcher = (args: any) => {
  if ("action" in args) {
    return <ActionPill action={args.action} />
  }
  if ("contrast" in args) {
    return <ContrastActionPill action={args.contrast} />
  }
  return null;
}

export default {
  title: "Components/ActionPill",
  component: Switcher,
  args: {
    default: {
      action: {
        id: "default",
        actionLabel: "Default Action",
        onPress: () => console.log("Default pressed"),
        color: "#FFFFFF",
        backgroundColor: "#007AFF",
      }
    },
    success: {
      action: {
        id: "success",
        actionLabel: "Success Action",
        onPress: () => console.log("Success pressed"),
        color: "#FFFFFF",
        backgroundColor: "#34C759",
        timeout: 5000, // longer timeout
        description: "This is a description",
      }
    },
    error: {
      action: {
        id: "error",
        actionLabel: "Error Action",
        onPress: () => console.log("Error pressed"),
        color: "#FFFFFF",
        backgroundColor: "#FF3B30",
        timeout: 2000, // shorter timeout
        description: "This is a description",
      }
    },
    contrast: {
      contrast: {
        id: "contrast",
        actionLabel: "Undo",
        onPress: () => console.log("Contrast pressed"),
        description: "Post hidden",
      }
    },

  }
};
