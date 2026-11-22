// Pure OAuth 2.1 rules — no I/O (ARQUITETURA.md §8.2).

import { createHash, timingSafeEqual } from "node:crypto"

export const AUTHORIZATION_CODE_SECONDS = 5 * 60
export const ACCESS_TOKEN_SECONDS = 60 * 60
export const REFRESH_TOKEN_DAYS = 30

/**
 * What a grant lets the client do. Only "read" exists for now: the MCP
 * exposes read-only tools. Write tools will come with a "write" scope, which
 * the person has to consent to again — an old read grant never silently
 * starts writing.
 */
export const SUPPORTED_SCOPES = ["read"] as const
export type Scope = (typeof SUPPORTED_SCOPES)[number]
export const DEFAULT_SCOPE: Scope = "read"

/**
 * Whatever the client asks for, the grant is narrowed to the scopes we know.
 * Asking for nothing (claude.ai usually does) gets the default.
 */
export function normalizeScope(requested: string | null | undefined): string {
  const asked = (requested ?? "").split(/\s+/).filter(Boolean)
  const known = asked.filter((scope): scope is Scope => (SUPPORTED_SCOPES as readonly string[]).includes(scope))
  return (known.length > 0 ? known : [DEFAULT_SCOPE]).join(" ")
}

/** PKCE S256 (RFC 7636): BASE64URL(SHA256(verifier)) must equal the stored challenge. */
export function pkceMatches(codeVerifier: string, codeChallenge: string): boolean {
  // RFC 7636 §4.1: 43–128 characters from the unreserved set.
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier)) return false
  const computed = Buffer.from(createHash("sha256").update(codeVerifier).digest("base64url"))
  const expected = Buffer.from(codeChallenge)
  return computed.length === expected.length && timingSafeEqual(computed, expected)
}

/** A challenge is the base64url of a SHA-256 digest: exactly 43 characters. */
export function isValidCodeChallenge(challenge: string | null | undefined): challenge is string {
  return typeof challenge === "string" && /^[A-Za-z0-9\-_]{43}$/.test(challenge)
}

/**
 * Which redirect URIs a client may register. Open registration (DCR) would
 * otherwise let anyone create a "Claude"-looking client that sends a
 * person's code to their own site — so only the hosts in the allowlist
 * (claude.ai and claude.com by default) are accepted over HTTPS, plus
 * loopback over HTTP for local development tools (RFC 8252 §7.3).
 */
export function isAllowedRedirectUri(uri: string, allowedHosts: readonly string[]): boolean {
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return false
  }
  if (url.hash) return false
  if (url.protocol === "http:") return url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (url.protocol !== "https:") return false
  return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
}

export function parseAllowedHosts(value: string | undefined): string[] {
  const hosts = (value ?? "claude.ai,claude.com")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  return hosts
}
