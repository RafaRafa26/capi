import { BusinessError } from "@/shared/errors"

export interface ParsedOfxTransaction {
  /** FITID — the bank's own identifier, unique per account (RN-16). */
  fitId: string
  postedAt: Date
  /** Cents, sign preserved: credit positive, debit negative. */
  amount: number
  description: string
}

export interface ParsedOfxStatement {
  periodStart: Date | null
  periodEnd: Date | null
  transactions: ParsedOfxTransaction[]
}

const STMTTRN_RE = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi

/**
 * Reads one OFX tag's value out of a fragment.
 *
 * OFX 1.x (SGML) never closes a leaf tag — `<FITID>123` runs until the next
 * `<` or line break — while OFX 2.x (XML) does — `<FITID>123</FITID>`.
 * Matching everything up to the next `<` or newline handles both: in the
 * XML case that's exactly where the closing tag starts.
 */
function readTag(fragment: string, tag: string): string | null {
  const match = fragment.match(new RegExp(`<${tag}>([^\r\n<]*)`, "i"))
  return match ? match[1].trim() : null
}

/** Parses OFX's `YYYYMMDDHHMMSS[.sss][gmt offset]` into a local Date. */
function parseOfxDate(raw: string): Date {
  const digits = raw.split(/[[.]/)[0]
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const hour = Number(digits.slice(8, 10) || "0")
  const minute = Number(digits.slice(10, 12) || "0")
  const second = Number(digits.slice(12, 14) || "0")
  const date = new Date(year, month - 1, day, hour, minute, second)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessError(`Data inválida no arquivo OFX: "${raw}".`)
  }
  return date
}

/** TRNAMT is always period-decimal per the OFX spec, regardless of locale. */
function parseOfxAmount(raw: string): number {
  const value = Number(raw)
  if (Number.isNaN(value)) {
    throw new BusinessError(`Valor inválido no arquivo OFX: "${raw}".`)
  }
  return Math.round(value * 100)
}

/**
 * Parses an OFX bank statement export. Own implementation (no external OFX
 * library) — the format is SGML-flavored, not valid XML, so a generic XML
 * parser can't be pointed at it directly.
 */
export function parseOfx(content: string): ParsedOfxStatement {
  const transactions: ParsedOfxTransaction[] = []

  for (const match of content.matchAll(STMTTRN_RE)) {
    const block = match[1]
    const fitId = readTag(block, "FITID")
    const dtPosted = readTag(block, "DTPOSTED")
    const trnAmt = readTag(block, "TRNAMT")
    if (!fitId || !dtPosted || !trnAmt) {
      throw new BusinessError("Arquivo OFX inválido: transação sem FITID, data ou valor.")
    }

    transactions.push({
      fitId,
      postedAt: parseOfxDate(dtPosted),
      amount: parseOfxAmount(trnAmt),
      description: readTag(block, "MEMO") || readTag(block, "NAME") || "",
    })
  }

  if (transactions.length === 0) {
    throw new BusinessError("Nenhuma transação encontrada no arquivo OFX.")
  }

  const dtStart = readTag(content, "DTSTART")
  const dtEnd = readTag(content, "DTEND")

  return {
    periodStart: dtStart ? parseOfxDate(dtStart) : null,
    periodEnd: dtEnd ? parseOfxDate(dtEnd) : null,
    transactions,
  }
}
