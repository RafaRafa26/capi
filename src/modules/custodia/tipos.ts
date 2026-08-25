// Tipos compartilhados entre servidor e cliente (fora do servico.ts, que
// importa o driver do banco).

export type PosicaoFavorecido = {
  favorecidoId: string;
  nome: string;
  documento: string;
  creditos: number;
  debitos: number;
  /** Repasses gerados e ainda não conciliados — reservam saldo (RN-09). */
  reservado: number;
  /** creditos − debitos − reservado (RN-09). */
  disponivel: number;
};
