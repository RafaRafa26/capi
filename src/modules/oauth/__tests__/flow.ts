import { createHash, randomBytes } from "node:crypto"

import { createAuthorizationCode, exchangeToken, parseAuthorizationRequest, registerClient } from "../service"

export const REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback"

export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url")
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

/** The whole dance claude.ai does: register, consent, exchange. */
export async function authorizeUser(userId: string) {
  const client = await registerClient({ client_name: "Claude", redirect_uris: [REDIRECT_URI] })
  const pkce = pkcePair()
  const parsed = await parseAuthorizationRequest({
    client_id: client.client_id,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state: "xyz",
  })
  if (!parsed.ok) throw new Error(parsed.error)
  const code = await createAuthorizationCode(userId, parsed.request)
  const tokens = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: pkce.verifier,
    client_id: client.client_id,
  })
  return { client, tokens }
}
