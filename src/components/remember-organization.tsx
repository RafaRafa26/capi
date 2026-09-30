"use client"

import * as React from "react"

import { LAST_ORGANIZATION_COOKIE } from "@/modules/auth/constants"

// Remembers the company open in this tab so "/" can return to it. Done here,
// on mount, rather than in the proxy: <Link> prefetches of other companies
// also pass through the proxy, and it can't tell them apart from a visit.
// Not httpOnly on purpose — it's only a preference, and "/" still checks the
// membership before redirecting.
export function RememberOrganization({ organizationId }: { organizationId: string }) {
  React.useEffect(() => {
    document.cookie = `${LAST_ORGANIZATION_COOKIE}=${organizationId}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`
  }, [organizationId])

  return null
}
