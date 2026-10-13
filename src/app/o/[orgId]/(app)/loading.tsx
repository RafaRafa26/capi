"use client"

import { usePathname } from "next/navigation"

import {
  AccountsPageSkeleton,
  BankAccountsPageSkeleton,
  OverviewPageSkeleton,
  PageSkeleton,
} from "@/components/page-skeletons"

/**
 * Enquanto o payload da rota nova não chega (sem prefetch, ex.: em dev), o
 * router mostra este boundary antes do loading.tsx da própria rota. Escolher o
 * mesmo skeleton da rota evita piscar um genérico e depois o específico.
 */
export default function Loading() {
  const segment = usePathname().split("/")[3]

  switch (segment) {
    case "accounts":
      return <BankAccountsPageSkeleton />
    case "dashboard":
      return <OverviewPageSkeleton />
    case "payables":
    case "receivables":
      return <AccountsPageSkeleton />
    default:
      return <PageSkeleton />
  }
}
