import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/db/schema.prisma",
  migrations: {
    path: "src/db/migrations",
    seed: "tsx src/db/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
