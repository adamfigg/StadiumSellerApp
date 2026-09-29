import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into ./drizzle from src/db/schema.ts. The app applies them on startup.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
