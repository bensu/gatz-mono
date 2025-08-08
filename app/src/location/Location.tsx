import { ScrollView, StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, Platform } from "react-native";

import * as T from "../gatz/types";

import { useThemeColors } from "../gifted/hooks/useThemeColors";
import { AirPodsBottomSheet } from "../components/AirPodsBottomSheet"
import { useCallback, useMemo, useState } from "react";
import { FrontendDB } from "../context/FrontendDB";
import { Participants } from "../components/Participants";
import { SimpleBottomSheet } from "../components/BottomSheet";
import { MaterialIcons } from "@expo/vector-icons";

// DB

import SELECTED_METROS from "./selected_metros.json";

const SHORTLIST_METROS = [
  "US/SFO",
  "US/NYC",
  "US/MIA",
  "US/SEA",
  "US/LAX",
]

const makeLocationsDb = (metros: Record<string, string>): Record<string, T.Location> => {
  return Object.entries(metros).reduce((acc, [id, name]) => {
    acc[id] = { id, name };
    return acc;
  }, {} as Record<string, T.Location>);
}

const LOCATIONS = makeLocationsDb(SELECTED_METROS);

export const getLocation = (location: string): T.Location | undefined => {
  return LOCATIONS[location];
}

const getCountryCodeFromId = (id: string): string => {
  return id.split("/")[0];
}


const LocationTitle = ({ locationResponse }: { locationResponse: T.NewLocationResponse }) => {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <MaterialIcons name="place" size={24} color={colors.primaryText} />
      <Text style={[styles.locationTitle, { color: colors.primaryText }]}>
        New city: {locationResponse.location.name}
      </Text>
    </View>
  )
}

const LocationDescription = ({ db, locationResponse }: { db: FrontendDB, locationResponse: T.NewLocationResponse }) => {
  const colors = useThemeColors();

  const { friends, friends_of_friends } = locationResponse.in_common;

  const friendsInCommon: T.Contact[] = useMemo(() => {
    return friends.map((id) => db.getUserById(id));
  }, [db, friends]);

  const friendsOfFriendsInCommon: T.Contact[] = useMemo(() => {
    return friends_of_friends.map((id) => db.getUserById(id));
  }, [db, friends_of_friends]);


  return (
    <View>
      <Text style={[styles.locationDescription, { color: colors.secondaryText }]}>
        We detected you are in a new city. Do you want to tell your friends about it?
      </Text>
      {friendsInCommon.length > 0 && (
        <View style={styles.innerRow}>
          <Text style={[styles.cardText, { color: colors.primaryText }]}>
            You have {friendsInCommon.length} friend{friendsInCommon.length > 1 && "s"} here
          </Text>
          <Participants size="tiny" users={friendsInCommon} />
        </View>
      )}
      {friendsOfFriendsInCommon.length > 0 && (
        <View style={styles.innerRow}>
          <Text style={[styles.cardText, { color: colors.primaryText }]}>
            You have {friendsOfFriendsInCommon.length} friend{friendsOfFriendsInCommon.length > 1 && "s"} of friends here
          </Text>
          <Participants size="tiny" users={friendsOfFriendsInCommon} />
        </View>
      )}
    </View>
  )
}

export const LocationPermissionRequest = ({
  visible,
  onClose,
  onAction,
}: {
  visible: boolean,
  onClose: () => void,
  onAction: () => void
}) => {

  const colors = useThemeColors();

  return (
    <AirPodsBottomSheet
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="place" size={24} color={colors.primaryText} />
          <Text style={[styles.locationTitle, { color: colors.primaryText }]}>
            Share your city with friends?
          </Text>
        </View>
      }
      description={
        <View>
          <Text style={[styles.locationDescription, { color: colors.secondaryText }]}>
            You can add your current city to posts:
          </Text>
          <Text style={[styles.locationDescription, { color: colors.secondaryText, marginTop: 8 }]}>
            • Only city-level location is shared, never precise
          </Text>
          <Text style={[styles.locationDescription, { color: colors.secondaryText, marginTop: 4 }]}>
            • You have to explicitly add the city
          </Text>
          <Text style={[styles.locationDescription, { color: colors.secondaryText, marginTop: 8 }]}>
            You can change this permission anytime in settings.
          </Text>
        </View>
      }
      actionButtonText="Allow location access"
      onAction={onAction}
      onClose={onClose}
      visible={visible}
    />
  );
};

export const LocationButtonModal = ({
  db,
  locationResponse,
  visible,
  onClose,
  onAction,
}: {
  db: FrontendDB,
  locationResponse: T.NewLocationResponse,
  visible: boolean,
  onClose: () => void,
  onAction: () => void
}) => {
  console.log("locationResponse", locationResponse);
  return (
    <AirPodsBottomSheet
      title={<LocationTitle locationResponse={locationResponse} />}
      description={<LocationDescription db={db} locationResponse={locationResponse} />}
      actionButtonText="Make a post with your city"
      onAction={onAction}
      onClose={onClose}
      visible={visible}
    />
  );
}

