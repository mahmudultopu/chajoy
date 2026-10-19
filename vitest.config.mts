import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // keep the cache out of the project so the Next.js dev server doesn't watch it
  cacheDir: path.join(os.tmpdir(), "chajoy-vitest"),
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { DATABASE_URL: "pglite://memory", TZ: "UTC" },
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
