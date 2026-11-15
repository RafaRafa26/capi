"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ctaClassName } from "./primitives"

// Phones only: once the hero's own button scrolls away, keep the action one
// thumb away. `watch` is the id of the element whose visibility hides the bar.
export function StickyCta({ watch }: { watch: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById(watch)
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [watch])

  return (
    <div
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <Link href="/signup" className={cn(buttonVariants(), ctaClassName, "w-full hover:translate-y-0")}>
        Criar conta grátis
      </Link>
    </div>
  )
}
