import { execSync } from "node:child_process";

// Production (built from `main` after merge) always applies pending
// migrations. Preview deployments use their own, separate database (never
// production's), so they migrate too — but only when a `DATABASE_URL` is
// configured for the Preview scope on Vercel; otherwise the step is skipped
// and the build goes on. `VERCEL_ENV` is a Vercel-provided variable, unset
// locally.
const env = process.env.VERCEL_ENV;
const shouldMigrate = env === "production" || (env === "preview" && !!process.env.DATABASE_URL);

if (shouldMigrate) {
  execSync("prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`Skipping migrate deploy (VERCEL_ENV=${env ?? "not set"}, DATABASE_URL ${process.env.DATABASE_URL ? "set" : "not set"}).`);
}
