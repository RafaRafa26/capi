"use client"

import * as React from "react"

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"

/**
 * Currency input where every digit — cents included — shifts live as the
 * user types, the way most Brazilian banking apps do it (type "5" → 0,05,
 * type another "0" → 0,50, and so on). The displayed text is always the
 * canonical formatting of `valueInCents`, so stripping non-digits from it on
 * the next keystroke reproduces the cents value exactly — nothing about the
 * decimals is a fixed, non-editable suffix.
 */
export function CurrencyInput({
  valueInCents,
  onValueChange,
  className,
  ...props
}: {
  valueInCents: number
  onValueChange: (cents: number) => void
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const display =
    valueInCents > 0
      ? (valueInCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : ""

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "")
    onValueChange(digits === "" ? 0 : Number(digits))
  }

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        inputMode="numeric"
        placeholder="0,00"
        value={display}
        onChange={handleChange}
        {...props}
      />
    </InputGroup>
  )
}
