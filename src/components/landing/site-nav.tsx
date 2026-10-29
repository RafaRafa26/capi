"use client"

import { useState } from "react"
import { Columns3, Menu, Sparkles, Users, Workflow } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// Anchors to the landing page sections (see the `id`s in landing-page.tsx).
const PRODUCT = [
  { href: "#como-funciona", icon: Workflow, title: "Como funciona", text: "Lorem ipsum dolor sit amet consectetur." },
  { href: "#beneficios", icon: Sparkles, title: "Benefícios", text: "Adipiscing elit sed do eiusmod tempor." },
  { href: "#comparativo", icon: Columns3, title: "Comparativo", text: "Incididunt ut labore et dolore magna." },
  { href: "#para-quem", icon: Users, title: "Para quem é", text: "Aliqua enim ad minim veniam quis." },
]

const LINKS = [
  { href: "#depoimentos", title: "Depoimentos" },
  { href: "#planos", title: "Planos" },
  { href: "#faq", title: "Dúvidas" },
]

export function DesktopNav() {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Produto</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[30rem] grid-cols-2 gap-1 p-1">
              {PRODUCT.map(({ href, icon: Icon, title, text }) => (
                <li key={href}>
                  <NavigationMenuLink href={href} className="items-start gap-3 p-3">
                    <Icon className="mt-0.5 size-4 text-brand-strong" aria-hidden />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{title}</span>
                      <span className="text-muted-foreground">{text}</span>
                    </span>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
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
          {[...PRODUCT, ...LINKS].map(({ href, title }) => (
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
