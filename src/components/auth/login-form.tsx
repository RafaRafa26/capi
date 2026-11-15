"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { signInAction } from "@/app/(auth)/login/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({ next, signUpHref }: { next: string | null; signUpHref: string }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const result = await signInAction(new FormData(event.currentTarget))

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    // "/" picks the company (last one opened, or the picker).
    router.push(next ?? "/")
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="mb-3 flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight">Bem-vindo de volta.</h1>
          <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha para continuar.</p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            aria-invalid={error ? true : undefined}
            className="h-11 px-3.5"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            className="h-11 px-3.5"
            required
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Field>
          <Button type="submit" className="h-11 text-base" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
          <FieldDescription className="mt-4 text-center">
            Ainda não tem conta?{" "}
            <Link href={signUpHref} className="font-medium text-foreground">
              Criar conta
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
