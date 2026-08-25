"use client";

// Error boundary global: substitui a tela genérica do Next por uma mensagem
// em português com ação de recuperação. Em produção o Next redige a mensagem
// original do erro (chega só um digest), então não há o que exibir dela.

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="border-border bg-card flex w-full max-w-[480px] flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#fff5f5] text-[#e5484d]">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Algo deu errado</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ocorreu um erro inesperado ao carregar esta página.
            {error.digest ? ` (código ${error.digest})` : null}
          </p>
        </div>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  );
}
