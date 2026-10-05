"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useOrgPath, useOrgPathname } from "@/hooks/use-org-path"
import type { UserOrganization } from "@/modules/organizations/types"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutGridIcon,
  WalletIcon,
  BanknoteIcon,
  UsersIcon,
  LandmarkIcon,
  TagIcon,
  BookmarkIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  UserCogIcon,
} from "lucide-react"

const navFinanceiro = [
  { title: "Contas a pagar", url: "/payables", icon: <ArrowDownRightIcon /> },
  { title: "Contas a receber", url: "/receivables", icon: <ArrowUpRightIcon /> },
  { title: "Contas", url: "/accounts", icon: <WalletIcon /> },
  { title: "Repasses", url: "/payout", icon: <BanknoteIcon /> },
]

const navCadastros = [
  { title: "Contatos", url: "/contacts", icon: <UsersIcon /> },
  { title: "Contas bancárias", url: "/bank-accounts", icon: <LandmarkIcon /> },
  { title: "Categorias", url: "/categories", icon: <TagIcon /> },
  { title: "Marcadores", url: "/markers", icon: <BookmarkIcon /> },
]

const navConfiguracoes = [{ title: "Membros", url: "/members", icon: <UserCogIcon /> }]

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationId: string
  organizations: UserOrganization[]
  userName: string
  userEmail: string
}

export function AppSidebar({
  organizationId,
  organizations,
  userName,
  userEmail,
  ...props
}: AppSidebarProps) {
  const pathname = useOrgPathname()
  const toOrg = useOrgPath()

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher organizations={organizations} activeId={organizationId} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            {
              title: "Visão geral",
              url: toOrg("/dashboard"),
              icon: <LayoutGridIcon />,
              isActive: pathname === "/dashboard",
            },
          ]}
        />
        <NavMain
          label="Financeiro"
          items={navFinanceiro.map((item) => ({
            ...item,
            url: toOrg(item.url),
            // A conciliação de cada conta (/reconciliation/[id]) nasce da tela de Contas.
            isActive:
              pathname === item.url || (item.url === "/accounts" && pathname.startsWith("/reconciliation/")),
          }))}
        />
        <NavMain
          label="Cadastros"
          items={navCadastros.map((item) => ({
            ...item,
            url: toOrg(item.url),
            isActive: pathname === item.url,
          }))}
        />
        <NavMain
          label="Configurações"
          items={navConfiguracoes.map((item) => ({
            ...item,
            url: toOrg(item.url),
            isActive: pathname === item.url,
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: userName, email: userEmail, avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