export const InLocation = ({ location }: { location: T.Location }) => {
  const colors = useThemeColors();
  const fontSize = 16;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} testID="location-tag">
      <Text style={[styles.locationText, { fontSize, color: colors.secondaryText }]}>
        in
      </Text>
      <MaterialIcons name="place" size={16} color={colors.secondaryText} />
      <Text style={[styles.locationText, styles.bold, { fontSize, color: colors.primaryText }]}>{location.name}</Text>
    </View>
  );
};


type LocationSelectionScreenProps = {
  onSelect: (location: T.Location | null) => void;
  scrollEnabled: boolean;
};

export const LocationSelectionScreen = ({ onSelect, scrollEnabled = false }: LocationSelectionScreenProps) => {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState("");

  // sort locations by name
  const shortListedLocations = useMemo(() => SHORTLIST_METROS.map((id) => LOCATIONS[id]), []);

  const locations = useMemo(() => Object.values(LOCATIONS)
    .filter((location) => !SHORTLIST_METROS.includes(location.id))
    .sort((a, b) => a.name.localeCompare(b.name)
    ), []);

  const filteredShortListLocations = useMemo(() => {
    if (!searchQuery.trim()) return shortListedLocations;
    const query = searchQuery.toLowerCase();
    return shortListedLocations.filter(location =>
      location.name.toLowerCase().includes(query)
    );
  }, [shortListedLocations, searchQuery]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(location =>
      location.name.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const renderItem = useCallback(({ item, index, lastIndex }: { item: T.Location, index: number, lastIndex: number }) => {
    const location = item;
    const isLast = index === lastIndex;
    return (
      <TouchableOpacity
        key={location.id}
        style={[
          isLast ? styles.lastRow : styles.locationRow, 
          { 
            backgroundColor: colors.appBackground,
            borderBottomColor: colors.midGrey
          }
        ]}
        onPress={() => onSelect(location)}
      >
        <Text style={[styles.locationText, { color: colors.primaryText }]}>
          {location.name}, {getCountryCodeFromId(location.id)}
        </Text>
      </TouchableOpacity>
    );
  }, [colors, onSelect]);

  return (
    <View style={[styles.innerContainer, { backgroundColor: colors.rowBackground, flex: 1 }]}>
      {Platform.OS !== "android" && (
        <View style={[styles.searchContainer, { backgroundColor: colors.appBackground, marginBottom: 12 }]}>
          <MaterialIcons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="Search cities..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <ScrollView style={[styles.flatListContainer, { flex: 1 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground, marginBottom: 12 }]}>
          <TouchableOpacity
            style={[styles.lastRow, { backgroundColor: colors.appBackground }]}
            onPress={() => onSelect(null)}
          >
            <Text style={[styles.locationText, { color: colors.primaryText }]}>
              No City
            </Text>
          </TouchableOpacity>
        </View>

        {filteredShortListLocations.length > 0 && (
          <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground, marginBottom: 12 }]}>
            {filteredShortListLocations.map((location, index) => 
              renderItem({ item: location, index, lastIndex: filteredShortListLocations.length - 1 })
            )}
          </View>
        )}

        {filteredLocations.length > 0 && (
          <View style={[styles.flatListContainer, { backgroundColor: colors.appBackground }]}>
            {filteredLocations.map((location, index) => 
              renderItem({ item: location, index, lastIndex: filteredLocations.length - 1 })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export const LocationSelectionSheet = (props: LocationSelectionScreenProps & { visible: boolean, onClose: () => void }) => {
  const { visible, onClose } = props;
  return (
    <SimpleBottomSheet isVisible={visible} onClose={onClose} title="Select City">
      <LocationSelectionScreen {...props} />
    </SimpleBottomSheet>
  )
}

export const CityHeader = ({ location }: { location: T.Location }) => {
  const colors = useThemeColors();
  return (
    <View style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <MaterialIcons name="place" size={24} color={colors.primaryText} />
      <Text style={[styles.locationTitle, { color: colors.primaryText }]}>
        {location.name}
      </Text>
    </View>
  )
}


const styles = StyleSheet.create({
  locationTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  locationDescription: {
    fontSize: 16,
    textAlign: "left",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  cardText: { fontSize: 16, lineHeight: 20 },
  lastRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  locationRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationText: {
    fontSize: 16,
  },
  innerContainer: {
    borderRadius: 10,
    overflow: "hidden",
  },
  flatListContainer: {
    borderRadius: 10,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  bold: { fontWeight: "600" },
});

