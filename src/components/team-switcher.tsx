"use client"

import Link from "next/link"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { formatDocument } from "@/lib/document"
import { orgPath } from "@/lib/org-path"
import type { UserOrganization } from "@/modules/organizations/types"

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?"
}

// Each company is a plain link to its own /o/<id>/ URL: switching is just
// navigating, and Ctrl/Cmd+click opens another company in a new tab while
// this one stays as it is.
export function TeamSwitcher({
  organizations,
  activeId,
}: {
  organizations: UserOrganization[]
  activeId: string
}) {
  const { isMobile } = useSidebar()
  const active = organizations.find((organization) => organization.id === activeId)
  if (!active) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              {initial(active.name)}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{active.name}</span>
              <span className="truncate text-xs">{formatDocument(active.document)}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Empresas
              </DropdownMenuLabel>
              {organizations.map((organization) => (
                <DropdownMenuLinkItem
                  key={organization.id}
                  render={<Link href={orgPath(organization.id, "/dashboard")} />}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border text-xs font-semibold">
                    {initial(organization.name)}
                  </div>
                  <span className="flex-1 truncate">{organization.name}</span>
                  {organization.id === activeId && <CheckIcon className="ml-2 size-4" />}
                </DropdownMenuLinkItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLinkItem render={<Link href="/orgs/new" />} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Nova empresa
                </div>
              </DropdownMenuLinkItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
