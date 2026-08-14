import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// In production (GitHub Pages) the app is served from /Jackson-Smits/.
// In local dev it stays at the root so `npm run dev` opens cleanly.
export default defineConfig(({ command }) => ({
  plugins: [react()],
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
