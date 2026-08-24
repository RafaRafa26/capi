"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BANCOS, type ContaBancaria, type NaturezaConta } from "@/lib/mock-data/contas-bancarias";

function FormSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">
          {number}. {title}
        </p>
        <div className="border-border border-t" />
      </div>
      {children}
    </div>
  );
}

function NaturezaCard({
  value,
  selected,
  title,
  description,
  onSelect,
}: {
  value: NaturezaConta;
  selected: boolean;
  title: string;
  description: string;
  onSelect: (value: NaturezaConta) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex flex-1 items-start gap-3 rounded-lg border p-4 text-left transition-colors",
        selected ? "border-primary" : "border-border hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-border",
        )}
      >
        {selected ? <span className="bg-primary size-2 rounded-full" /> : null}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </button>
  );
}

export function ContaBancariaForm({ conta }: { conta?: ContaBancaria }) {
  const router = useRouter();
  const isEditing = Boolean(conta);

  const [natureza, setNatureza] = useState<NaturezaConta>(conta?.natureza ?? "PROPRIA");
  const [ativa, setAtiva] = useState(conta?.ativa ?? true);

  const backHref = "/contas-bancarias";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success(isEditing ? "Conta bancária atualizada." : "Conta bancária criada.");
    router.push(backHref);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            Contas bancárias {'>'} {isEditing ? "Editar conta" : "Nova conta"}
          </p>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar conta bancária" : "Nova conta bancária"}
          </h1>
        </div>

        <FormSection number={1} title="Dados da conta">
          <div className="flex items-end gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="nome">
                Nome da conta <span className="text-destructive">*</span>
              </Label>
              <Input id="nome" name="nome" defaultValue={conta?.nome} placeholder="Ex: Conta Principal" required />
            </div>
            <div className="flex w-[340px] flex-col gap-2">
              <Label htmlFor="banco">
                Banco <span className="text-destructive">*</span>
              </Label>
              <Select name="banco" defaultValue={conta?.banco} required>
                <SelectTrigger id="banco" className="w-full">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS.map((banco) => (
                    <SelectItem key={banco} value={banco}>
                      {banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="agencia">
                Agência <span className="text-destructive">*</span>
              </Label>
              <Input id="agencia" name="agencia" defaultValue={conta?.agencia} placeholder="0000" required />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="conta">
                Conta <span className="text-destructive">*</span>
              </Label>
              <Input id="conta" name="conta" defaultValue={conta?.conta} placeholder="00000-0" required />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Natureza da conta">
          <div className="flex gap-4">
            <NaturezaCard
              value="PROPRIA"
              selected={natureza === "PROPRIA"}
              onSelect={setNatureza}
              title="Conta própria"
              description="Conta da sua empresa. Permite importação de extrato bancário e conciliação."
            />
            <NaturezaCard
              value="TERCEIRO"
              selected={natureza === "TERCEIRO"}
              onSelect={setNatureza}
              title="Conta de terceiro"
              description="Conta de parceiro/favorecido. Gera controle de custódia sobre os valores."
            />
          </div>
        </FormSection>

        <FormSection number={3} title="Saldo inicial">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="saldoInicial">Saldo inicial</Label>
              <Input
                id="saldoInicial"
                name="saldoInicial"
                defaultValue={
                  conta ? (conta.saldoInicial / 100).toFixed(2).replace(".", ",") : undefined
                }
                placeholder="R$ 0,00"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="dataSaldoInicial">Data do saldo inicial</Label>
              <Input
                id="dataSaldoInicial"
                name="dataSaldoInicial"
                type="date"
                defaultValue={conta?.dataSaldoInicial}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Informe o saldo da conta na data de início de uso do sistema
          </p>
        </FormSection>

        <FormSection number={4} title="Situação">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Switch id="ativa" checked={ativa} onCheckedChange={setAtiva} />
              <Label htmlFor="ativa" className="font-normal">
                Conta ativa
              </Label>
            </div>
            <p className="text-muted-foreground text-sm">
              Contas inativas não aparecem na visão geral e não recebem novos lançamentos
            </p>
          </div>
        </FormSection>
      </div>

      <div className="bg-card border-border sticky bottom-0 flex items-center justify-between border-t px-6 py-4 md:px-10">
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>Cancelar</Link>
        </Button>
        <Button type="submit">{isEditing ? "Salvar alterações" : "Salvar conta"}</Button>
      </div>
    </form>
  );
}
