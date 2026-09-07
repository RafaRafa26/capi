import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { currentSession } from "@/modules/auth/session"

export default async function LoginPage() {
  if (await currentSession()) redirect("/dashboard")

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="flex w-full max-w-[350px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Entrar na sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Insira seu e-mail e senha para continuar.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
