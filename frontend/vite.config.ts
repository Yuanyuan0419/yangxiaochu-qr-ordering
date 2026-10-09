import { networkInterfaces } from "node:os";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** First private IPv4 address, so QR codes generated on a desktop browser still open on a phone. */
function lanAddress(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

const API_TARGET = process.env.API_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  define: { __LAN_HOST__: JSON.stringify(lanAddress()) },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // xfwd adds X-Forwarded-For so the API sees each phone's real IP (rate limits are per device, not per proxy).
      "/api": { target: API_TARGET, changeOrigin: false, xfwd: true },
      "/uploads": { target: API_TARGET, changeOrigin: false, xfwd: true },
    },
  },
  preview: { host: true, port: 4173 },
});
