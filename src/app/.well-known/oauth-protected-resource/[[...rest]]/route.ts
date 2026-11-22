import { CORS_HEADERS, json, mcpResourceUrl, preflight, publicOrigin } from "@/modules/oauth/http"

// Protected Resource Metadata (RFC 9728): tells an MCP client which
// authorization server issues tokens for /api/mcp. The catch-all also
// answers the path-suffixed form (/.well-known/oauth-protected-resource/api/mcp).
export function GET(request: Request) {
  const origin = publicOrigin(request)
  return json(
    {
      resource: mcpResourceUrl(origin),
      authorization_servers: [origin],
      scopes_supported: ["read"],
      bearer_methods_supported: ["header"],
      resource_name: "Capi",
    },
    { headers: CORS_HEADERS },
  )
}

export const OPTIONS = preflight
