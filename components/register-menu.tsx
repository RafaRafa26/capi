"use client"

import { ChevronDownIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function RegisterMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="lg" />}>
        <PlusIcon />
        Registrar
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>Venda</DropdownMenuItem>
        <DropdownMenuItem>Despesa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
