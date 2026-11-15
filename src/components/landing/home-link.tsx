"use client"

import Link from "next/link"

import { Logo } from "./primitives"

// The logo in the header. The visitor is already on the page it links to,
// so a click goes back to the top instead of navigating.
export function HomeLink() {
  return (
    <Link
      href="/"
      aria-label="Capi Gestão, voltar ao início da página"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
      }}
      className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Logo />
    </Link>
  )
}
