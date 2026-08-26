"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import { recusarEscritaNoDemo } from "@/modules/demo/modo";
import { gerarRepasse } from "@/modules/lancamentos/servico";
import { falha, type Resultado } from "@/shared/erros";

export async function gerarRepasseAction(entrada: {
  favorecidoId: string;
  valor: number;
  vencimento: string;
  categoriaId: string;
}): Promise<Resultado<{ id: string }>> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();

    if (!entrada.categoriaId) {
      return {
        ok: false,
        erro: "Cadastre uma categoria de despesa para classificar o repasse.",
      };
    }

    const repasse = await gerarRepasse(
      sessao.organizacaoId,
      entrada.favorecidoId,
      entrada.valor,
      entrada.vencimento,
      entrada.categoriaId,
    );

    revalidatePath("/repasses");
    revalidatePath("/conciliacao");
    return { ok: true, dados: { id: repasse.id } };
  } catch (erro) {
    return falha(erro);
  }
}
