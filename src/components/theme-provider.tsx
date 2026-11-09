"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// The public landing page is designed for the light theme only; the app
// keeps following the user's choice.
const LIGHT_ONLY_PATHS = new Set(["/"])

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname()
  const forcedTheme = LIGHT_ONLY_PATHS.has(pathname) ? "light" : props.forcedTheme

  return (
    <NextThemesProvider {...props} forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  )
}
