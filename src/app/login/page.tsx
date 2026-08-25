import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { sessaoAtual } from "@/modules/auth/sessao";

export default async function LoginPage() {
  // Quem já está logado não precisa ver o login de novo.
  if (await sessaoAtual()) redirect("/dashboard");

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

          <LoginForm />

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
