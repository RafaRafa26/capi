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
  CreditCardIcon,
  RefreshCwIcon,
  UserIcon,
  Building2Icon,
  UsersIcon,
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
    {
      title: "Contas e Extratos",
      url: "#",
      icon: <CreditCardIcon />,
      isActive: true,
      items: [
        { title: "Contas bancárias", url: "/dashboard/contas-bancarias" },
        { title: "Categorias", url: "/dashboard/categorias" },
        { title: "Centros de custo", url: "/dashboard/centros-de-custo" },
      ],
    },
    {
      title: "Conciliação",
      url: "#",
      icon: <RefreshCwIcon />,
      isActive: true,
      items: [
        { title: "Conciliação bancária", url: "/reconciliation" },
        { title: "Contas a receber", url: "/dashboard/contas-a-receber" },
        { title: "Repasses", url: "/dashboard/repasses" },
      ],
    },
  ],
  navContatos: [
    { title: "Favorecidos", url: "/dashboard/favorecidos", icon: <UsersIcon /> },
    { title: "Fornecedores", url: "/dashboard/fornecedores", icon: <Building2Icon /> },
    { title: "Clientes", url: "/dashboard/clientes", icon: <UserIcon /> },
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
        <NavMain label="Financeiro" items={data.navFinanceiro} />
        <NavMain label="Contatos" items={data.navContatos} />
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
