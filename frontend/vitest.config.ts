import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      environmentOptions: {
        jsdom: {
          url: "http://localhost:3000/",
        },
      },
      setupFiles: "./src/test/setup.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "json-summary"],
        include: ["src/**/*"],
        exclude: [
          "src/main.tsx",
          "src/vite-env.d.ts",
          "**/*.test.tsx",
          "**/*.test.ts",
        ],
        thresholds: {
          lines: 75,
          functions: 75,
          branches: 70,
          statements: 75,
        },
      },
    },
  }),
);
