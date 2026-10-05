"use client"

import * as React from "react"

import { buildCategoryGroups } from "@/components/categories/category-groups"
import { QuickAddContactDialog } from "@/components/contacts/quick-add-contact-dialog"
import { NewSaleCategoryDialog } from "@/components/sales/new-sale-category-dialog"
import { SearchableSelect } from "@/components/sales/searchable-select"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"

type Direction = "RECEIVABLE" | "PAYABLE"

// Contato e categoria do lançamento criado na conciliação — com o mesmo
// atalho de cadastro da nova venda/nova despesa, para não sair da tela.

export function ReconciliationContactPicker({
  contacts,
  direction,
  value,
  onValueChange,
  onCreated,
}: {
  contacts: Contact[]
  direction: Direction
  value: string
  onValueChange: (contactId: string) => void
  onCreated: (contact: Contact) => void
}) {
  const label = direction === "PAYABLE" ? "Novo fornecedor" : "Novo cliente"
  const options = React.useMemo(
    () => contacts.map((contact) => ({ value: contact.id, label: contact.name })),
    [contacts],
  )
  return (
    <SearchableSelect
      className="w-full"
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Contato"
      footer={
        <QuickAddContactDialog
          contactType={direction === "PAYABLE" ? "SUPPLIER" : "CLIENT"}
          triggerLabel={label}
          dialogTitle={label}
          onCreated={onCreated}
        />
      }
    />
  )
}

export function ReconciliationCategoryPicker({
  categories,
  direction,
  value,
  onValueChange,
  onCreated,
}: {
  categories: Category[]
  direction: Direction
  value: string
  onValueChange: (categoryId: string) => void
  onCreated: (category: Category) => void
}) {
  const type = direction === "PAYABLE" ? "EXPENSE" : "INCOME"
  const groups = React.useMemo(
    () => buildCategoryGroups(categories.filter((category) => category.type === type)),
    [categories, type],
  )
  return (
    <SearchableSelect
      className="w-full"
      groups={groups}
      value={value}
      onValueChange={onValueChange}
      placeholder="Categoria"
      footer={<NewSaleCategoryDialog categories={categories} defaultType={type} onCreated={onCreated} />}
    />
  )
}
