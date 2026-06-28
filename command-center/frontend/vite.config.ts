import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "AG OS Command Center",
        short_name: "AG OS",
        description: "Multi-agent command surface for Agent OS (MAFMOS).",
        theme_color: "#0e0c0a",
        background_color: "#0e0c0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/127\.0\.0\.1:8787\/api\/snapshot$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "agos-snapshot",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
