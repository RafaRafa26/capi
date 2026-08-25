// Leitor de OFX (Open Financial Exchange).
//
// Por que um parser próprio em vez de biblioteca: os pacotes npm de OFX estão
// majoritariamente sem manutenção, e o ARQUITETURA.md §9 já registra
// "variações de formato OFX entre bancos" como risco em aberto. Ler só o
// subconjunto de que precisamos — o bloco de transações — cabe em pouca
// coisa e deixa cada decisão de tolerância explícita e testável.
//
// Cobre as duas gerações do formato:
//   OFX 1.x — SGML, tags de folha sem fechamento (<TRNAMT>10.00)
//   OFX 2.x — XML bem formado (<TRNAMT>10.00</TRNAMT>)

import { ErroDeNegocio } from "@/shared/erros";

export type TransacaoOfx = {
  /** FITID — identificador do banco, base da deduplicação (RN-16). */
  identificadorBanco: string;
  /** Data no formato YYYY-MM-DD. */
  data: string;
  /** Centavos inteiros; sinal indica entrada (+) ou saída (−). */
  valor: number;
  descricao: string;
};

export type ExtratoOfx = {
  transacoes: TransacaoOfx[];
  periodoInicio: string | null;
  periodoFim: string | null;
  contaBanco: string | null;
  numeroConta: string | null;
};

/**
 * Lê o valor de uma tag, aceitando as duas gerações do formato.
 *
 * Em OFX 1.x o valor termina no próximo `<` ou na quebra de linha; em 2.x há
 * tag de fechamento. `[^<\r\n]*` cobre os dois casos de uma vez.
 */
function tag(bloco: string, nome: string): string | null {
  const m = new RegExp(`<${nome}>([^<\r\n]*)`, "i").exec(bloco);
  return m ? m[1].trim() : null;
}

/**
 * Converte valor monetário do OFX para centavos inteiros.
 *
 * A especificação manda ponto como separador decimal e proíbe separador de
 * milhar. Alguns emissores brasileiros mandam vírgula assim mesmo, então
 * quando há vírgula ela é tratada como decimal e os pontos como milhar.
 *
 * O caso ambíguo é "1.234" sem vírgula: pela especificação é 1,234 (um real e
 * vinte e três centavos, arredondado); em quem emite errado seria mil
 * duzentos e trinta e quatro reais. Seguimos a especificação — decidir
 * diferente exigiria adivinhar, e o erro silencioso seria mil vezes maior.
 */
export function valorOfxParaCentavos(bruto: string): number {
  const limpo = bruto.trim().replace(/\s/g, "");
  if (limpo === "") throw new ErroDeNegocio("Transação do OFX sem valor.");

  const negativo = limpo.startsWith("-");
  const semSinal = limpo.replace(/^[+-]/, "");

  const normalizado = semSinal.includes(",")
    ? semSinal.replace(/\./g, "").replace(",", ".")
    : semSinal;

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    throw new ErroDeNegocio(`Valor inválido no OFX: "${bruto}"`);
  }

  const centavos = Math.round(numero * 100);
  return negativo ? -centavos : centavos;
}

/** DTPOSTED vem como YYYYMMDD ou YYYYMMDDHHMMSS[-3:BRT]; só a data importa. */
export function dataOfxParaISO(bruto: string): string {
  const digitos = bruto.trim().replace(/[^0-9]/g, "");
  if (digitos.length < 8) {
    throw new ErroDeNegocio(`Data inválida no OFX: "${bruto}"`);
  }
  const ano = digitos.slice(0, 4);
  const mes = digitos.slice(4, 6);
  const dia = digitos.slice(6, 8);

  const iso = `${ano}-${mes}-${dia}`;
  const teste = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(teste.getTime())) {
    throw new ErroDeNegocio(`Data inválida no OFX: "${bruto}"`);
  }
  return iso;
}

export function lerOfx(conteudo: string): ExtratoOfx {
  if (!/<OFX>/i.test(conteudo)) {
    throw new ErroDeNegocio(
      "Arquivo não parece ser um OFX válido: bloco <OFX> não encontrado.",
    );
  }

  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  const transacoes: TransacaoOfx[] = [];
  for (const bloco of blocos) {
    const fitid = tag(bloco, "FITID");
    const dtposted = tag(bloco, "DTPOSTED");
    const trnamt = tag(bloco, "TRNAMT");

    if (!fitid || !dtposted || !trnamt) {
      throw new ErroDeNegocio(
        "O OFX tem transação sem FITID, DTPOSTED ou TRNAMT — arquivo incompleto.",
      );
    }

    // MEMO é o campo usual; alguns bancos só preenchem NAME.
    const descricao = tag(bloco, "MEMO") ?? tag(bloco, "NAME") ?? "Sem descrição";

    // TRNAMT já vem com sinal. DEBIT com valor positivo é desvio conhecido de
    // alguns emissores; nesse caso o tipo declarado decide.
    let valor = valorOfxParaCentavos(trnamt);
    const tipo = tag(bloco, "TRNTYPE")?.toUpperCase();
    if (valor > 0 && (tipo === "DEBIT" || tipo === "PAYMENT" || tipo === "FEE")) {
      valor = -valor;
    }

    transacoes.push({
      identificadorBanco: fitid,
      data: dataOfxParaISO(dtposted),
      valor,
      descricao: descricao.replace(/\s+/g, " ").trim().slice(0, 500),
    });
  }

  const inicio = tag(conteudo, "DTSTART");
  const fim = tag(conteudo, "DTEND");
  const datas = transacoes.map((t) => t.data).sort();

  return {
    transacoes,
    periodoInicio: inicio ? dataOfxParaISO(inicio) : (datas[0] ?? null),
    periodoFim: fim ? dataOfxParaISO(fim) : (datas[datas.length - 1] ?? null),
    contaBanco: tag(conteudo, "BANKID"),
    numeroConta: tag(conteudo, "ACCTID"),
  };
}
