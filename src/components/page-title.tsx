"use client"

import { usePathname } from "next/navigation"

const titles: Record<string, string> = {
  "/dashboard": "Visão geral",
  "/new-sale": "Nova venda",
  "/new-expense": "Nova despesa",
  "/reconciliation": "Conciliação",
  "/payout": "Repasses",
  "/payables": "Contas a pagar",
  "/receivables": "Contas a receber",
  "/contacts": "Contatos",
  "/bank-accounts": "Contas bancárias",
  "/categories": "Categorias",
}

function resolveTitle(pathname: string): string | null {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith("/reconciliation/")) return "Conciliação"
  return null
}

export function PageTitle() {
  const pathname = usePathname()
  const title = resolveTitle(pathname)

  if (!title) return null

  return <h1 className="text-lg font-semibold">{title}</h1>
}
