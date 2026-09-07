import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Database tests share a single Postgres; running files in parallel
    // would have one truncate the other's data mid-run.
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/db/__tests__/load-env.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/db/__tests__/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
