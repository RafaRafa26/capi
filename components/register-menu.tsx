"use client"

import { useRouter } from "next/navigation"
import { ChevronDownIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function RegisterMenu() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="lg" />}>
        <PlusIcon />
        Registrar
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => router.push("/new-sale")}>
          Venda
        </DropdownMenuItem>
        <DropdownMenuItem>Despesa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
