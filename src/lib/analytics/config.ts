// PostHog settings shared by the browser (src/instrumentation-client.ts), the
// server (./server.ts) and the /ingest rewrite in next.config.ts. No
// "server-only": the browser bundle imports it too.
//
// Analytics is off unless NEXT_PUBLIC_POSTHOG_KEY is set — local dev and
// tests send nothing. The key is a public project token, not a secret.

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""

/** "eu" (default, Frankfurt) or "us" — must match the PostHog project's region. */
const REGION = process.env.NEXT_PUBLIC_POSTHOG_REGION === "us" ? "us" : "eu"

export const POSTHOG_INGEST_HOST = `https://${REGION}.i.posthog.com`
export const POSTHOG_ASSETS_HOST = `https://${REGION}-assets.i.posthog.com`
export const POSTHOG_UI_HOST = `https://${REGION}.posthog.com`

/**
 * Same-origin path the browser sends events to; next.config.ts rewrites it
 * to PostHog. Ad blockers drop requests to *.posthog.com, not to our domain.
 */
export const POSTHOG_PROXY_PATH = "/ingest"

/** PostHog group type for organizations — one per Capi company. */
export const ORGANIZATION_GROUP = "organization"
