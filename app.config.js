import 'dotenv/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  name: IS_DEV ? "ziblify (Dev)" : "ziblify",
  slug: "ziblify",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/logo.png",
  scheme: "ziblify",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/logo.png",
      backgroundImage: "./assets/images/logo.png",
      monochromeImage: "./assets/images/logo.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    googleServicesFile: IS_DEV ? "./google-services.json" : "./google-services.json",
    package: IS_DEV ? "com.ziblify.dev" : "com.achchiraj.ziblify",
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "cover",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    PROJECT_ID: process.env.PROJECT_ID,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.MESSAGING_SENDER_ID,
    APP_ID: process.env.APP_ID,
    DATABASE_URL: process.env.DATABASE_URL,
    SERVER_BASE_URL: process.env.SERVER_BASE_URL,
    router: {},
    eas: {
      projectId: "651e6bbe-b639-47f5-8e6f-6fe412c73b8d",
    },
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/651e6bbe-b639-47f5-8e6f-6fe412c73b8d",
  },
};
