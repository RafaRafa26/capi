"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { organizacao, usuario } from "@/lib/mock/dashboard"
import {
  LayoutGridIcon,
  RefreshCwIcon,
  BanknoteIcon,
} from "lucide-react"

const data = {
  teams: [
    {
      name: organizacao.nome,
      logo: <span className="text-sm font-semibold">C</span>,
      plan: organizacao.documento,
    },
  ],
  navFinanceiro: [
    { title: "Conciliação bancária", url: "/reconciliation", icon: <RefreshCwIcon /> },
    { title: "Repasses", url: "/payout", icon: <BanknoteIcon /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
          items={data.navFinanceiro.map((item) => ({
            ...item,
            isActive: pathname === item.url,
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <SidebarSeparator className="mx-0" />
        <NavUser user={{ name: usuario.nome, email: usuario.email, avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
