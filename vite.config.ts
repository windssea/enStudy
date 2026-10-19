import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import childGuides from "./public/content/child-guides.v2.json" with { type: "json" };
import pictureMedia from "./public/content/picture-words.v1.json" with { type: "json" };
import clayArt from "./public/content/clay-art.v1.json" with { type: "json" };
export default defineConfig({
  assetsInclude: ["**/*.glb"],
  plugins: [
    react(),
    {
      name: "english-quest-offline-shell",
      enforce: "post",
      generateBundle(_, bundle) {
        const assets = [
          "/index.html",
          ...childGuides.items.map((row) => row.url),
          ...pictureMedia.words.map((row) => row.audioUrl),
          ...pictureMedia.atlases.map((row) => row.url),
          ...Object.values(clayArt.assets).map((row) => row.url),
          ...Object.keys(bundle)
            .filter((name) => /\.(js|css|glb)$/.test(name))
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
        "**/content/training-reserved-release*.json",
        "**/content/training-reserved-*.mjs",
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
        "**/content/picture-word-release*.json",
        "**/content/concept-exposure-map.json",
        "**/content/action-courses*.json",
        "**/content/action-course-release*.json",
        "**/content/discovery-courses*.mjs",
        "**/content/discovery-course-release*.json",
        "**/content/journey-courses*.mjs",
        "**/content/journey-course-release*.json",
        "**/content/next-term-courses*.mjs",
        "**/content/next-term-course-release*.json",
        "**/content/explorer-term-courses*.mjs",
        "**/content/explorer-term-course-release*.json",
        "**/content/neighbourhood-term-courses*.mjs",
        "**/content/neighbourhood-term-course-release*.json",
        "**/content/cooperation-term-courses*.mjs",
        "**/content/cooperation-term-course-release*.json",
        "**/content/practical-term-courses*.mjs",
        "**/content/practical-term-course-release*.json",
        "**/content/portfolio-term-courses*.mjs",
        "**/content/portfolio-term-course-release*.json",
        "**/content/phonics-v*.mjs",
        "**/content/phonics-release*.json",
        "**/.wrangler/**",
        "**/.cloudflare/**",
        "**/.git/**",
      ],
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
