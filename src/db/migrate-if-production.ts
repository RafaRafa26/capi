import { execSync } from "node:child_process";

// Preview and Development deployments on Vercel don't carry production
// database credentials — deliberately, so a PR's build can never run
// pending migrations against production data before it's reviewed and
// merged. Only the Production deployment (built from `main` after merge)
// applies them. `VERCEL_ENV` is a Vercel-provided variable, unset locally.
if (process.env.VERCEL_ENV === "production") {
  execSync("prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`Skipping migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "not set"}).`);
}
