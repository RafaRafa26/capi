// Who may do what inside an organization — ARQUITETURA.md §3, permissions
// table. Pure on purpose: the edge (server actions, pages) asks `can()`;
// services stay unaware of roles.

export type Role = "ADMIN" | "OPERATOR" | "VIEWER"

export type Permission =
  /** Create/edit entries, contacts, accounts, categories; reconcile; payouts. */
  | "write"
  /** Invite, remove and change the role of members. */
  | "manageMembers"

const grants: Record<Permission, readonly Role[]> = {
  write: ["ADMIN", "OPERATOR"],
  manageMembers: ["ADMIN"],
}

export function can(role: Role, permission: Permission): boolean {
  return grants[permission].includes(role)
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
}
