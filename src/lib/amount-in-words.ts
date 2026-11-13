// Valor em reais por extenso, como se escreve num recibo: "mil e quatrocentos
// reais", "um milhão de reais", "dez reais e cinquenta centavos". Recebe
// centavos, como o resto do sistema.

const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"]
const TEENS = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
]

/** 1 a 999. */
function hundredsInWords(value: number): string {
  if (value === 100) return "cem"
  const parts: string[] = []
  const hundreds = Math.floor(value / 100)
  const rest = value % 100
  if (hundreds > 0) parts.push(HUNDREDS[hundreds])
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10])
  else {
    const tens = Math.floor(rest / 10)
    const units = rest % 10
    if (tens > 0) parts.push(TENS[tens])
    if (units > 0) parts.push(UNITS[units])
  }
  return parts.join(" e ")
}

const SCALES: [singular: string, plural: string][] = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
]

/** Inteiro positivo por extenso. */
function integerInWords(value: number): string {
  const groups: number[] = []
  for (let rest = value; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000)

  const parts: { text: string; group: number }[] = []
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (group === 0) continue
    const [singular, plural] = SCALES[index]
    // "mil", não "um mil".
    const number = index === 1 && group === 1 ? "" : hundredsInWords(group)
    const scale = index === 0 ? "" : group === 1 ? singular : plural
    parts.push({ text: [number, scale].filter(Boolean).join(" "), group })
  }

  // O último grupo entra com "e" quando é redondo ou menor que cem ("mil e
  // quatrocentos", "mil e vinte"); senão só com espaço ("mil quatrocentos e
  // vinte"). Entre os grupos maiores vai vírgula.
  return parts
    .map((part, index) => {
      if (index === 0) return part.text
      const isLast = index === parts.length - 1
      const joiner = isLast && (part.group < 100 || part.group % 100 === 0) ? " e " : isLast ? " " : ", "
      return joiner + part.text
    })
    .join("")
}

export function amountInWords(cents: number): string {
  const total = Math.abs(Math.round(cents))
  const reais = Math.floor(total / 100)
  const centavos = total % 100

  const parts: string[] = []
  if (reais > 0) {
    // "um milhão de reais", "dois bilhões de reais" — só quando o valor fecha
    // em milhão/bilhão redondo.
    const preposition = reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de" : ""
    parts.push(`${integerInWords(reais)}${preposition} ${reais === 1 ? "real" : "reais"}`)
  }
  if (centavos > 0) parts.push(`${integerInWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`)
  if (parts.length === 0) return "zero real"
  return parts.join(" e ")
}
