import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { authorizeUser, pkcePair, REDIRECT_URI } from "./__tests__/flow"
import {
  OAuthError,
  createAuthorizationCode,
  exchangeToken,
  parseAuthorizationRequest,
  registerClient,
  resolveAccessToken,
} from "./service"

let org: TestOrg
const clientIds: string[] = []

beforeAll(async () => {
  org = await createTestOrganization("OAuth")
})

afterAll(async () => {
  const created = await prismaAdmin.oAuthGrant.findMany({ where: { userId: org.userId }, select: { clientId: true } })
  await prismaAdmin.oAuthClient.deleteMany({
    where: { OR: [{ clientId: { in: clientIds } }, { id: { in: created.map((g) => g.clientId) } }] },
  })
  await removeTestOrganizations([org.id])
})

async function newCode(clientId: string, challenge: string) {
  const parsed = await parseAuthorizationRequest({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
  })
  if (!parsed.ok) throw new Error(parsed.error)
  return createAuthorizationCode(org.userId, parsed.request)
}

describe("oauth service", () => {
  it("rejects registering a redirect URI outside the allowlist", async () => {
    await expect(registerClient({ redirect_uris: ["https://evil.com/cb"] })).rejects.toThrow(OAuthError)
    await expect(registerClient({ redirect_uris: [] })).rejects.toThrow(OAuthError)
  })

  it("runs the full flow and resolves the access token to the user", async () => {
    const { client, tokens } = await authorizeUser(org.userId)
    clientIds.push(client.client_id)
    expect(tokens).toMatchObject({ token_type: "Bearer", scope: "read" })

    const grant = await resolveAccessToken(tokens.access_token)
    expect(grant).toMatchObject({ userId: org.userId, scopes: ["read"] })
    expect(await resolveAccessToken("not-a-token")).toBeNull()
  })

  it("never accepts the same code twice, nor a wrong PKCE verifier", async () => {
    const client = await registerClient({ redirect_uris: [REDIRECT_URI] })
    clientIds.push(client.client_id)
    const pkce = pkcePair()

    const code = await newCode(client.client_id, pkce.challenge)
    const exchange = (verifier: string, value = code) =>
      exchangeToken({ grant_type: "authorization_code", code: value, code_verifier: verifier, client_id: client.client_id })

    await expect(exchange(pkcePair().verifier)).rejects.toThrow(/authorization code/)
    // The failed attempt already burned the code.
    await expect(exchange(pkce.verifier)).rejects.toThrow(OAuthError)

    const second = await newCode(client.client_id, pkce.challenge)
    await expect(exchange(pkce.verifier, second)).resolves.toMatchObject({ token_type: "Bearer" })
    await expect(exchange(pkce.verifier, second)).rejects.toThrow(OAuthError)
  })

  it("rotates on refresh: the old refresh and access tokens stop working", async () => {
    const { client, tokens } = await authorizeUser(org.userId)
    clientIds.push(client.client_id)

    const refreshed = await exchangeToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: client.client_id,
    })
    expect(refreshed.access_token).not.toBe(tokens.access_token)
    expect(await resolveAccessToken(tokens.access_token)).toBeNull()
    expect(await resolveAccessToken(refreshed.access_token)).not.toBeNull()

    await expect(
      exchangeToken({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: client.client_id }),
    ).rejects.toThrow(OAuthError)
  })

  it("requires the secret from a confidential client", async () => {
    const client = await registerClient({ redirect_uris: [REDIRECT_URI], token_endpoint_auth_method: "client_secret_post" })
    clientIds.push(client.client_id)
    expect(client.client_secret).toBeTruthy()

    const pkce = pkcePair()
    const code = await newCode(client.client_id, pkce.challenge)
    await expect(
      exchangeToken({ grant_type: "authorization_code", code, code_verifier: pkce.verifier, client_id: client.client_id }),
    ).rejects.toThrow(/client credentials/)
  })

  it("stops resolving the token once the user is deactivated", async () => {
    const { client, tokens } = await authorizeUser(org.userId)
    clientIds.push(client.client_id)
    await prismaAdmin.user.update({ where: { id: org.userId }, data: { active: false } })
    try {
      expect(await resolveAccessToken(tokens.access_token)).toBeNull()
    } finally {
      await prismaAdmin.user.update({ where: { id: org.userId }, data: { active: true } })
    }
  })

  it("keeps OAuth rows away from the application role", async () => {
    const { withOrganization } = await import("@/db/client")
    const visible = await withOrganization(org.id, (tx) => tx.oAuthGrant.count())
    expect(visible).toBe(0)
  })
})
