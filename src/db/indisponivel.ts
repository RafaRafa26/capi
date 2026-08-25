/**
 * Reconhece erros que significam "não há banco utilizável agora" — variável
 * de ambiente ausente, servidor fora do ar, DNS, credencial recusada —
 * para distingui-los de defeitos da aplicação.
 *
 * Usado na resolução de sessão: como toda rota começa resolvendo a sessão,
 * capturar ali cobre o app inteiro, e o visitante vê uma página de
 * orientação em vez do error boundary genérico do Next.
 */

const PADROES = [
  /não está definida/i, // nosso próprio erro de env ausente (db/client.ts)
  /can't reach database server/i, // Prisma P1001
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /ETIMEDOUT/,
  /Connection terminated/i,
  /password authentication failed/i, // Postgres 28P01
  /database .* does not exist/i, // Postgres 3D000
  /SSL connection has been closed/i,
];

export function ehBancoIndisponivel(erro: unknown): boolean {
  let atual: unknown = erro;
  // Desce pela cadeia de `cause`: o driver embrulha o erro de rede algumas
  // camadas para dentro.
  for (let i = 0; i < 6 && atual instanceof Error; i++) {
    const texto = `${atual.name}: ${atual.message}`;
    if (PADROES.some((p) => p.test(texto))) return true;
    if (atual.name === "PrismaClientInitializationError") return true;
    atual = atual.cause;
  }
  return false;
}
