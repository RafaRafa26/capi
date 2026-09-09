"use client"

import * as React from "react"
import { CalendarIcon, PlusIcon } from "lucide-react"

import { createBankAccountAction } from "@/app/(app)/bank-accounts/actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatBRLInput, formatDate, parseBRLInput } from "@/lib/format"
import type { BankAccount } from "@/modules/bank-accounts/types"

type Kind = "CHECKING" | "SAVINGS_POCKET"
type HolderType = "INDIVIDUAL" | "COMPANY"

const kindLabel: Record<Kind, string> = { CHECKING: "Corrente", SAVINGS_POCKET: "Caixinha" }
const holderTypeLabel: Record<HolderType, string> = { INDIVIDUAL: "Pessoa física", COMPANY: "Pessoa jurídica" }

export function NewBankAccountDialog({
  onCreated,
}: {
  /** Called with the created account — used by pickers that quick-add. */
  onCreated?: (account: BankAccount) => void
} = {}) {
  const [open, setOpen] = React.useState(false)
  const [kind, setKind] = React.useState<Kind>("CHECKING")
  const [holderType, setHolderType] = React.useState<HolderType>("COMPANY")
  const [controlStartDate, setControlStartDate] = React.useState<Date>(new Date())
  const [initialBalance, setInitialBalance] = React.useState("0,00")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set("kind", kind)
    form.set("holderType", holderType)
    form.set("controlStartDate", controlStartDate.toISOString())
    form.set("initialBalance", String(parseBRLInput(initialBalance)))

    const result = await createBankAccountAction(form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setOpen(false)
    setInitialBalance("0,00")
    setControlStartDate(new Date())
    event.currentTarget.reset()
    onCreated?.(result.data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Nova conta
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova conta bancária</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da conta</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank">Banco</Label>
              <Input id="bank" name="bank" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branchNumber">Agência</Label>
                <Input id="branchNumber" name="branchNumber" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accountNumber">Número da conta</Label>
                <Input id="accountNumber" name="accountNumber" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de conta</Label>
                <Select value={kind} onValueChange={(value) => value && setKind(value as Kind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: Kind) => kindLabel[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Corrente</SelectItem>
                    <SelectItem value="SAVINGS_POCKET">Caixinha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta PJ ou PF</Label>
                <Select
                  value={holderType}
                  onValueChange={(value) => value && setHolderType(value as HolderType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: HolderType) => holderTypeLabel[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Pessoa física</SelectItem>
                    <SelectItem value="COMPANY">Pessoa jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data de início do controle</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" className="w-full justify-start font-normal" />
                  }
                >
                  <CalendarIcon />
                  {formatDate(controlStartDate)}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={controlStartDate}
                    onSelect={(date) => date && setControlStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="initialBalance">Saldo inicial</Label>
              <Input
                id="initialBalance"
                value={initialBalance}
                onChange={(event) => setInitialBalance(event.target.value)}
                onBlur={() => setInitialBalance(formatBRLInput(parseBRLInput(initialBalance)))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
