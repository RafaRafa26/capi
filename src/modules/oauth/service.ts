import "server-only"

import { prismaAdmin } from "@/db/client"
import { generateToken, hashToken } from "@/modules/auth/tokens"
import {
  ACCESS_TOKEN_SECONDS,
  AUTHORIZATION_CODE_SECONDS,
  REFRESH_TOKEN_DAYS,
  isAllowedRedirectUri,
  isValidCodeChallenge,
  normalizeScope,
  parseAllowedHosts,
  pkceMatches,
} from "./domain"

// The Capi as an OAuth 2.1 authorization server for its own MCP endpoint.
// Everything runs under the owner role: like sessions, OAuth rows belong to
// a person and are locked away from the application role by RLS.

/** An error the OAuth endpoints answer with as `{ error, error_description }` (RFC 6749 §5.2). */
export class OAuthError extends Error {
  constructor(
    readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "unsupported_grant_type"
      | "invalid_redirect_uri"
      | "invalid_client_metadata",
    description: string,
    readonly status = 400,
  ) {
    super(description)
    this.name = "OAuthError"
  }
}

function allowedRedirectHosts() {
  return parseAllowedHosts(process.env.OAUTH_REDIRECT_HOSTS)
}

// ------------------------------------------------------------ registration

export interface RegisterClientInput {
  client_name?: unknown
  redirect_uris?: unknown
  token_endpoint_auth_method?: unknown
}

export interface RegisteredClient {
  client_id: string
  client_secret?: string
  client_id_issued_at: number
  client_name: string
  redirect_uris: string[]
  token_endpoint_auth_method: "none" | "client_secret_post" | "client_secret_basic"
  grant_types: string[]
  response_types: string[]
}

const AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"] as const

/** Dynamic Client Registration (RFC 7591) — how claude.ai introduces itself. */
export async function registerClient(input: RegisterClientInput): Promise<RegisteredClient> {
  const redirectUris = input.redirect_uris
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must list between 1 and 10 URIs.")
  }
  for (const uri of redirectUris) {
    if (typeof uri !== "string" || !isAllowedRedirectUri(uri, allowedRedirectHosts())) {
      throw new OAuthError("invalid_redirect_uri", `Redirect URI not allowed: ${String(uri)}`)
    }
  }

  const method = input.token_endpoint_auth_method ?? "none"
  if (!AUTH_METHODS.includes(method as (typeof AUTH_METHODS)[number])) {
    throw new OAuthError("invalid_client_metadata", "Unsupported token_endpoint_auth_method.")
  }
  const authMethod = method as (typeof AUTH_METHODS)[number]

  const name =
    typeof input.client_name === "string" && input.client_name.trim()
      ? input.client_name.trim().slice(0, 100)
      : "Aplicativo sem nome"

  const clientId = generateToken()
  const clientSecret = authMethod === "none" ? undefined : generateToken()

  const client = await prismaAdmin.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? hashToken(clientSecret) : null,
      name,
      redirectUris: redirectUris as string[],
    },
  })

  return {
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    client_name: name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: authMethod,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  }
}

// ----------------------------------------------------------- authorization

export interface AuthorizationRequest {
  clientId: string
  clientName: string
  redirectUri: string
  codeChallenge: string
  scope: string
  state: string | null
}

/**
 * Validates the query string of /oauth/authorize. Returns null when the
 * client or redirect URI can't be trusted — then the error is shown on our
 * own page and nothing is sent to the redirect URI (RFC 6749 §4.1.2.1).
 */
export async function parseAuthorizationRequest(
  params: Record<string, string | undefined>,
): Promise<{ ok: true; request: AuthorizationRequest } | { ok: false; error: string; redirect?: string }> {
  const client = params.client_id
    ? await prismaAdmin.oAuthClient.findUnique({ where: { clientId: params.client_id } })
    : null
  if (!client) return { ok: false, error: "Aplicativo desconhecido. Remova o conector e adicione-o de novo." }

  const redirectUri = params.redirect_uri ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined)
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return { ok: false, error: "Endereço de retorno não registrado para este aplicativo." }
  }

  // From here on the redirect URI is trusted, so protocol errors go back to it.
  const back = (error: string, description: string) => {
    const url = new URL(redirectUri)
    url.searchParams.set("error", error)
    url.searchParams.set("error_description", description)
    if (params.state) url.searchParams.set("state", params.state)
    return { ok: false as const, error: description, redirect: url.toString() }
  }

  if (params.response_type !== "code") return back("unsupported_response_type", "Only response_type=code is supported.")
  if (params.code_challenge_method !== "S256" || !isValidCodeChallenge(params.code_challenge)) {
    return back("invalid_request", "PKCE with code_challenge_method=S256 is required.")
  }

  return {
    ok: true,
    request: {
      clientId: client.clientId,
      clientName: client.name,
      redirectUri,
      codeChallenge: params.code_challenge,
      scope: normalizeScope(params.scope),
      state: params.state ?? null,
    },
  }
}

/** After the person clicked "Permitir": a single-use code for the client to exchange. */
export async function createAuthorizationCode(userId: string, request: AuthorizationRequest): Promise<string> {
  const client = await prismaAdmin.oAuthClient.findUnique({ where: { clientId: request.clientId } })
  if (!client || !client.redirectUris.includes(request.redirectUri)) {
    throw new OAuthError("invalid_request", "Unknown client or redirect URI.")
  }

  const code = generateToken()
  await prismaAdmin.oAuthAuthorizationCode.create({
    data: {
      codeHash: hashToken(code),
      clientId: client.id,
      userId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      scope: normalizeScope(request.scope),
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_SECONDS * 1000),
    },
  })
  return code
}

// ------------------------------------------------------------------ tokens

