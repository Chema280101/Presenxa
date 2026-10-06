import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["src/**/*.test.ts", "node_modules"],
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@asistencias/db": path.resolve(__dirname, "./src/__mocks__/db.ts"),
    },
  },
});
