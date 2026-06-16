import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const frontendSrc = path.resolve(rootDir, "../frontend/src");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  vite: {
    resolve: {
      alias: {
        "@": frontendSrc,
        "@cais/ui": frontendSrc,
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api/v1": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  },
});
