// Capacitor configuration for Android (.aab) and iOS (.ipa) builds
// Run: npm run build && npx cap sync
const config = {
  appId: "com.ziondigital.wafulareads",
  appName: "Zion Digital",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
  },
};

export default config;
