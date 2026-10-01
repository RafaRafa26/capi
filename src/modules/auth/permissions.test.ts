import { describe, expect, it } from "vitest"

import { can } from "./permissions"

describe("permissions", () => {
  it("viewer only reads", () => {
    expect(can("VIEWER", "write")).toBe(false)
    expect(can("VIEWER", "manageMembers")).toBe(false)
  })

  it("operator writes but doesn't manage members", () => {
    expect(can("OPERATOR", "write")).toBe(true)
    expect(can("OPERATOR", "manageMembers")).toBe(false)
  })

  it("admin does everything", () => {
    expect(can("ADMIN", "write")).toBe(true)
    expect(can("ADMIN", "manageMembers")).toBe(true)
  })
})
