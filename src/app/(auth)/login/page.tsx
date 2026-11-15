import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginCover, type CoverVariant } from "@/components/auth/login-cover"
import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/landing/primitives"
import { safeNextPath } from "@/lib/org-path"
import { currentUser } from "@/modules/auth/session"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)

  if (await currentUser()) redirect(next ?? "/")

  const cover = (typeof params.cover === "string" ? params.cover : "mascote") as CoverVariant

  const signUpHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      {/* Cover: brand artwork with the logo on top and the promise at the bottom. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-capi-purple-dark p-12 text-white lg:flex xl:p-16">
        <LoginCover variant={cover} />
        <Link
          href="/"
          aria-label="Capi, ir para a página inicial"
          className="relative w-fit rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-white/60"
        >
          <Logo white className="h-12 sm:h-14" />
        </Link>
        <p className="relative max-w-[14ch] text-[clamp(2.75rem,4.6vw,5rem)] leading-[1.04] font-semibold tracking-tight text-balance">
          Chegue ao fim do mês sabendo, não torcendo.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link
          href="/"
          aria-label="Capi, ir para a página inicial"
          className="w-fit rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40 lg:hidden"
        >
          <Logo className="h-9 sm:h-9 dark:hidden" />
          <Logo white className="hidden h-9 sm:h-9 dark:block" />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm next={next} signUpHref={signUpHref} />
          </div>
        </div>
      </div>
    </div>
  )
}
