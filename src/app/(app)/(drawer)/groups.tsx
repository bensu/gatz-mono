import React, { useMemo, useState, useContext, useCallback, useEffect } from "react";
import {
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useAsync } from "react-async-hook";
import { useLocalSearchParams } from "expo-router";
import { useDebouncedRouter } from "../../../context/debounceRouter";
import { useProductAnalytics } from "../../../sdk/posthog";
import { Styles as GatzStyles } from "../../../gatz/styles";
import * as T from "../../../gatz/types";
import { SessionContext } from "../../../context/SessionProvider";
import { ClientContext } from "../../../context/ClientProvider";
import { FrontendDBContext } from "../../../context/FrontendDBProvider";
import TouchableOpacityItem from "../../../components/TouchableOpacityItem";
import { GroupRow } from "../../../components/contacts";
import { SearchBar } from "../../../components/SearchInput";
import { UniversalHeader, HeaderTitleWithIcon } from "../../../components/Header";
import { useThemeColors } from "../../../gifted/hooks/useThemeColors";
import { Ionicons } from "@expo/vector-icons";
import { isMobile } from "../../../util";
import { GroupScreen } from "../../../components/GroupScreen";
import { 
  ContentLayoutMode, 
  getContentLayoutMode, 
  getWindowWidth 
} from "../../../util/layout";

function GroupsInner() {
  const {
    session: { userId },
  } = useContext(SessionContext);
  const { gatzClient } = useContext(ClientContext);
  const analytics = useProductAnalytics();
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();

  const { error, loading, result } = useAsync(async () => {
    analytics.capture("settings.viewed");
    const r = await gatzClient.getUserGroups();
    const { groups, public_groups } = r;
    groups.forEach((group) => db.addGroup(group));
    public_groups.forEach((group) => db.addGroup(group));
    return r;
  }, [gatzClient]);

  const router = useDebouncedRouter();

  const onPressGroupAvatar = useCallback(
    (groupId: T.Group["id"]) => {
      if (isMobile()) {
        router.push(`/group/${groupId}`);
      } else {
        router.replace(`/groups?gid=${groupId}`);
      }
    },
    [router],
  );

  const groupAdmins: Map<T.Group["id"], Set<T.Contact["id"]>> | undefined =
    useMemo(() => {
      if (result && result.groups) {
        const out = new Map<T.Group["id"], Set<T.Contact["id"]>>();
        result.groups.forEach((g) => out.set(g.id, new Set(g.admins)));
        return out;
      } else {
        return null;
      }
    }, [result && result.groups]);

  const renderGroup = useCallback(
    ({
      item,
      index,
      lastIndex,
    }: {
      onPressAvatar?: (groupId: T.Group["id"]) => void;
      item: T.Group;
      index: number;
      lastIndex: number;
    }) => {
      const isOwner = item.owner === userId;
      const admins = groupAdmins && groupAdmins.get(item.id);
      const isAdmin = admins && admins.has(userId);
      const description = isOwner ? "Owner" : isAdmin ? "Admin" : null;
      return (
        <TouchableOpacityItem onPress={() => onPressGroupAvatar(item.id)}>
          <GroupRow
            lastIndex={lastIndex}
            index={index}
            item={item}
            description={description}
          />
        </TouchableOpacityItem>
      );
    },
    [onPressGroupAvatar, groupAdmins],
  );

  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.primaryText }}>Loading error</Text>
        <Text style={{ color: colors.primaryText }}>
          Please try again later
        </Text>
      </View>
    );
  }

  const { groups, public_groups } = result;

  const sortedGroups: T.Group[] | undefined =
    groups && groups.sort((ga, gb) => ga.name.localeCompare(gb.name));
  const sortedPublicGroups: T.Group[] | undefined =
    public_groups &&
    public_groups.sort((ga, gb) => ga.name.localeCompare(gb.name));

  const filteredGroups: T.Group[] | undefined = sortedGroups
    ? sortedGroups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    : undefined;

  const filteredPublicGroups: T.Group[] | undefined = sortedPublicGroups
    ? sortedPublicGroups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.rowBackground }]}>
      <ScrollView>
        <View style={styles.sections}>
          <View style={styles.section}>
            <View style={{ marginBottom: 18 }}>
              <SearchBar
                placeholder="Search groups"
                onChangeText={setSearchTerm}
              />
            </View>
            {filteredGroups && filteredGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.title, { color: colors.primaryText }]}>
                  Your groups ({filteredGroups.length})
                </Text>
                <View
                  style={[
                    styles.flatListContainer,
                    { backgroundColor: colors.appBackground },
                  ]}
                >
                  <FlatList<T.Group>
                    scrollEnabled={false}
                    keyExtractor={groupKeyExtractor}
                    data={filteredGroups}
                    renderItem={({ item, index }) =>
                      renderGroup({
                        item,
                        index,
                        lastIndex: filteredGroups.length - 1,
                      })
                    }
                  />
                </View>
              </View>
            )}
            {filteredPublicGroups && filteredPublicGroups.length > 0 && (
              <View style={[styles.section]}>
                <Text style={[styles.title, { color: colors.primaryText }]}>
                  Public groups ({filteredPublicGroups.length})
                </Text>
                <Text style={[styles.message, { color: colors.secondaryText }]}>
                  You can join and leave these at any time
                </Text>
                <View
                  style={[
                    styles.flatListContainer,
                    { backgroundColor: colors.appBackground },
                  ]}
                >
                  <FlatList<T.Group>
                    scrollEnabled={false}
                    keyExtractor={groupKeyExtractor}
                    data={filteredPublicGroups}
                    renderItem={({ item, index }) =>
                      renderGroup({
                        item,
                        index,
                        lastIndex: filteredPublicGroups.length - 1,
                      })
                    }
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function GroupsWithHeader() {
  const router = useDebouncedRouter();

  const navToCreateGroup = useCallback(() => {
    router.push("/new-group");
  }, [router.push]);

  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        styles.leftColumn,
        {
          backgroundColor: colors.rowBackground,
          borderRightColor: colors.platformSeparatorDefault,
        },
      ]}
    >
      <UniversalHeader 
        inDrawer 
        onNew={navToCreateGroup}>
        <HeaderTitleWithIcon title="Groups" iconName="chatbubbles-outline" />
      </UniversalHeader>
      <GroupsInner />
    </View>
  );
}

