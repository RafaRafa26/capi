"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// Fades a block up the first time it scrolls into view. The server renders
// it visible, so it reads without JavaScript; only blocks still below the
// fold are hidden to animate in, and never for visitors who prefer reduced
// motion.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (element.getBoundingClientRect().top < window.innerHeight) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setHidden(false)
        observer.disconnect()
      },
      { rootMargin: "0px 0px -80px 0px" }
    )
    // Hide and start watching in the same frame, so nothing flashes.
    const frame = requestAnimationFrame(() => {
      setHidden(true)
      observer.observe(element)
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: hidden ? undefined : `${delay}s` }}
      className={cn(
        "transition-[opacity,translate] duration-500 ease-out",
        hidden && "translate-y-6 opacity-0 duration-0",
        className
      )}
    >
      {children}
    </div>
  )
}
