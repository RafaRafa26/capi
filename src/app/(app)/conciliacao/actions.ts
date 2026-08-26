"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import { recusarEscritaNoDemo } from "@/modules/demo/modo";
import { ignorarTransacao, importarOfx, reabrirTransacao } from "@/modules/extrato/servico";
import {
  conciliar,
  darBaixaManual,
  desfazerLiquidacao,
  type LinhaConciliacao,
} from "@/modules/liquidacao/servico";
import { falha, type Resultado } from "@/shared/erros";

// 8 MB: extrato de um ano de uma conta movimentada não passa disso, e o limite
// evita que um arquivo enorme ocupe memória do servidor à toa.
const TAMANHO_MAXIMO = 8 * 1024 * 1024;

export type ResumoImportacao = {
  lidas: number;
  importadas: number;
  duplicadas: number;
};

export async function importarOfxAction(
  form: FormData,
): Promise<Resultado<ResumoImportacao>> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();

    const contaId = String(form.get("contaId") ?? "");
    const arquivo = form.get("arquivo");

    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return { ok: false, erro: "Selecione um arquivo OFX." };
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { ok: false, erro: "Arquivo maior que 8 MB." };
    }

    // OFX 1.x costuma vir em latin-1; ler como UTF-8 estragaria os acentos das
    // descrições. Detectamos pelo cabeçalho CHARSET quando ele existe.
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const amostra = bytes.subarray(0, 512).toString("latin1");
    const ehLatin1 = /CHARSET:\s*(1252|8859-1)/i.test(amostra);
    const conteudo = bytes.toString(ehLatin1 ? "latin1" : "utf8");

    const resultado = await importarOfx(
      sessao.organizacaoId,
      sessao.usuarioId,
      contaId,
      arquivo.name,
      conteudo,
    );

    revalidatePath("/conciliacao");
    revalidatePath(`/contas-bancarias/${contaId}/extrato`);

    return {
      ok: true,
      dados: {
        lidas: resultado.lidas,
        importadas: resultado.importadas,
        duplicadas: resultado.duplicadas,
      },
    };
  } catch (erro) {
    return falha(erro);
  }
}

export async function conciliarAction(
  transacaoId: string,
  linhas: LinhaConciliacao[],
  rateioConfirmado?: Record<string, number[]>,
): Promise<Resultado<{ restante: number }>> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    const r = await conciliar(
      sessao.organizacaoId,
      sessao.usuarioId,
      transacaoId,
      linhas,
      rateioConfirmado,
    );

    revalidatePath("/conciliacao");
    revalidatePath("/repasses");
    return { ok: true, dados: { restante: r.restante } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function darBaixaManualAction(
  linhas: LinhaConciliacao[],
  dataLiquidacao: string,
  contaBancariaId: string | null,
  observacao?: string,
): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await darBaixaManual(
      sessao.organizacaoId,
      sessao.usuarioId,
      linhas,
      dataLiquidacao,
      contaBancariaId,
      observacao,
    );

    revalidatePath("/contas-a-receber");
    revalidatePath("/conciliacao");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function desfazerLiquidacaoAction(
  liquidacaoId: string,
): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await desfazerLiquidacao(sessao.organizacaoId, liquidacaoId);

    revalidatePath("/conciliacao");
    revalidatePath("/contas-a-receber");
    revalidatePath("/repasses");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function ignorarTransacaoAction(id: string): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await ignorarTransacao(sessao.organizacaoId, id);
    revalidatePath("/conciliacao");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function reabrirTransacaoAction(id: string): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await reabrirTransacao(sessao.organizacaoId, id);
    revalidatePath("/conciliacao");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
