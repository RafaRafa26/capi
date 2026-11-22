import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"

import { isAllowedRedirectUri, isValidCodeChallenge, normalizeScope, parseAllowedHosts, pkceMatches } from "./domain"

const verifier = "dBjftJeZ4CVP-mJ92K-1-6yYz1nx2GHk7wZ0gZ8mPF0-extra-chars"
const challenge = createHash("sha256").update(verifier).digest("base64url")

describe("oauth domain", () => {
  it("accepts the PKCE verifier that produced the challenge, and nothing else", () => {
    expect(isValidCodeChallenge(challenge)).toBe(true)
    expect(pkceMatches(verifier, challenge)).toBe(true)
    expect(pkceMatches(`${verifier}x`, challenge)).toBe(false)
    expect(pkceMatches("short", challenge)).toBe(false)
  })

  it("only allows redirects to the allowlisted hosts over HTTPS, or loopback", () => {
    const hosts = parseAllowedHosts(undefined)
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback", hosts)).toBe(true)
    expect(isAllowedRedirectUri("https://claude.com/api/mcp/auth_callback", hosts)).toBe(true)
    expect(isAllowedRedirectUri("http://localhost:6274/oauth/callback", hosts)).toBe(true)
    expect(isAllowedRedirectUri("http://claude.ai/callback", hosts)).toBe(false)
    expect(isAllowedRedirectUri("https://claude.ai.evil.com/callback", hosts)).toBe(false)
    expect(isAllowedRedirectUri("https://evil.com/callback", hosts)).toBe(false)
    expect(isAllowedRedirectUri("javascript:alert(1)", hosts)).toBe(false)
    expect(isAllowedRedirectUri("https://claude.ai/cb#frag", hosts)).toBe(false)
  })

  it("narrows scopes to the supported ones", () => {
    expect(normalizeScope(undefined)).toBe("read")
    expect(normalizeScope("read write admin")).toBe("read")
    expect(normalizeScope("admin")).toBe("read")
  })
})