// Component to render group details in desktop mode
function DesktopGroupScreen({ gid, onDesktopClose }: { gid: string; onDesktopClose: () => void }) {
  const { gatzClient } = useContext(ClientContext);
  const { db } = useContext(FrontendDBContext);
  const colors = useThemeColors();
  const analytics = useProductAnalytics();

  useEffect(() => {
    analytics.capture("group.viewed", { group_id: gid });
  }, [analytics, gid]);

  const { result, loading, error } = useAsync(async () => {
    const r = await gatzClient.getGroup(gid);
    if (r.group) {
      db.addGroup(r.group);
    }
    return r;
  }, [gatzClient, gid]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  } else if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.primaryText }}>There was an error</Text>
      </View>
    );
  } else if (result) {
    return <GroupScreen groupResponse={result} onDesktopClose={onDesktopClose} />;
  }
  return null;
}

// Custom layout component for groups
function DesktopGroupLayout({ gid, children, onDesktopClose }: {
  gid: string | undefined;
  children: React.ReactNode;
  onDesktopClose: () => void;
}) {
  const colors = useThemeColors();
  
  // Set initial layout mode based on current width and gid
  const initialLayoutMode = getContentLayoutMode(getWindowWidth(), !!gid);
  const [layoutMode, setLayoutMode] = useState<ContentLayoutMode>(initialLayoutMode);
  
  // Listen for window resize events and update layout mode only when it changes
  useEffect(() => {
    const handleResize = () => {
      const newWidth = getWindowWidth();
      const newLayoutMode = getContentLayoutMode(newWidth, !!gid);
      
      // Only update state if layout mode changed
      if (newLayoutMode !== layoutMode) {
        setLayoutMode(newLayoutMode);
      }
    };

    // Set up event listener
    const subscription = Dimensions.addEventListener('change', handleResize);

    // Clean up event listener
    return () => subscription.remove();
  }, [layoutMode, gid]);
  
  // When gid changes, update layout mode
  useEffect(() => {
    const newLayoutMode = getContentLayoutMode(getWindowWidth(), !!gid);
    if (newLayoutMode !== layoutMode) {
      setLayoutMode(newLayoutMode);
    }
  }, [gid]);

  const isNarrowLayout = layoutMode === "NARROW";
  const isCompactLayout = layoutMode === "COMPACT";
  
  return (
    <View style={[styles.fullRow, { backgroundColor: colors.rowBackground }]}>
      <View style={[
        styles.leftRow,
        { borderColor: colors.platformSeparatorDefault },
        isNarrowLayout && styles.hidden,
        isCompactLayout && styles.compactLeftRow
      ]}>
        {children}
      </View>
      {gid ? (
        <View style={[
          styles.rightRow,
          styles.leftShadow,
          isNarrowLayout && styles.fullWidth
        ]}>
          <DesktopGroupScreen key={gid} gid={gid} onDesktopClose={onDesktopClose} />
        </View>
      ) : null}
    </View>
  );
}

export default function Groups() {
  const params = useLocalSearchParams();
  const gid = params.gid as string | undefined;
  const router = useDebouncedRouter();

  const onDesktopClose = useCallback(() => {
    router.replace("/groups");
  }, [router]);

  if (isMobile()) {
    return <GroupsWithHeader />;
  } else {
    return (
      <DesktopGroupLayout
        gid={gid}
        onDesktopClose={onDesktopClose}
      >
        <GroupsWithHeader />
      </DesktopGroupLayout>
    );
  }
}

const groupKeyExtractor = (item: T.Group) => item.id;

const styles = StyleSheet.create({
  container: { flex: 1 },
  leftColumn: {
    maxWidth: 600,
    borderRightColor: GatzStyles.platformSeparator.backgroundColor,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flatListContainer: {
    borderRadius: 10,
  },
  sectionRow: {
    flex: 1,
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  section: {
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  message: { fontSize: 16, marginBottom: 8 },
  buttonText: { fontSize: 16 },
  sections: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    padding: 20,
  },
  notificationOptions: {
    display: "flex",
    flexDirection: "column",
  },
  // Desktop layout styles
  fullRow: { 
    flexDirection: "row", 
    height: "100%", 
    width: "100%",
  },
  leftRow: { 
    width: "45%", 
    borderRightWidth: 1,
  },
  compactLeftRow: {
    width: "45%",
    minWidth: 500,
  },
  rightRow: { 
    width: "55%", 
    flex: 1 
  },
  fullWidth: { 
    width: "100%" 
  },
  hidden: {
    width: 0,
    overflow: "hidden",
    opacity: 0,
    borderRightWidth: 0
  },
  leftShadow: {
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});
