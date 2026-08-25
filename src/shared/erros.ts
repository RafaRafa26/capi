/**
 * Erros que a borda sabe traduzir para o usuário. Qualquer outra exceção é
 * defeito nosso e não deve ter a mensagem exibida — pode vazar detalhe de
 * banco ou de infraestrutura.
 */
export class ErroDeNegocio extends Error {
  constructor(
    message: string,
    readonly campo?: string,
  ) {
    super(message);
    this.name = "ErroDeNegocio";
  }
}

export class NaoAutenticado extends Error {
  constructor(message = "Sessão expirada. Entre novamente.") {
    super(message);
    this.name = "NaoAutenticado";
  }
}

export class NaoEncontrado extends ErroDeNegocio {
  constructor(oQue = "Registro") {
    super(`${oQue} não encontrado.`);
    this.name = "NaoEncontrado";
  }
}

/** Resultado padrão das server actions consumidas por formulário. */
export type Resultado<T = void> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campo?: string };

export function falha(erro: unknown): { ok: false; erro: string; campo?: string } {
  if (erro instanceof ErroDeNegocio) {
    return { ok: false, erro: erro.message, campo: erro.campo };
  }
  if (erro instanceof NaoAutenticado) {
    return { ok: false, erro: erro.message };
  }
  console.error("Erro inesperado:", erro);
  return {
    ok: false,
    erro: "Não foi possível concluir a operação. Tente novamente.",
  };
}
