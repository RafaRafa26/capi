import Image from "next/image"

import { cn } from "@/lib/utils"

export type CoverVariant = "mascote" | "mes" | "fluxo" | "produto"

// Day states for the "mês" cover: r = recebido, a = a receber, p = a pagar.
const DAYS: Record<number, "r" | "a" | "p"> = {
  2: "r", 5: "r", 6: "p", 9: "r", 12: "r", 13: "p", 16: "r",
  20: "a", 22: "p", 24: "a", 27: "a", 28: "p", 30: "a",
}
const TODAY = 18

export function LoginCover({ variant }: { variant: CoverVariant }) {
  if (variant === "mascote") {
    return (
      <div aria-hidden className="absolute inset-0 bg-capi-purple">
        <Image
          src="/brand/mark-branco.svg"
          alt=""
          width={392}
          height={412}
          className="absolute top-[-6%] left-[18%] w-[125%] max-w-none opacity-[0.13]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-capi-purple-dark/70 via-transparent to-transparent" />
      </div>
    )
  }

  if (variant === "mes") {
    return (
      <div aria-hidden className="absolute inset-0 bg-[#1d0b33]">
        <div className="absolute inset-x-12 top-36 grid grid-cols-7 gap-3 xl:inset-x-16">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 1 // month starts on the 3rd column
            const inMonth = day >= 1 && day <= 31
            const state = DAYS[day]
            return (
              <div
                key={i}
                className={cn(
                  "flex aspect-square items-start rounded-2xl p-2.5 font-mono text-xs",
                  !inMonth && "bg-white/[0.02]",
                  inMonth && "bg-white/[0.06] text-white/40",
                  inMonth && day < TODAY && !state && "bg-white/[0.1]",
                  state === "r" && "bg-capi-green text-capi-black/70",
                  state === "a" && "bg-capi-lilac text-white/90",
                  state === "p" && "bg-capi-purple text-white/80",
                  day === TODAY && "bg-capi-cream text-capi-black/70 ring-4 ring-capi-cream/25",
                )}
              >
                {inMonth ? day : ""}
              </div>
            )
          })}
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-[#1d0b33] from-25% via-[#1d0b33]/70 via-45% to-transparent to-70%" />
      </div>
    )
  }

  if (variant === "fluxo") {
    return (
      <div aria-hidden className="absolute inset-0 bg-capi-purple-dark">
        <svg viewBox="0 0 880 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="cover-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9e69fa" stopOpacity="0.55" />
              <stop offset="1" stopColor="#9e69fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[180, 280, 380, 480, 580].map((y) => (
            <line key={y} x1="0" x2="880" y1={y} y2={y} stroke="#fff" strokeOpacity="0.07" />
          ))}
          <path
            d="M0 520 H150 C200 520 210 400 260 400 H360 C410 400 420 300 470 300 H560 V900 H0 Z"
            fill="url(#cover-area)"
          />
          <path
            d="M0 520 H150 C200 520 210 400 260 400 H360 C410 400 420 300 470 300 H560"
            fill="none" stroke="#f4f0dc" strokeWidth="5" strokeLinecap="round"
          />
          <path
            d="M560 300 H620 C670 300 680 360 730 360 H780 C830 360 840 230 880 230"
            fill="none" stroke="#f4f0dc" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14"
          />
          <line x1="560" x2="560" y1="150" y2="900" stroke="#00ff9d" strokeOpacity="0.35" strokeDasharray="4 8" />
          <circle cx="560" cy="300" r="22" fill="#00ff9d" fillOpacity="0.2" />
          <circle cx="560" cy="300" r="9" fill="#00ff9d" />
        </svg>
        <span className="absolute top-[14%] left-[63.6%] -translate-x-1/2 rounded-full bg-capi-green px-3 py-1 text-sm font-semibold text-capi-black">
          hoje
        </span>
        <div className="absolute inset-0 bg-linear-to-t from-capi-purple-dark from-20% via-capi-purple-dark/60 via-45% to-transparent to-65%" />
      </div>
    )
  }

  return (
    <div aria-hidden className="absolute inset-0 bg-capi-purple">
      <div className="absolute top-[17%] left-[13%] w-[125%] overflow-hidden rounded-3xl border-[6px] border-white/20 shadow-2xl shadow-black/40">
        <Image src="/landing/painel.png" alt="" width={2208} height={1280} sizes="70vw" priority />
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-capi-purple-dark from-22% via-capi-purple-dark/75 via-42% to-transparent to-65%" />
    </div>
  )
}
