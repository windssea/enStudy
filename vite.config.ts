import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "english-quest-offline-shell",
      enforce: "post",
      generateBundle(_, bundle) {
        const assets = [
          "/index.html",
          ...Object.keys(bundle)
            .filter((name) => /\.(js|css)$/.test(name))
            .map((name) => `/${name}`),
        ].sort();
        const hash = createHash("sha256")
          .update(JSON.stringify(assets))
          .digest("hex")
          .slice(0, 16);
        this.emitFile({
          type: "asset",
          fileName: "offline-shell.json",
          source: JSON.stringify({
            schema: 1,
            cacheKey: `eq-shell-v1-${hash}`,
            assets,
          }),
        });
      },
    },
  ],
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
        "**/content/course-expansion*.json",
        "**/content/courses-*.mjs",
        "**/content/topic-release*.json",
        "**/content/topics-*.mjs",
        "**/content/pattern-release*.json",
        "**/content/patterns-*.mjs",
        "**/content/vocabulary-release*.json",
        "**/content/vocabulary-*.mjs",
        "**/packages/server/**",
        "**/migrations/**",
        "**/tests/**",
        "**/scripts/**",
        "**/content/workshops-v1.mjs",
        "**/content/workshop-release*.json",
        "**/content/story-course-release*.json",
        "**/content/story-courses*.mjs",
        "**/content/word-listening-release*.json",
        "**/content/concept-exposure-map.json",
        "**/content/action-courses*.json",
        "**/content/action-course-release*.json",
        "**/content/discovery-courses*.mjs",
        "**/content/discovery-course-release*.json",
        "**/content/journey-courses*.mjs",
        "**/content/journey-course-release*.json",
        "**/.wrangler/**",
        "**/.cloudflare/**",
        "**/.git/**",
      ],
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
