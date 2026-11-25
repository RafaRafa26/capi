"use client"

import posthog from "posthog-js"
import * as React from "react"

import { ORGANIZATION_GROUP, POSTHOG_KEY } from "@/lib/analytics/config"

type Props = {
  userId: string
  name: string
  email: string
  /** Absent outside a company (e.g. the company picker). */
  organization?: { id: string; name: string; role: string }
}

// Ties the browser's events to the signed-in user and to the company open in
// this tab, and starts the session replay (see src/instrumentation-client.ts).
// Only the user's own name and e-mail and the company's name are sent —
// never the CNPJ or anything from inside the company.
export function AnalyticsIdentify({ userId, name, email, organization }: Props) {
  const organizationId = organization?.id
  const organizationName = organization?.name
  const role = organization?.role

  React.useEffect(() => {
    if (!POSTHOG_KEY) return

    // Another person signed in on this browser: start a fresh profile
    // instead of merging the two.
    if (posthog.get_distinct_id() !== userId && posthog.get_property("$user_state") === "identified") {
      posthog.reset()
    }
    posthog.identify(userId, { name, email })

    if (organizationId) {
      posthog.group(ORGANIZATION_GROUP, organizationId, { name: organizationName })
      posthog.register({ role })
      if (!posthog.sessionRecordingStarted()) posthog.startSessionRecording()
    }
  }, [userId, name, email, organizationId, organizationName, role])

  return null
}

/** For sign-in and sign-up screens: whoever was signed in before is gone. */
export function AnalyticsReset() {
  React.useEffect(() => {
    if (POSTHOG_KEY && posthog.get_property("$user_state") === "identified") posthog.reset()
  }, [])

  return null
}
