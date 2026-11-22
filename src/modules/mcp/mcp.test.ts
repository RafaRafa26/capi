import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST } from "@/app/api/mcp/route"
import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { authorizeUser } from "@/modules/oauth/__tests__/flow"

let org: TestOrg
let otherOrg: TestOrg
let accessToken: string
let clientId: string

beforeAll(async () => {
  org = await createTestOrganization("MCP")
  otherOrg = await createTestOrganization("MCP other")
  const { client, tokens } = await authorizeUser(org.userId)
  accessToken = tokens.access_token
  clientId = client.client_id

  await prismaAdmin.entry.create({
    data: {
      organizationId: org.id,
      contactId: org.contactId,
      categoryId: org.categoryId,
      bankAccountId: org.bankAccountId,
      type: "RECEIVABLE",
      description: "Parcela de gado",
      dueDate: new Date("2026-01-10"),
      amount: 123456,
      paymentMethod: "PIX",
    },
  })
})

afterAll(async () => {
  await prismaAdmin.oAuthClient.deleteMany({ where: { clientId } })
  await removeTestOrganizations([org.id, otherOrg.id])
})

let nextId = 1

async function rpc(method: string, params: unknown = {}, token: string | null = accessToken) {
  const response = await POST(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  )
  return { status: response.status, headers: response.headers, body: response.status === 200 ? await response.json() : null }
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const { body } = await rpc("tools/call", { name, arguments: args })
  const result = body.result as { isError?: boolean; content: { text: string }[] }
  return { isError: result.isError ?? false, text: result.content[0].text }
}

describe("MCP endpoint", () => {
  it("answers 401 with the OAuth metadata pointer when there's no token", async () => {
    const { status, headers } = await rpc("tools/list", {}, null)
    expect(status).toBe(401)
    expect(headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource")
  })

  it("initializes and lists only read-only tools", async () => {
    const init = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    })
    expect(init.body.result.serverInfo.name).toBe("capi")

    const { body } = await rpc("tools/list")
    const tools = body.result.tools as { name: string; annotations?: { readOnlyHint?: boolean } }[]
    expect(tools.map((tool) => tool.name)).toContain("buscar_lancamentos")
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true)
  })

  it("lists the caller's organizations", async () => {
    const { text } = await callTool("listar_empresas")
    const ids = (JSON.parse(text).empresas as { id: string }[]).map((empresa) => empresa.id)
    expect(ids).toEqual([org.id])
  })

  it("finds entries with values in reais", async () => {
    const { text, isError } = await callTool("buscar_lancamentos", { empresa_id: org.id, contato: "test contact" })
    expect(isError).toBe(false)
    const data = JSON.parse(text)
    expect(data.total_encontrado).toBe(1)
    expect(data.lancamentos[0]).toMatchObject({ valor: 1234.56, situacao: "vencido", vencimento: "2026-01-10" })
  })

  it("refuses an organization the user doesn't belong to", async () => {
    const { isError, text } = await callTool("resumo_geral", { empresa_id: otherOrg.id })
    expect(isError).toBe(true)
    expect(text).toMatch(/não tem acesso/)
  })

  it("cuts access as soon as the membership is removed", async () => {
    const membership = await prismaAdmin.membership.findFirstOrThrow({ where: { userId: org.userId, organizationId: org.id } })
    await prismaAdmin.membership.delete({ where: { id: membership.id } })
    try {
      expect((await callTool("resumo_geral", { empresa_id: org.id })).isError).toBe(true)
    } finally {
      await prismaAdmin.membership.create({ data: { userId: org.userId, organizationId: org.id, role: membership.role } })
    }
  })
})
