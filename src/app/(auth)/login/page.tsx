import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"
import { safeNextPath } from "@/lib/org-path"
import { currentUser } from "@/modules/auth/session"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)

  if (await currentUser()) redirect(next ?? "/")

  const signUpHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"

  return (
    <AuthShell title="Entrar na sua conta" description="Insira seu e-mail e senha para continuar.">
      <LoginForm next={next} />
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href={signUpHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
