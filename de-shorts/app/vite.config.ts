import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Content JSON lives outside app/ (content/data). Allow importing it.
// The PWA makes the app installable to the home screen (standalone, offline).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "DE Shorts — Data Engineering",
        short_name: "DE Shorts",
        description: "Swipe-to-learn data engineering. Spaced repetition, offline.",
        theme_color: "#0b0b0c",
        background_color: "#0b0b0c",
        display: "standalone",
        orientation: "portrait",
        // start_url/scope are resolved relative to Vite `base` at build time.
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/\?probe=/], // never cache the render-gate probe route
      },
    }),
  ],
  server: { fs: { allow: [".."] } },
});
