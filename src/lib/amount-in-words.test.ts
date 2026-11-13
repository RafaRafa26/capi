import { describe, expect, it } from "vitest"

import { amountInWords } from "./amount-in-words"

describe("amountInWords", () => {
  it.each([
    [0, "zero real"],
    [1, "um centavo"],
    [50, "cinquenta centavos"],
    [100, "um real"],
    [200, "dois reais"],
    [1_050, "dez reais e cinquenta centavos"],
    [1_900, "dezenove reais"],
    [10_000, "cem reais"],
    [10_100, "cento e um reais"],
    [69_000, "seiscentos e noventa reais"],
    [100_000, "mil reais"],
    [140_000, "mil e quatrocentos reais"],
    [102_000, "mil e vinte reais"],
    [142_000, "mil quatrocentos e vinte reais"],
    [217_185, "dois mil cento e setenta e um reais e oitenta e cinco centavos"],
    [1_280_800, "doze mil oitocentos e oito reais"],
    [100_000_000, "um milhão de reais"],
    [250_000_000, "dois milhões e quinhentos mil reais"],
    [123_456_789, "um milhão, duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos"],
  ])("%i centavos → %s", (cents, words) => {
    expect(amountInWords(cents)).toBe(words)
  })
})
