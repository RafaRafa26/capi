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
import { useOrgPath } from "@/hooks/use-org-path"

export function RegisterMenu() {
  const router = useRouter()
  const toOrg = useOrgPath()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="lg" />}>
        <PlusIcon />
        Registrar
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => router.push(toOrg("/new-sale"))}>
          Venda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(toOrg("/new-expense"))}>
          Despesa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
