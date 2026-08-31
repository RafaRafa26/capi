"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="aria-expanded:bg-muted" />
            }
          >
            {theme === "light" ? <SunIcon /> : <MoonIcon />}
            <span>Tema</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-40">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon />
              Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon />
              Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <MonitorIcon />
              Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
