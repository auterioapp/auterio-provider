module.exports = {
  expo: {
    name: "AuterioPro",
    slug: "auterio-provider",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
      },
    },
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
        },
      },
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Auterio Pro uses your location to share your live position with the customer while you're en route.",
        },
      ],
      [
        "expo-image-picker",
        {
          cameraPermission: "Auterio Pro uses your camera to take required job photos.",
          photosPermission: "Auterio Pro accesses your photos to attach them to a job.",
        },
      ],
    ],
  },
};
