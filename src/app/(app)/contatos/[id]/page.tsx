import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { buscarContato } from "@/modules/contatos/servico";
import { contatosDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";
import { papelLabel } from "@/modules/contatos/tipos";

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default async function ContatoDetalhePage({
  params,
}: PageProps<"/contatos/[id]">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();
  const contato = await comQuedaParaDemo(
    () => buscarContato(sessao.organizacaoId, id),
    () => contatosDemo.find((c) => c.id === id) ?? contatosDemo[0],
  );

  if (!contato) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/contatos" className="text-muted-foreground hover:underline">
            Contatos
          </Link>
          <ChevronRight className="text-muted-foreground size-3" />
          <span className="font-medium">{contato.nome}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{contato.nome}</h1>
            <div className="flex gap-1.5">
              {contato.papeis.map((papel) => (
                <Badge key={papel} variant="secondary" className="rounded-full text-[10px] font-medium">
                  {papelLabel[papel]}
                </Badge>
              ))}
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full text-[11px] font-semibold",
                  contato.ativo
                    ? "bg-[#ecfdf5] text-[#218358]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {contato.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/contatos/${contato.id}/editar`}>Editar</Link>
            </Button>
            <Button variant="outline" className="border-destructive text-destructive hover:text-destructive">
              {contato.ativo ? "Inativar" : "Ativar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border-border flex flex-col gap-5 rounded-[10px] border p-6 shadow-sm">
        <p className="text-sm font-semibold">Dados cadastrais</p>
        <div className="flex flex-col gap-4">
          <div className="flex gap-6">
            <InfoField
              label="Tipo de pessoa"
              value={contato.tipoPessoa === "FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}
            />
            <InfoField label="Documento" value={contato.documento} />
            <InfoField label="Telefone" value={contato.telefone} />
            <InfoField label="E-mail" value={contato.email} />
          </div>
          <Separator />
          <div className="flex gap-6">
            <InfoField label="Cidade" value={contato.cidade} />
            <InfoField label="Estado" value={contato.estado} />
            <InfoField label="Banco" value={contato.banco} />
            <InfoField label="Agência" value={contato.agencia} />
          </div>
          <Separator />
          <div className="flex gap-6">
            <InfoField label="Conta" value={contato.conta} />
            <InfoField label="Tipo de conta" value={contato.tipoConta} />
            <InfoField
              label="Chave PIX"
              value={
                contato.chavePix && contato.tipoChavePix
                  ? `${contato.tipoChavePix} — ${contato.chavePix}`
                  : undefined
              }
            />
            <div className="flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
