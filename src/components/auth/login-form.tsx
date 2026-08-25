"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

import { entrarAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, iniciarEntrada] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErro(null);

    iniciarEntrada(async () => {
      const resultado = await entrarAction(form);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@exemplo.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/esqueci-senha" className="text-sm hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {erro ? (
        <div className="border-destructive/40 bg-destructive/10 flex items-center gap-3 rounded-md border px-4 py-3">
          <AlertTriangle className="text-destructive size-4 shrink-0" />
          <p className="text-destructive text-sm font-medium">{erro}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </Button>
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">Ou continue com</span>
          <Separator className="flex-1" />
        </div>
        {/* Login social ainda não implementado (AD-05 prevê e-mail/senha na v1). */}
        <Button type="button" variant="outline" className="w-full" disabled>
          Google
        </Button>
      </div>
    </form>
  );
}
