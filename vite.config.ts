import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: { CESIUM_BASE_URL: JSON.stringify("/cesium/") },
  build: { chunkSizeWarningLimit: 1100 },
});
