"use client"

import { usePathname } from "next/navigation"

const titles: Record<string, string> = {
  "/dashboard": "Visão geral",
  "/new-sale": "Nova venda",
  "/reconciliation": "Conciliação",
  "/payout": "Repasses",
  "/contacts": "Contatos",
}

export function PageTitle() {
  const pathname = usePathname()
  const title = titles[pathname]

  if (!title) return null

  return <h1 className="text-lg font-semibold">{title}</h1>
}
