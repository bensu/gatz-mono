export default {
  expo: {
    newArchEnabled: true,
    owner: "sbensu",
    name: "gatz.chat",
    slug: "gatz",
    version: "1.1.41",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    experiments: {
      tsconfigPaths: true,
    },
    splash: {
      image: "./assets/img/gentleman_centered_background.png",
      resizeMode: "cover",
      backgroundColor: "#3D5135",
    },
    assetBundlePatterns: ["**/*", "assets/**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "chat.gatz",
      associatedDomains: ["applinks:gatz.chat"],
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIStatusBarStyle: "UIStatusBarStyleAutomatic", // Ensures it adapts to theme
      },
    },
    android: {
      versionCode: 134,
      adaptiveIcon: {
        foregroundImage: "./assets/google_play_icon.png",
        backgroundColor: "#3D5135",
      },
      package: "chat.gatz",
      softwareKeyboardLayoutMode: "resize",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            {
              scheme: "https",
              host: "gatz.chat",
              pathPrefix: "/",
            },
            { scheme: "chat.gatz" },
          ],
        },
      ],
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            kotlinVersion: "1.9.25",
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: "35.0.0",
          },
        },
      ],
      "expo-router",
      "expo-font",
      "expo-localization",
      "expo-video",
      "expo-audio",
      "expo-document-picker",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#3D5135",
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow access to save and view photos.",
          savePhotosPermission: "Allow saving photos to your gallery.",
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "To share your city with friends, we need access to your location. You can change this anytime in settings.",
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "This allows you to send photos in your messages and upload your avatar.",
          cameraPermission:
            "This allows you to take photos for messages and your avatar.",
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.848893561159-sis9lh5251nnij27d8mc6iav49pbh3gj",
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          organization: "gatz",
          project: "app",
          url: "https://sentry.io/",
        },
      ]
    ],
    scheme: "chat.gatz",
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "be633365-719e-4fab-bfda-ced010b5613a",
      },
    },
    updates: {
      url: "https://u.expo.dev/be633365-719e-4fab-bfda-ced010b5613a",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
};
