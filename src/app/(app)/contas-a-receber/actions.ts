"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import {
  cancelarLancamento,
  criarLancamento,
  criarRecebimentosParcelados,
  lancamentoEsquema,
} from "@/modules/lancamentos/servico";
import { falha, type Resultado } from "@/shared/erros";

export type EntradaLancamento = {
  tipo: "RECEBIMENTO" | "PAGAMENTO";
  contatoId: string;
  categoriaId: string;
  centroCustoId?: string | null;
  contaBancariaId?: string | null;
  descricao?: string | null;
  vencimento: string;
  valorPrevisto: number;
  destinacoes: {
    favorecidoId: string;
    modo: "PERCENTUAL" | "VALOR_FIXO";
    valor: number;
  }[];
  /** Quando > 1, o valor informado é o TOTAL e vira N parcelas. */
  parcelas?: number;
  periodicidade?: "Mensal" | "Quinzenal" | "Semanal" | "Anual";
};

export async function criarLancamentoAction(
  entrada: EntradaLancamento,
): Promise<Resultado<{ criados: number }>> {
  try {
    const sessao = await exigirSessao();

    const parsed = lancamentoEsquema.safeParse(entrada);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, erro: issue.message, campo: String(issue.path[0] ?? "") };
    }

    const parcelas = entrada.parcelas ?? 1;
    const criados =
      parcelas > 1
        ? await criarRecebimentosParcelados(
            sessao.organizacaoId,
            parsed.data,
            parcelas,
            entrada.periodicidade ?? "Mensal",
          )
        : [await criarLancamento(sessao.organizacaoId, parsed.data)];

    revalidatePath("/contas-a-receber");
    revalidatePath("/conciliacao");
    return { ok: true, dados: { criados: criados.length } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function cancelarLancamentoAction(id: string): Promise<Resultado> {
  try {
    const sessao = await exigirSessao();
    await cancelarLancamento(sessao.organizacaoId, id);
    revalidatePath("/contas-a-receber");
    revalidatePath("/conciliacao");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
