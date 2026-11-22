import { SUPPORTED_SCOPES } from "@/modules/oauth/domain"
import { json, preflight, publicOrigin } from "@/modules/oauth/http"

// Authorization Server Metadata (RFC 8414) — where claude.ai finds the
// registration, authorization and token endpoints.
export function GET(request: Request) {
  const origin = publicOrigin(request)
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    scopes_supported: SUPPORTED_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
  })
}

export const OPTIONS = preflight
