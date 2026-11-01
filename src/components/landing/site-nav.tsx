"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// Anchors to the landing page sections (see the `id`s in landing-page.tsx).
const LINKS = [
  { href: "#problema", title: "O problema" },
  { href: "#efeito-capivara", title: "Efeito Capivara" },
  { href: "#planos", title: "Planos" },
  { href: "#garantia", title: "Garantia" },
  { href: "#faq", title: "Dúvidas" },
]

export function DesktopNav() {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {LINKS.map(({ href, title }) => (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink href={href} className={navigationMenuTriggerStyle()}>
              {title}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="size-9 lg:hidden" aria-label="Abrir menu" />}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Principal" className="flex flex-col gap-1 px-4 pb-6">
          {LINKS.map(({ href, title }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-brand/40"
            >
              {title}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
