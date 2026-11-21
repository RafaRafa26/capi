"use client"

import { ChevronDownIcon, PlusIcon } from "lucide-react"

import { useEntrySheet } from "@/components/entries/entry-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function RegisterMenu() {
  const { openEntry, prefetch } = useEntrySheet()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="lg" onPointerEnter={prefetch} onFocus={prefetch} />}>
        <PlusIcon />
        Registrar
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => openEntry("sale")}>
          <span className="size-2 rounded-full bg-positive" aria-hidden />
          Venda
          <DropdownMenuShortcut>V</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEntry("expense")}>
          <span className="size-2 rounded-full bg-negative" aria-hidden />
          Despesa
          <DropdownMenuShortcut>D</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
