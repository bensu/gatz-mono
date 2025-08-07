import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export const useLocationPermission = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestLocationPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Required",
          "To share your city with friends, we need access to your location. You can change this anytime in settings.",
          [
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
            { text: "Cancel", style: "cancel" },
          ],
          { cancelable: true }
        );
        return false;
      }
      return true;
    } catch (e) {
      setError(e as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      // return geocode?.city || null;
      return {
        ...location,
        geocode: geocode
      }
    } catch (e) {
      setError(e as Error);
      return null;
    }
  }, []);

  return {
    requestLocationPermission,
    getLocation,
    isLoading,
    error,
  };
};

// TODO: I probably can't depend on their subregion to be uniform across all devices
// One might have Miami-Dade County, another might have Miami Date County and that is
// enough to break the matching logic

// Postal codes might also do it

const EXAMPLE_IOS_LOCATION = {
  "coords": {
    "accuracy": 9.325018494930474, "altitude": 8.543164006616301,
    "altitudeAccuracy": 29.99999999999999, "heading": -1,
    "latitude": 25.779686681100475, "longitude": -80.13539058392104, "speed": -1
  },
  "geocode": {
    "city": "Miami Beach",
    "country": "United States",
    "district": "Flamingo/Lummus",
    "isoCountryCode": "US",
    "name": "912 Euclid Ave",
    "postalCode": "33139",
    "region": "FL", "street": "Euclid Ave",
    "streetNumber": "912",
    "subregion": "Miami-Dade County", // TODO: this what I think of as the city
    "timezone": "America/New_York"
  },
  "timestamp": 1742576533722.24
}

const EXAMPLE_ANDROID_LOCATION = {
  "coords": {
    "accuracy": 100,
    "altitude": -25.299999237060547,
    "altitudeAccuracy": 32.26689910888672,
    "heading": 0, "latitude": 25.7796939, "longitude": -80.1352363,
    "speed": 0
  },
  "geocode": {
    "city": "Miami Beach",
    "country": "United States",
    "district": null,
    "formattedAddress": "912 Euclid Ave, Miami Beach, FL 33139, USA",
    "isoCountryCode": "US", "name": "912", "postalCode": "33139",
    "region": "Florida", "street": "Euclid Avenue",
    "streetNumber": "912",
    "subregion": "Miami-Dade County",
    "timezone": null
  },
  "mocked": false,
  "timestamp": 1742577315288
}