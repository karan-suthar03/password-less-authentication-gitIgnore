import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/signup":        { target: "http://localhost:3001", changeOrigin: true },
      "/enroll-device": { target: "http://localhost:3001", changeOrigin: true },
      "/login":         { target: "http://localhost:3001", changeOrigin: true },
      "/logout":        { target: "http://localhost:3001", changeOrigin: true },
      "/auth":          { target: "http://localhost:3001", changeOrigin: true },
      "/new-device":    { target: "http://localhost:3001", changeOrigin: true },
      "/protected":     { target: "http://localhost:3001", changeOrigin: true },
      "/backdoor":      { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