export interface TokenResponse {
  access_token: string
  token_type: "Bearer"
  expires_in: number
  refresh_token: string
  scope: string
}

function freshTokenPair() {
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const now = Date.now()
  return {
    accessToken,
    refreshToken,
    data: {
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(now + ACCESS_TOKEN_SECONDS * 1000),
      refreshTokenHash: hashToken(refreshToken),
      refreshExpiresAt: new Date(now + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  }
}

function tokenResponse(accessToken: string, refreshToken: string, scope: string): TokenResponse {
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_SECONDS,
    refresh_token: refreshToken,
    scope,
  }
}

/** Confidential clients must present their secret; public ones must not have one. */
async function authenticateClient(clientId: string | undefined, clientSecret: string | undefined) {
  if (!clientId) throw new OAuthError("invalid_client", "client_id is required.", 401)
  const client = await prismaAdmin.oAuthClient.findUnique({ where: { clientId } })
  if (!client) throw new OAuthError("invalid_client", "Unknown client.", 401)
  if (client.clientSecretHash && (!clientSecret || hashToken(clientSecret) !== client.clientSecretHash)) {
    throw new OAuthError("invalid_client", "Invalid client credentials.", 401)
  }
  return client
}

export interface TokenRequest {
  grant_type?: string
  code?: string
  redirect_uri?: string
  code_verifier?: string
  refresh_token?: string
  client_id?: string
  client_secret?: string
}

export async function exchangeToken(input: TokenRequest): Promise<TokenResponse> {
  if (input.grant_type === "authorization_code") return exchangeAuthorizationCode(input)
  if (input.grant_type === "refresh_token") return refreshAccessToken(input)
  throw new OAuthError("unsupported_grant_type", "Only authorization_code and refresh_token are supported.")
}

async function exchangeAuthorizationCode(input: TokenRequest): Promise<TokenResponse> {
  const client = await authenticateClient(input.client_id, input.client_secret)
  if (!input.code || !input.code_verifier) {
    throw new OAuthError("invalid_request", "code and code_verifier are required.")
  }

  // Deleted on first use, whatever happens next: a code is never valid twice.
  const code = await prismaAdmin.oAuthAuthorizationCode
    .delete({ where: { codeHash: hashToken(input.code) } })
    .catch(() => null)

  if (
    !code ||
    code.clientId !== client.id ||
    code.expiresAt.getTime() < Date.now() ||
    (input.redirect_uri !== undefined && input.redirect_uri !== code.redirectUri) ||
    !pkceMatches(input.code_verifier, code.codeChallenge)
  ) {
    throw new OAuthError("invalid_grant", "Invalid, expired or already used authorization code.")
  }

  const user = await prismaAdmin.user.findUnique({ where: { id: code.userId }, select: { active: true } })
  if (!user?.active) throw new OAuthError("invalid_grant", "User is no longer active.")

  const pair = freshTokenPair()
  await prismaAdmin.oAuthGrant.create({
    data: { clientId: client.id, userId: code.userId, scope: code.scope, ...pair.data },
  })
  return tokenResponse(pair.accessToken, pair.refreshToken, code.scope)
}

async function refreshAccessToken(input: TokenRequest): Promise<TokenResponse> {
  const client = await authenticateClient(input.client_id, input.client_secret)
  if (!input.refresh_token) throw new OAuthError("invalid_request", "refresh_token is required.")

  const grant = await prismaAdmin.oAuthGrant.findUnique({
    where: { refreshTokenHash: hashToken(input.refresh_token) },
    include: { user: { select: { active: true } } },
  })
  if (!grant || grant.clientId !== client.id || grant.refreshExpiresAt.getTime() < Date.now() || !grant.user.active) {
    throw new OAuthError("invalid_grant", "Invalid or expired refresh token.")
  }

  // Rotation: the old refresh token stops working the moment this succeeds.
  // The `where` on the old hash makes two concurrent refreshes race safely —
  // only one of them matches the row.
  const pair = freshTokenPair()
  const updated = await prismaAdmin.oAuthGrant.updateMany({
    where: { id: grant.id, refreshTokenHash: grant.refreshTokenHash },
    data: pair.data,
  })
  if (updated.count === 0) throw new OAuthError("invalid_grant", "Refresh token already used.")

  return tokenResponse(pair.accessToken, pair.refreshToken, grant.scope)
}

// ------------------------------------------------------------ resource side

export interface AccessGrant {
  grantId: string
  userId: string
  clientId: string
  scopes: string[]
  expiresAt: Date
}

/** Resolves a Bearer token from the MCP endpoint into who is calling, or null. */
export async function resolveAccessToken(token: string | undefined): Promise<AccessGrant | null> {
  if (!token) return null

  const grant = await prismaAdmin.oAuthGrant.findUnique({
    where: { accessTokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      scope: true,
      accessExpiresAt: true,
      lastUsedAt: true,
      client: { select: { clientId: true } },
      user: { select: { active: true } },
    },
  })
  if (!grant || grant.accessExpiresAt.getTime() < Date.now() || !grant.user.active) return null

  // Throttled: one write a minute is enough to show "último uso".
  if (!grant.lastUsedAt || Date.now() - grant.lastUsedAt.getTime() > 60_000) {
    void prismaAdmin.oAuthGrant
      .update({ where: { id: grant.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {})
  }

  return {
    grantId: grant.id,
    userId: grant.userId,
    clientId: grant.client.clientId,
    scopes: grant.scope.split(" "),
    expiresAt: grant.accessExpiresAt,
  }
}

/** Removes expired codes. Cheap enough to run on every authorization. */
export async function pruneExpiredCodes() {
  await prismaAdmin.oAuthAuthorizationCode.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
}
