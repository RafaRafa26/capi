"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { NewContactDialog } from "@/components/contacts/new-contact-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Contact, ContactType } from "@/modules/contacts/types"

const personTypeLabel = {
  INDIVIDUAL: "Pessoa física",
  COMPANY: "Pessoa jurídica",
} as const

const contactTypeLabel: Record<ContactType, string> = {
  CLIENT: "Cliente",
  SUPPLIER: "Fornecedor",
  BENEFICIARY: "Favorecido",
  EMPLOYEE: "Funcionário",
  PARTNER: "Sócio",
}

type TypeFilter = ContactType | "ALL"

export function ContactsView({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL")

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return contacts.filter((contact) => {
      const matchesType = typeFilter === "ALL" || contact.contactType === typeFilter
      const matchesSearch = !term || contact.name.toLowerCase().includes(term)
      return matchesType && matchesSearch
    })
  }, [contacts, search, typeFilter])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-start">
        <NewContactDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(value) => value && setTypeFilter(value as TypeFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue>
              {(value: TypeFilter) => (value === "ALL" ? "Todos os tipos" : contactTypeLabel[value])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            {(Object.keys(contactTypeLabel) as ContactType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {contactTypeLabel[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {contacts.length === 0
              ? "Nenhum contato cadastrado ainda."
              : "Nenhum contato encontrado."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <Badge variant="secondary">{contactTypeLabel[contact.contactType]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contact.document} · {personTypeLabel[contact.personType]}
                    {contact.legalName && ` · ${contact.legalName}`}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {contact.email && <p>{contact.email}</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                  {contact.bankDetails && <p>PIX: {contact.bankDetails.pixKey}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
