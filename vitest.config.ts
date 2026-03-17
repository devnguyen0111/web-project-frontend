import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["lib/__tests__/**/*.test.[jt]s?(x)"],
    environment: "node",
    globals: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@/": `${resolve(__dirname, "./")}/`,
    },
  },
});
