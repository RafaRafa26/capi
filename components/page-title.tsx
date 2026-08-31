"use client"

import { usePathname } from "next/navigation"

const titles: Record<string, string> = {
  "/dashboard": "Visão geral",
  "/new-sale": "Nova venda",
  "/dashboard/contas-bancarias": "Contas bancárias",
  "/dashboard/categorias": "Categorias",
  "/dashboard/centros-de-custo": "Centros de custo",
  "/reconciliation": "Conciliação",
  "/dashboard/contas-a-receber": "Contas a receber",
  "/dashboard/repasses": "Repasses",
  "/dashboard/favorecidos": "Favorecidos",
  "/dashboard/fornecedores": "Fornecedores",
  "/dashboard/clientes": "Clientes",
}

export function PageTitle() {
  const pathname = usePathname()
  const title = titles[pathname]

  if (!title) return null

  return <h1 className="text-lg font-semibold">{title}</h1>
}
