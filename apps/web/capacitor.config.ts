import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.presenxa.app",
  appName: "Presenxa",
  webDir: "public",
  server: {
    // Apunta a la app de producción desplegada en Vercel para sincronización en tiempo real
    url: process.env.CAPACITOR_SERVER_URL || "https://presenxa-web.vercel.app/app",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#102A43",
    buildOptions: {
      keystorePath: undefined,
      releaseType: "APK",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#102A43",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
  },
};

export default config;
