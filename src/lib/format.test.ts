import { describe, expect, it } from "vitest"

import { formatBankAccountLabel, formatBankAccountNumbers } from "./format"

describe("formatBankAccountNumbers", () => {
  it("shows agência and conta, leaving out whichever is empty", () => {
    expect(formatBankAccountNumbers({ branchNumber: "0001", accountNumber: "123-4" })).toBe("Ag 0001 / CC 123-4")
    expect(formatBankAccountNumbers({ branchNumber: "", accountNumber: "123-4" })).toBe("CC 123-4")
    expect(formatBankAccountNumbers({ branchNumber: "0001", accountNumber: "" })).toBe("Ag 0001")
    expect(formatBankAccountNumbers({ branchNumber: "", accountNumber: "" })).toBe("")
  })
})

describe("formatBankAccountLabel", () => {
  it("is just the name when the account has no numbers", () => {
    expect(formatBankAccountLabel({ name: "Caixa", branchNumber: "", accountNumber: "" })).toBe("Caixa")
    expect(formatBankAccountLabel({ name: "PJ", branchNumber: "0001", accountNumber: "9" })).toBe("PJ — Ag 0001 / CC 9")
  })
})
