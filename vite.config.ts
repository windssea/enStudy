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
        "**/content/course-release*.json",
        "**/content/courses-*.mjs",
        "**/content/topic-release*.json",
        "**/content/topics-*.mjs",
        "**/content/pattern-release*.json",
        "**/content/patterns-*.mjs",
        "**/packages/server/**",
        "**/migrations/**",
        "**/tests/**",
        "**/scripts/**",
        "**/.wrangler/**",
        "**/.cloudflare/**",
        "**/.git/**",
      ],
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
