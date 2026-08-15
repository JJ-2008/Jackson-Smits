import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// In production (GitHub Pages) the app is served from /Jackson-Smits/.
// In local dev it stays at the root so `npm run dev` opens cleanly.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Cut — Nutrition & Cutting Tracker",
        short_name: "Cut",
        description: "Daily nutrition & cutting tracker with macros, barcode scanning and exercise.",
        theme_color: "#0b0d12",
        background_color: "#0b0d12",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
  base: command === "build" ? "/Jackson-Smits/" : "/",
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: "node",
  },
}));
