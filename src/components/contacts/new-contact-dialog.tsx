"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { createContactAction } from "@/app/(app)/contacts/actions"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PersonType = "INDIVIDUAL" | "COMPANY"
type ContactType = "CLIENT" | "SUPPLIER" | "BENEFICIARY" | "EMPLOYEE" | "PARTNER"

const contactTypeLabel: Record<ContactType, string> = {
  CLIENT: "Cliente",
  SUPPLIER: "Fornecedor",
  BENEFICIARY: "Favorecido",
  EMPLOYEE: "Funcionário",
  PARTNER: "Sócio",
}

export function NewContactDialog() {
  const [open, setOpen] = React.useState(false)
  const [personType, setPersonType] = React.useState<PersonType>("INDIVIDUAL")
  const [contactType, setContactType] = React.useState<ContactType>("CLIENT")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const isBeneficiary = contactType === "BENEFICIARY"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<
      string,
      string
    >

    const payload = {
      name: personType === "COMPANY" ? values.tradeName : values.name,
      legalName: personType === "COMPANY" ? values.legalName : undefined,
      document: personType === "COMPANY" ? values.cnpj : values.cpf,
      personType,
      contactType,
      phone: values.phone,
      email: values.email,
      city: values.city,
      state: values.state,
      bankDetails: isBeneficiary
        ? {
            pixKey: values.pixKey,
            bank: values.bank,
            branchNumber: values.branchNumber,
            accountNumber: values.accountNumber,
            accountType: values.accountType,
            accountHolder: values.accountHolder,
          }
        : undefined,
    }

    const form = new FormData()
    form.set("payload", JSON.stringify(payload))
    const result = await createContactAction(form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setOpen(false)
    setContactType("CLIENT")
    event.currentTarget.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Novo contato
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            <Tabs value={personType} onValueChange={(value) => setPersonType(value as PersonType)}>
              <TabsList className="w-full">
                <TabsTrigger value="INDIVIDUAL">Pessoa física</TabsTrigger>
                <TabsTrigger value="COMPANY">Pessoa jurídica</TabsTrigger>
              </TabsList>

              <TabsContent value="INDIVIDUAL" className="flex flex-col gap-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" name="cpf" required={personType === "INDIVIDUAL"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required={personType === "INDIVIDUAL"} />
                </div>
              </TabsContent>

              <TabsContent value="COMPANY" className="flex flex-col gap-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" required={personType === "COMPANY"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="legalName">Razão social</Label>
                  <Input id="legalName" name="legalName" required={personType === "COMPANY"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tradeName">Nome fantasia</Label>
                  <Input id="tradeName" name="tradeName" required={personType === "COMPANY"} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-1.5">
              <Label>Tipo de contato</Label>
              <Select
                value={contactType}
                onValueChange={(value) => value && setContactType(value as ContactType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: ContactType) => contactTypeLabel[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(contactTypeLabel) as ContactType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {contactTypeLabel[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" name="state" />
              </div>
            </div>

            {isBeneficiary && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input id="pixKey" name="pixKey" required={isBeneficiary} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank">Banco</Label>
                  <Input id="bank" name="bank" required={isBeneficiary} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="branchNumber">Agência</Label>
                    <Input id="branchNumber" name="branchNumber" required={isBeneficiary} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber">Conta</Label>
                    <Input id="accountNumber" name="accountNumber" required={isBeneficiary} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountType">Tipo de conta</Label>
                  <Input id="accountType" name="accountType" required={isBeneficiary} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountHolder">Titular</Label>
                  <Input id="accountHolder" name="accountHolder" required={isBeneficiary} />
                </div>
              </>
            )}

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
