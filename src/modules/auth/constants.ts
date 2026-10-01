// Shared between the proxy (src/proxy.ts) and the server-side session code.
// No "server-only" here: the proxy bundles separately and must import it.

export const SESSION_COOKIE = "capi_session"

/**
 * Set by the proxy from the URL (/o/<organizationId>/...) on every request,
 * pages and server actions alike — a server action is a POST to the page
 * that calls it, so it carries the organization of the tab it came from.
 * The proxy always drops any client-sent value first. It only says which
 * organization the request is *about*; access is still checked against the
 * user's membership on every request (src/modules/auth/session.ts).
 */
export const ORGANIZATION_HEADER = "x-capi-organization"

/** Last organization opened, so "/" can send the user back to it. */
export const LAST_ORGANIZATION_COOKIE = "capi_last_org"

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
