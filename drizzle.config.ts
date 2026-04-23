import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.CODENCE_DB_PATH ?? "~/.codence/data.db",
  },
});
