import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { safeNextPath } from "@/lib/org-path"
import { currentUser } from "@/modules/auth/session"

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)
  const email = typeof params.email === "string" ? params.email : ""

  if (await currentUser()) redirect(next ?? "/")

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login"

  return (
    <AuthShell title="Criar conta" description="Depois de criar a conta, você cadastra sua empresa ou entra na de quem te convidou.">
      <SignUpForm next={next} defaultEmail={email} />
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href={loginHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
