import React from "react";
import { View } from "react-native";
import { InnerInviteLinkScreen } from "../components/InviteLinkScreen";
import * as T from "../gatz/types";
import { useThemeColors } from "../gifted/hooks/useThemeColors";

const TEST_USER_ID = "64a719fa-4963-42e2-bc7e-0cb7beb8844c";
const TEST_USER_ID2 = "867884d0-986e-4f5f-816c-b12846645e6b";
const TEST_GROUP_ID = "01J5EDPGBNA2DC62GYQ8691574";

const now = new Date().toISOString();
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

const baseInviteLink = {
    id: "il1",
    created_at: now,
    expires_at: future,
    created_by: TEST_USER_ID,
};

const baseContact: T.Contact = {
    id: TEST_USER_ID,
    name: "TestUser",
    avatar: "",
};

const baseGroup: T.Group = {
    id: TEST_GROUP_ID,
    name: "Test Group",
    created_at: now,
    updated_at: now,
    created_by: TEST_USER_ID,
    owner: TEST_USER_ID,
    admins: [TEST_USER_ID],
    members: [TEST_USER_ID, TEST_USER_ID2],
    joined_at: { [TEST_USER_ID]: now, [TEST_USER_ID2]: now },
    archived_uids: [],
    settings: { member_mode: "closed" },
    is_public: false,
};

const Component = (args: any) => {
    const colors = useThemeColors();
    return (
        <View style={{ backgroundColor: colors.rowBackground, padding: 24, maxWidth: 600 }}>
            <InnerInviteLinkScreen {...args} />
        </View>
    );
};

export default {
    title: "InviteLinkScreen",
    component: Component,
    args: {
        contactInvite: {
            linkId: "il1",
            response: {
                type: "contact",
                invite_link: {
                    ...baseInviteLink,
                    type: "contact",
                    contact_id: TEST_USER_ID,
                },
                contact: baseContact,
                invited_by: { ...baseContact, id: TEST_USER_ID2, name: "InvitingUser" },
                in_common: {
                    contact_ids: [],
                    contacts: [],
                },
            } as T.InviteLinkResponse,
        },
        groupInvite: {
            linkId: "il2",
            response: {
                type: "group",
                invite_link: {
                    ...baseInviteLink,
                    id: "il2",
                    type: "group",
                    group_id: TEST_GROUP_ID,
                },
                group: baseGroup,
                invited_by: { ...baseContact, id: TEST_USER_ID2, name: "InvitingUser" },
                in_common: {
                    contact_ids: [],
                    contacts: [],
                },
            } as T.InviteLinkResponse,
        },
        crewInvite: {
            linkId: "il3",
            response: {
                type: "crew",
                invite_link: {
                    ...baseInviteLink,
                    id: "il3",
                    type: "crew",
                },
                invited_by: { ...baseContact, id: TEST_USER_ID2, name: "InvitingUser" },
                members: [
                    baseContact,
                    { ...baseContact, id: TEST_USER_ID2, name: "Member2" },
                ],
            } as T.InviteLinkResponse,
        },
        groupCrewInvite: {
            linkId: "il4",
            response: {
                type: "crew",
                invite_link: {
                    ...baseInviteLink,
                    id: "il4",
                    type: "crew",
                },
                invited_by: { ...baseContact, id: TEST_USER_ID2, name: "InvitingUser" },
                members: [
                    baseContact,
                    { ...baseContact, id: TEST_USER_ID2, name: "Member2" },
                ],
                group: baseGroup,
            } as T.InviteLinkResponse,
        },
        unknownInvite: {
            linkId: "il5",
            response: {
                type: "unknown" as any,
                invite_link: {
                    ...baseInviteLink,
                    id: "il5",
                    type: "unknown" as any,
                },
                invited_by: { ...baseContact, id: TEST_USER_ID2, name: "InvitingUser" },
            },
        },
    },
};
