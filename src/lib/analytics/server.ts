import "server-only"

import { after } from "next/server"
import { PostHog } from "posthog-node"

import { ORGANIZATION_GROUP, POSTHOG_INGEST_HOST, POSTHOG_KEY } from "./config"

/**
 * The product's milestones, captured on the server when the action has
 * committed — they can't be lost to an ad blocker or a closed tab, and the
 * funnel "signed up → company → statement → reconciliation → payout" reads
 * straight from them.
 */
export type AnalyticsEvent =
  | "user_signed_up"
  | "organization_created"
  | "invitation_accepted"
  | "statement_imported"
  | "reconciliation_confirmed"
  | "manual_settlement_confirmed"
  | "payout_generated"

/**
 * Only counts, kinds and ids — never amounts, names, descriptions or
 * documents. Capi holds third parties' money; none of it goes to analytics.
 */
export type AnalyticsProperties = Record<string, string | number | boolean | null>

type Actor = { userId: string; organizationId?: string }

/**
 * Sends the event after the response is out (Next's `after`), so it never
 * slows down or fails the action. No-op without NEXT_PUBLIC_POSTHOG_KEY.
 */
export function track(actor: Actor, event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  if (!POSTHOG_KEY) return

  after(async () => {
    // One short-lived client per event: serverless functions may freeze
    // right after the response, so nothing is left in a buffer.
    const client = new PostHog(POSTHOG_KEY, { host: POSTHOG_INGEST_HOST, flushAt: 1, flushInterval: 0 })
    try {
      client.capture({
        distinctId: actor.userId,
        event,
        properties,
        groups: actor.organizationId ? { [ORGANIZATION_GROUP]: actor.organizationId } : undefined,
      })
      await client.shutdown()
    } catch (error) {
      console.error(`PostHog: failed to send ${event}`, error)
    }
  })
}
