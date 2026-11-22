import "server-only"

import type { Role } from "@/modules/auth/permissions"
import { findMembership } from "@/modules/organizations/service"
import { BusinessError } from "@/shared/errors"

/** Who is calling the MCP endpoint — resolved from the OAuth access token. */
export interface McpContext {
  userId: string
  scopes: string[]
}

export interface McpOrganization {
  id: string
  name: string
  role: Role
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The MCP counterpart of `requireSession()`: every tool names the
 * organization it works in, and membership is checked again on every call —
 * removing someone from a company cuts Claude off at once, exactly like the
 * screens. RLS (withOrganization) stays underneath as the safety net.
 */
export async function requireOrganization(context: McpContext, organizationId: string): Promise<McpOrganization> {
  if (!UUID.test(organizationId)) {
    throw new BusinessError("empresa_id inválido. Use o id devolvido por listar_empresas.")
  }
  const membership = await findMembership(context.userId, organizationId)
  if (!membership) {
    throw new BusinessError("Você não tem acesso a esta empresa. Use listar_empresas para ver as disponíveis.")
  }
  return { id: membership.id, name: membership.name, role: membership.role }
}
