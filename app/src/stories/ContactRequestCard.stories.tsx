import React from "react";
import { View } from "react-native";
import { ContactRequestCard } from "../components/ContactRequestCard";
import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const TEST_USER_ID = "64a719fa-4963-42e2-bc7e-0cb7beb8844c";
const TEST_USER_ID2 = "867884d0-986e-4e5f-816c-b12846645e6b";
const TEST_USER_ID3 = "746f3639-5988-415b-bc79-845ac8ebbec7";
const TEST_GROUP_ID = "01J5EDPGBNA2DC62GYQ8691574";
const TEST_GROUP_ID2 = "01J0CN30DQ5D2Q0E1Z6FT4Q3AT";

const baseContactRequest: T.ContactRequestResponse = {
  contact_request: {
    id: "cr1",
    from: TEST_USER_ID,
    state: "response_pending_from_viewer" as T.ContactRequestState,
    created_at: new Date().toISOString(),
  },
  in_common: {
    contacts: [],
    groups: [],
  },
};

const Component = (args: any) => {
  const colors = useThemeColors();
  return (
    <View style={{
      backgroundColor: colors.rowBackground, padding: 24, maxWidth: 600
    }}>
      <ContactRequestCard {...args} />
    </View>
  );
};

export default {
  title: "Components/ContactRequestCard",
  component: Component,
  args: {
    basic: {
      contactRequestResponse: baseContactRequest,
    },
    accepted: {
      contactRequestResponse: {
        ...baseContactRequest,
        contact_request: {
          ...baseContactRequest.contact_request,
          state: "accepted",
        },
      },
    },
    ignored: {
      contactRequestResponse: {
        ...baseContactRequest,
        contact_request: {
          ...baseContactRequest.contact_request,
          state: "ignored",
        },
      },
    },
    withCommonContacts: {
      contactRequestResponse: {
        ...baseContactRequest,
        in_common: {
          contacts: [TEST_USER_ID2],
          groups: [],
        },
      },
    },
    withCommonGroups: {
      contactRequestResponse: {
        ...baseContactRequest,
        in_common: {
          contacts: [],
          groups: [TEST_GROUP_ID],
        },
      },
    },
    withBothCommon: {
      contactRequestResponse: {
        ...baseContactRequest,
        in_common: {
          contacts: [TEST_USER_ID2, TEST_USER_ID3],
          groups: [TEST_GROUP_ID, TEST_GROUP_ID2],
        },
      },
    },
  },
};

