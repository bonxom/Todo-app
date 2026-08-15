import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
  resolve: {
    alias: {
      "@": sourceRoot,
    },
  },
});
