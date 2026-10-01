"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { formatBRL } from "@/lib/format"
import { useOrgPathname } from "@/hooks/use-org-path"

// "Ocultar valores" on the Visão geral: the toggle lives in the top bar
// (app layout) and the values in the page, so the state sits in a provider
// wrapping both. Kept in memory — survives navigation inside the app.

const HideValuesContext = React.createContext<{
  hidden: boolean
  toggle: () => void
}>({ hidden: false, toggle: () => {} })

export function HideValuesProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = React.useState(false)
  const value = React.useMemo(() => ({ hidden, toggle: () => setHidden((current) => !current) }), [hidden])
  return <HideValuesContext.Provider value={value}>{children}</HideValuesContext.Provider>
}

export function useHideValues() {
  return React.useContext(HideValuesContext)
}

/** A BRL amount that turns into "R$ •••••" while values are hidden. */
export function Money({ cents }: { cents: number }) {
  const { hidden } = useHideValues()
  return <>{hidden ? "R$ •••••" : formatBRL(cents)}</>
}

export function HideValuesButton() {
  const pathname = useOrgPathname()
  const { hidden, toggle } = useHideValues()

  if (pathname !== "/dashboard") return null

  const label = hidden ? "Mostrar valores" : "Ocultar valores"
  const Icon = hidden ? EyeOffIcon : EyeIcon

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={hidden}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-input bg-card transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon className="size-4" />
    </button>
  )
}
