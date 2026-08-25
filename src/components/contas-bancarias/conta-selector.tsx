"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContaBancaria } from "@/modules/contas-bancarias/tipos";

export function ContaSelector({
  contas,
  contaId,
}: {
  contas: ContaBancaria[];
  contaId: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={contaId}
      onValueChange={(value) => router.push(`/contas-bancarias/${value}/extrato`)}
    >
      <SelectTrigger className="w-[340px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {contas.map((conta) => (
          <SelectItem key={conta.id} value={conta.id}>
            {conta.nome} — {conta.banco}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
