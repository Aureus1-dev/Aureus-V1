import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Admin bootstrap (PR-002) — idempotent, no-ops unless
    // BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD are set. Lives under
    // apps/api so it resolves apps/api's own dependencies (pg, adapter-pg,
    // bcryptjs) via normal Node module resolution from its own directory.
    seed: "tsx apps/api/prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
