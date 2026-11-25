// URLs leave the app inside every analytics event. Some carry things that
// must not: the invitation token in /invite/<token> (a credential), the
// e-mail in /signup?email=..., OAuth state and codes in /oauth/authorize?...
// Query strings and fragments are dropped wholesale — the pages that use
// them for filters lose nothing that matters for product analytics — and
// path segments that are secrets are replaced by a placeholder.

const SECRET_SEGMENTS: [RegExp, string][] = [[/^(\/invite\/)[^/]+/, "$1:token"]]

/** Properties posthog-js fills with a URL or a path. */
const URL_PROPERTIES = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$prev_pageview_pathname",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$session_entry_url",
  "$session_entry_pathname",
  "$session_entry_referrer",
] as const

function sanitizePath(path: string): string {
  return SECRET_SEGMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), path)
}

/** An absolute URL or a bare path, without query, fragment or secret segments. */
export function sanitizeUrl(value: string): string {
  if (value.startsWith("/")) return sanitizePath(value.split(/[?#]/, 1)[0])

  try {
    const url = new URL(value)
    return `${url.origin}${sanitizePath(url.pathname)}`
  } catch {
    // "$direct" and other non-URL markers pass through.
    return value
  }
}

type Properties = Record<string, unknown> | undefined

function sanitizeProperties(properties: Properties): void {
  if (!properties) return
  for (const key of URL_PROPERTIES) {
    const value = properties[key]
    if (typeof value === "string") properties[key] = sanitizeUrl(value)
  }
}

/** Rewrites, in place, every URL property of an event and of its $set/$set_once. */
export function sanitizeEvent<T extends { properties?: Properties; $set?: Properties; $set_once?: Properties }>(
  event: T,
): T {
  sanitizeProperties(event.properties)
  sanitizeProperties(event.$set)
  sanitizeProperties(event.$set_once)
  sanitizeProperties(event.properties?.$set as Properties)
  sanitizeProperties(event.properties?.$set_once as Properties)
  return event
}
