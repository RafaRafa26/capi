"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contato, PapelContato, TipoPessoa } from "@/lib/mock-data/contatos";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const PAPEIS: { value: PapelContato; label: string }[] = [
  { value: "PAGADOR", label: "Cliente" },
  { value: "FAVORECIDO", label: "Favorecido" },
  { value: "FORNECEDOR", label: "Fornecedor" },
];

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

export function ContatoForm({ contato }: { contato?: Contato }) {
  const router = useRouter();
  const isEditing = Boolean(contato);

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(contato?.tipoPessoa ?? "FISICA");
  const [papeis, setPapeis] = useState<PapelContato[]>(contato?.papeis ?? []);

  const backHref = contato ? `/contatos/${contato.id}` : "/contatos";

  function togglePapel(value: PapelContato) {
    setPapeis((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success(isEditing ? "Contato atualizado." : "Contato criado.");
    router.push(backHref);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            Contatos {'>'} {isEditing ? "Editar contato" : "Novo contato"}
          </p>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar contato" : "Novo contato"}
          </h1>
        </div>

        <FormSection number={1} title="Identificação">
          <div className="flex items-end gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="nome">
                Nome completo / Razão social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={contato?.nome}
                placeholder="Nome completo ou Razão social da empresa"
                required
              />
            </div>
            <div className="flex w-[300px] flex-col gap-2">
              <Label>Tipo de pessoa</Label>
              <RadioGroup
                value={tipoPessoa}
                onValueChange={(value) => setTipoPessoa(value as TipoPessoa)}
                className="flex h-9 items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="FISICA" id="tipo-fisica" />
                  <Label htmlFor="tipo-fisica" className="font-normal">
                    Pessoa física
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="JURIDICA" id="tipo-juridica" />
                  <Label htmlFor="tipo-juridica" className="font-normal">
                    Pessoa jurídica
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex w-[340px] flex-col gap-2">
              <Label htmlFor="documento">
                Documento ({tipoPessoa === "FISICA" ? "CPF" : "CNPJ"}){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documento"
                name="documento"
                defaultValue={contato?.documento}
                placeholder={tipoPessoa === "FISICA" ? "000.000.000-00" : "00.000.000/0000-00"}
                required
              />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Papéis">
          <div className="flex flex-col gap-2">
            <div className="flex gap-6">
              {PAPEIS.map((item) => (
                <div key={item.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`papel-${item.value}`}
                    checked={papeis.includes(item.value)}
                    onCheckedChange={() => togglePapel(item.value)}
                  />
                  <Label htmlFor={`papel-${item.value}`} className="font-normal">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              Selecione os papéis deste contato no sistema
            </p>
          </div>
        </FormSection>

        <FormSection number={3} title="Contato">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={contato?.telefone} placeholder="(00) 00000-0000" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={contato?.email} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" defaultValue={contato?.cidade} placeholder="Selecione ou digite a cidade" />
            </div>
            <div className="flex w-[200px] flex-col gap-2">
              <Label htmlFor="estado">Estado (UF)</Label>
              <Select name="estado" defaultValue={contato?.estado}>
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection number={4} title="Dados bancários">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" name="banco" defaultValue={contato?.banco} placeholder="Banco do Brasil" />
            </div>
            <div className="flex w-[340px] flex-col gap-2">
              <Label htmlFor="tipoConta">Tipo de conta</Label>
              <Select name="tipoConta" defaultValue={contato?.tipoConta}>
                <SelectTrigger id="tipoConta" className="w-full">
                  <SelectValue placeholder="Conta corrente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conta corrente">Conta corrente</SelectItem>
                  <SelectItem value="Conta poupança">Conta poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" name="agencia" defaultValue={contato?.agencia} placeholder="0000" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="conta">Conta</Label>
              <Input id="conta" name="conta" defaultValue={contato?.conta} placeholder="00000-0" />
            </div>
          </div>
        </FormSection>

        <FormSection number={5} title="PIX">
          <div className="flex gap-4">
            <div className="flex w-[280px] flex-col gap-2">
              <Label htmlFor="tipoChavePix">Tipo de chave</Label>
              <Select name="tipoChavePix" defaultValue={contato?.tipoChavePix}>
                <SelectTrigger id="tipoChavePix" className="w-full">
                  <SelectValue placeholder="CPF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Aleatória">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="chavePix">Chave PIX</Label>
              <Input id="chavePix" name="chavePix" defaultValue={contato?.chavePix} placeholder="Digite a chave PIX" />
            </div>
          </div>
        </FormSection>
      </div>

      <div className="bg-card border-border sticky bottom-0 flex items-center justify-between border-t px-6 py-4 md:px-10">
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>Cancelar</Link>
        </Button>
        <Button type="submit">{isEditing ? "Salvar alterações" : "Salvar contato"}</Button>
      </div>
    </form>
  );
}
