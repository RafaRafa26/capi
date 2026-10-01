// CPF/CNPJ helpers. Documents are stored as digits only, so the same
// company typed with or without punctuation is recognized as the same.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function allSameDigit(digits: string): boolean {
  return /^(\d)\1*$/.test(digits)
}

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 11 || allSameDigit(digits)) return false
  const first = checkDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === Number(digits[9]) && second === Number(digits[10])
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 14 || allSameDigit(digits)) return false
  const first = checkDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === Number(digits[12]) && second === Number(digits[13])
}

/** 00.000.000/0000-00 or 000.000.000-00; anything else comes back untouched. */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  }
  return value
}
