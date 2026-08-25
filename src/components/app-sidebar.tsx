"use client";

import * as React from "react";

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
  currentUser,
  navMainGroups,
  teams,
} from "@/components/nav-data";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
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
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
