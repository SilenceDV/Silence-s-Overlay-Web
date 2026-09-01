import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "jsdom" }, resolve: { alias: { "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"), "@": path.resolve(import.meta.dirname, ".") } } });

