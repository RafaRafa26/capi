"use client"

import { usePathname } from "next/navigation"

const titles: Record<string, string> = {
  "/visao-geral": "Visão geral",
  "/vendas/nova": "Nova venda",
  "/contas-bancarias": "Contas bancárias",
  "/categorias": "Categorias",
  "/conciliacao": "Conciliação",
  "/repasses": "Repasses",
  "/contatos": "Contatos",
}

export function PageTitle() {
  const pathname = usePathname()
  const title = titles[pathname]

  if (!title) return null

  return <h1 className="text-lg font-semibold">{title}</h1>
}
