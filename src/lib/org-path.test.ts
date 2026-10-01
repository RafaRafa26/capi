import { describe, expect, it } from "vitest"

import { orgPath, safeNextPath, stripOrgPrefix } from "./org-path"

describe("org paths", () => {
  it("prefixes and strips the organization segment", () => {
    expect(orgPath("abc", "/contacts")).toBe("/o/abc/contacts")
    expect(orgPath("abc", "contacts")).toBe("/o/abc/contacts")
    expect(stripOrgPrefix("/o/abc/contacts")).toBe("/contacts")
    expect(stripOrgPrefix("/o/abc")).toBe("/")
    expect(stripOrgPrefix("/login")).toBe("/login")
  })

  it("only accepts same-site next paths", () => {
    expect(safeNextPath("/invite/x")).toBe("/invite/x")
    expect(safeNextPath("//evil.com")).toBeNull()
    expect(safeNextPath("/\\evil.com")).toBeNull()
    expect(safeNextPath("https://evil.com")).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
