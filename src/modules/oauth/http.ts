import "server-only"

import { OAuthError } from "./service"

/**
 * The public origin the Capi is reached at — what goes into the OAuth
 * metadata and must match what claude.ai sees. `APP_URL` wins when set
 * (e.g. https://app.capi.com.br); otherwise it's derived from the request,
 * honoring the proxy's forwarded headers (Vercel sets them).
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "")
  if (configured) return configured

  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") ?? url.host
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")
  return `${proto}://${host}`
}

export function mcpResourceUrl(origin: string) {
  return `${origin}/api/mcp`
}

export function protectedResourceMetadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource`
}

/**
 * These endpoints carry no cookie and answer only to bearer credentials or
 * public metadata, so any origin may call them (browser-based MCP clients
 * and inspectors do).
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
}

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...init.headers },
  })
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function oauthErrorResponse(error: unknown) {
  if (error instanceof OAuthError) {
    return json({ error: error.code, error_description: error.message }, { status: error.status })
  }
  console.error("Unexpected OAuth error:", error)
  return json({ error: "server_error", error_description: "Unexpected error." }, { status: 500 })
}

/** Reads a form-encoded or JSON body into a flat string map. */
export async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? ""
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(body).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
    )
  }
  const form = new URLSearchParams(await request.text())
  return Object.fromEntries(form.entries())
}

/** client_secret_basic: `Authorization: Basic base64(client_id:client_secret)`. */
export function basicClientCredentials(request: Request): { clientId?: string; clientSecret?: string } {
  const header = request.headers.get("authorization")
  if (!header?.toLowerCase().startsWith("basic ")) return {}
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8")
  const separator = decoded.indexOf(":")
  if (separator < 0) return {}
  return {
    clientId: decodeURIComponent(decoded.slice(0, separator)),
    clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
  }
}
