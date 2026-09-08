import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Content JSON lives outside app/ (content/data). Allow importing it.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
});
