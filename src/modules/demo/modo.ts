import "server-only";

import { cache } from "react";

import { prismaAdmin } from "@/db/client";
import { ehBancoIndisponivel } from "@/db/indisponivel";
import { ErroDeNegocio } from "@/shared/erros";

/**
 * MODO DEMONSTRAÇÃO.
 *
 * O app precisa abrir e ser navegável mesmo sem banco — em preview, numa
 * avaliação, numa máquina sem Postgres. Quando o banco não responde, cada
 * tela cai para os dados de `./dados.ts` em vez de estourar erro.
 *
 * A decisão é automática e por requisição: com banco no ar, nada aqui é
 * usado e os dados reais mandam. Para forçar o modo demo mesmo com banco
 * disponível (útil para demonstrar sem tocar em dados reais), defina
 * CAPI_MODO_DEMO=1.
 *
 * `cache` do React garante uma única verificação por render, em vez de uma
 * por consulta.
 */
export const modoDemo = cache(async (): Promise<boolean> => {
  if (process.env.CAPI_MODO_DEMO === "1") return true;

  try {
    // Consulta trivial: só interessa saber se a conexão se estabelece.
    await prismaAdmin.$queryRaw`SELECT 1`;
    return false;
  } catch (erro) {
    if (ehBancoIndisponivel(erro)) return true;
    throw erro;
  }
});

/**
 * Barra escritas no modo demonstração.
 *
 * Sem banco não há onde gravar, e deixar o formulário anunciar "salvo com
 * sucesso" para em seguida o registro sumir seria pior do que recusar. As
 * server actions chamam isto antes de tocar no serviço.
 */
export async function recusarEscritaNoDemo() {
  if (await modoDemo()) {
    throw new ErroDeNegocio(
      "Modo demonstração: os dados são de exemplo e nada é salvo. Configure o banco de dados para editar de verdade.",
    );
  }
}

/**
 * Busca no banco, com queda para os dados de demonstração.
 *
 * Envolve a consulta real: se o banco estiver indisponível — inclusive por
 * ter caído no meio da requisição — devolve o mock em vez de derrubar a tela.
 */
export async function comQuedaParaDemo<T>(
  consulta: () => Promise<T>,
  demo: T | (() => T),
): Promise<T> {
  const resolverDemo = () => (typeof demo === "function" ? (demo as () => T)() : demo);

  if (await modoDemo()) return resolverDemo();

  try {
    return await consulta();
  } catch (erro) {
    if (ehBancoIndisponivel(erro)) return resolverDemo();
    throw erro;
  }
}
