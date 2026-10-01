import { describe, expect, it } from "vitest"

import { formatDocument, isValidCnpj, isValidCpf, onlyDigits } from "./document"

describe("document helpers", () => {
  it("strips punctuation", () => {
    expect(onlyDigits("11.222.333/0001-81")).toBe("11222333000181")
  })

  it("validates CNPJ check digits", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true)
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false)
    expect(isValidCnpj("00000000000000")).toBe(false)
    expect(isValidCnpj("1122233300018")).toBe(false)
  })

  it("validates CPF check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("529.982.247-24")).toBe(false)
    expect(isValidCpf("111.111.111-11")).toBe(false)
  })

  it("formats CPF and CNPJ", () => {
    expect(formatDocument("11222333000181")).toBe("11.222.333/0001-81")
    expect(formatDocument("52998224725")).toBe("529.982.247-25")
    expect(formatDocument("test-doc")).toBe("test-doc")
  })
})
