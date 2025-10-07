import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: "localhost", // Use localhost instead of specific IP
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000", // Backend Laravel
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
});
