import Link from "next/link";
import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Página estática, deliberadamente sem nenhuma consulta: é para onde o app
// manda o visitante quando não há banco utilizável (ver sessaoAtual em
// modules/auth/sessao.ts). Se ela também tocasse o banco, viraria loop.

export default function ConfiguracaoPendentePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="border-border bg-card flex w-full max-w-[560px] flex-col gap-5 rounded-xl border p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#fff7ed] text-[#f76b15]">
            <Database className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Banco de dados não disponível</h1>
            <p className="text-muted-foreground text-sm">
              O app está no ar, mas não conseguiu se conectar ao PostgreSQL.
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 text-sm">
          <p>Para este ambiente funcionar, é preciso:</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>
              Um banco <strong>PostgreSQL</strong> acessível (Neon, Supabase,
              Railway, ou o Docker local do projeto).
            </li>
            <li>
              As variáveis de ambiente <code className="bg-muted rounded px-1 py-0.5">DATABASE_URL</code>{" "}
              e <code className="bg-muted rounded px-1 py-0.5">DATABASE_URL_APP</code>{" "}
              configuradas na plataforma (ou no <code className="bg-muted rounded px-1 py-0.5">.env</code>,
              copiando o <code className="bg-muted rounded px-1 py-0.5">.env.example</code>).
            </li>
            <li>
              As migrações aplicadas:{" "}
              <code className="bg-muted rounded px-1 py-0.5">npx prisma migrate deploy</code>.
            </li>
          </ol>
          <p className="text-muted-foreground">
            Com o banco no ar, o primeiro acesso cria os dados iniciais sozinho —
            não é preciso rodar seed. O passo a passo completo está no README do
            projeto.
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Capi — gestão de recebimentos e repasses
          </p>
          <Button asChild>
            <Link href="/dashboard">Tentar novamente</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
