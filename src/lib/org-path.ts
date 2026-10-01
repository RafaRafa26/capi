// Every organization screen lives under /o/<organizationId>/..., so two tabs
// can have two different companies open at the same time.

const ORG_PREFIX = /^\/o\/[^/]+/

export function orgPath(organizationId: string, path: string): string {
  return `/o/${organizationId}${path.startsWith("/") ? path : `/${path}`}`
}

/** "/o/<id>/contacts" → "/contacts"; paths outside an organization come back as-is. */
export function stripOrgPrefix(pathname: string): string {
  return pathname.replace(ORG_PREFIX, "") || "/"
}

/**
 * Where to send the user after login/sign-up. Only same-site relative paths
 * are accepted, so `?next=` can't be used to bounce someone to another site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null
  return next
}
