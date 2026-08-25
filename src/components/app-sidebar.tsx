"use client";

// Client component de propósito: os itens de navegação carregam ícones (que
// são funções React) e funções não atravessam a fronteira servidor→cliente.
// Aqui eles são importados já dentro do bundle do cliente; do servidor só
// chegam os dados de usuário e organização, que são objetos simples.

import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  configuracoesGroup,
  contatosNav,
  navMainGroups,
} from "@/components/nav-data";

export function AppSidebar({
  usuario,
  organizacao,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  usuario: { nome: string; email: string };
  organizacao: { nome: string; documento: string };
}) {
  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: organizacao.nome,
              document: organizacao.documento,
              logo: GalleryVerticalEnd,
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        {navMainGroups.map((group, index) => (
          <NavMain key={group.label ?? `group-${index}`} label={group.label} items={group.items} />
        ))}
        <NavProjects label={contatosNav.label} items={contatosNav.items} />
        <NavMain items={configuracoesGroup.items} />
      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
        <NavUser user={{ name: usuario.nome, email: usuario.email }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
