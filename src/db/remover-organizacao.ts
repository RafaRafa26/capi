import type { PrismaClient } from "./generated/client";

/**
 * Apaga uma organização inteira, em ordem de dependência.
 *
 * Não dá para confiar só no `ON DELETE CASCADE` do vínculo com `organizacao`:
 * várias chaves apontam para `contato`, `categoria` e `conta_bancaria` com
 * `Restrict` — e isso é proposital, porque no uso normal do sistema ninguém
 * pode apagar um contato que já tem destinação ou movimento de custódia
 * (§3.3, auditabilidade). Ao derrubar o tenant inteiro, porém, tudo vai
 * junto, então as folhas precisam sair antes.
 *
 * Usado pelo seed (que recria a organização de demonstração) e pelos testes
 * de banco (que criam e destroem organizações descartáveis).
 */
export async function removerOrganizacao(prisma: PrismaClient, id: string) {
  // Ordem importa: cada linha depende das de cima já terem saído.
  await prisma.movimentoCustodia.deleteMany({ where: { organizacaoId: id } });
  await prisma.liquidacao.deleteMany({ where: { organizacaoId: id } });
  await prisma.destinacao.deleteMany({
    where: { lancamento: { organizacaoId: id } },
  });
  await prisma.lancamento.deleteMany({ where: { organizacaoId: id } });
  await prisma.transacaoBancaria.deleteMany({ where: { organizacaoId: id } });
  await prisma.importacao.deleteMany({ where: { organizacaoId: id } });

  // O resto (usuário, sessão, contato, categoria, centro de custo, conta
  // bancária) cai por cascade a partir daqui.
  await prisma.organizacao.delete({ where: { id } });
}
