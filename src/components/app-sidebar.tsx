"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutGridIcon,
  RefreshCwIcon,
  BanknoteIcon,
  UsersIcon,
} from "lucide-react"

const navFinanceiro = [
  { title: "Conciliação bancária", url: "/reconciliation", icon: <RefreshCwIcon /> },
  { title: "Repasses", url: "/payout", icon: <BanknoteIcon /> },
]

const navCadastros = [{ title: "Contatos", url: "/contacts", icon: <UsersIcon /> }]

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationName: string
  organizationDocument: string
  userName: string
  userEmail: string
}

export function AppSidebar({
  organizationName,
  organizationDocument,
  userName,
  userEmail,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: organizationName,
              logo: <span className="text-sm font-semibold">C</span>,
              plan: organizationDocument,
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            {
              title: "Visão geral",
              url: "/dashboard",
              icon: <LayoutGridIcon />,
              isActive: pathname === "/dashboard",
            },
          ]}
        />
        <NavMain
          label="Financeiro"
          items={navFinanceiro.map((item) => ({
            ...item,
            isActive: pathname === item.url,
          }))}
        />
        <NavMain
          label="Cadastros"
          items={navCadastros.map((item) => ({
            ...item,
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
