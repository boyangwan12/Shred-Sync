import { defineConfig } from "prisma/config";

// Prisma Config — used by `prisma generate` and `prisma migrate`.
// At runtime, the actual DB connection is provided by the driver adapter
// in src/lib/db.ts (better-sqlite3 locally, LibSQL/Turso in production),
// so no datasource.url is required here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
