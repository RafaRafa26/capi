import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <div className="flex min-h-svh items-stretch">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden rounded-r-xl border-r bg-zinc-950 p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,88,12,0.25),transparent_55%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-r from-[#ea580c] to-[#f97316]">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <span className="text-xl font-bold text-white">Capi</span>
        </div>
        <p className="relative z-10 max-w-sm text-sm text-zinc-400">
          Gestão de recebimentos e repasses de terceiros — uma conta corrente
          por favorecido, com saldo derivado da conciliação bancária.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex w-full max-w-[350px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Entrar na sua conta</h1>
            <p className="text-muted-foreground text-sm">
              Insira seu e-mail abaixo para acessar sua conta
            </p>
          </div>

          <form className="flex flex-col gap-4" action="/dashboard">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="m@exemplo.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/esqueci-senha" className="text-sm hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>

            {hasError ? (
              <div className="border-destructive/40 bg-destructive/10 flex items-center gap-3 rounded-md border px-4 py-3">
                <AlertTriangle className="text-destructive size-4 shrink-0" />
                <p className="text-destructive text-sm font-medium">
                  E-mail ou senha inválidos. Tente novamente.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
              <Button type="submit" className="w-full">
                Entrar
              </Button>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-muted-foreground text-xs">Ou continue com</span>
                <Separator className="flex-1" />
              </div>
              <Button type="button" variant="outline" className="w-full">
                Google
              </Button>
            </div>
          </form>

          <p className="flex justify-center gap-1 text-sm">
            <span className="text-muted-foreground">Não tem uma conta?</span>
            <Link href="/cadastro" className="font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
