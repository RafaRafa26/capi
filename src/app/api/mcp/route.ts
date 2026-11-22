import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"

import { createCapiMcpServer } from "@/modules/mcp/server"
import { CORS_HEADERS, mcpResourceUrl, preflight, protectedResourceMetadataUrl, publicOrigin } from "@/modules/oauth/http"
import { resolveAccessToken } from "@/modules/oauth/service"

// The MCP endpoint Claude connects to (Streamable HTTP, stateless): each
// POST builds a fresh server for the caller resolved from the Bearer token.
// Stateless fits serverless hosting — no session to pin to one instance.

function bearer(request: Request) {
  const header = request.headers.get("authorization")
  return header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined
}

function withCors(response: Response) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/** 401 that tells the client where to start OAuth (RFC 9728 §5.1). */
function unauthorized(request: Request) {
  const metadata = protectedResourceMetadataUrl(publicOrigin(request))
  return new Response(JSON.stringify({ error: "invalid_token", error_description: "Missing or expired access token." }), {
    status: 401,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer realm="capi", resource_metadata="${metadata}"`,
    },
  })
}

export async function POST(request: Request) {
  const grant = await resolveAccessToken(bearer(request))
  if (!grant) return unauthorized(request)

  const server = createCapiMcpServer({ userId: grant.userId, scopes: grant.scopes })
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)

  try {
    const response = await transport.handleRequest(request, {
      authInfo: {
        token: "",
        clientId: grant.clientId,
        scopes: grant.scopes,
        expiresAt: Math.floor(grant.expiresAt.getTime() / 1000),
        resource: new URL(mcpResourceUrl(publicOrigin(request))),
      },
    })
    return withCors(response)
  } finally {
    // JSON responses are fully built by now; release the per-request server.
    void server.close()
  }
}

/** Stateless server: no server-initiated stream (GET) and no session to end (DELETE). */
function methodNotAllowed() {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }),
    { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json", Allow: "POST, OPTIONS" } },
  )
}

export const GET = methodNotAllowed
export const DELETE = methodNotAllowed
export const OPTIONS = preflight
