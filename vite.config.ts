import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8788" },
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.dev.vars*",
        "**/content/exercises.json",
        "**/packages/server/**",
        "**/.wrangler/**",
        "**/.cloudflare/**",
        "**/.git/**",
      ],
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
