import "server-only"

import { z } from "zod"

import { businessToday } from "@/lib/today"
import { getAccountEntryById, listPayables, listReceivables } from "@/modules/accounts/service"
import type { AccountEntry } from "@/modules/accounts/types"
import { roleLabels } from "@/modules/auth/permissions"
import { getBankAccountStatement, getBankAccountsOverview } from "@/modules/bank-accounts/service"
import { listCategories } from "@/modules/categories/service"
import { listContacts } from "@/modules/contacts/service"
import { getOverview } from "@/modules/dashboard/service"
import { listUserOrganizations } from "@/modules/organizations/service"
import { getBeneficiaryStatement, getPayoutSummary } from "@/modules/payouts/service"
import { sliceStatement } from "@/modules/payouts/statement"
import { listBankTransactions } from "@/modules/statements/service"
import { NotFound } from "@/shared/errors"
import { requireOrganization } from "../context"
import { day, inDayRange, localDay, matchesText, optionalDay, reais } from "../format"
import type { ToolRegistrar } from "../server"

// Read-only tools: they call the same services the screens use, so every
// number Claude sees is the number the person sees in the Capi.

const empresaId = z.string().describe("Id da empresa (de listar_empresas).")
const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const

type Situacao = "em_aberto" | "vencido" | "parcial" | "liquidado"

function situacao(entry: AccountEntry, today: string): Situacao {
  if (entry.entryStatus === "SETTLED") return "liquidado"
  if (day(entry.dueDate) < today) return "vencido"
  if (entry.entryStatus === "PARTIAL") return "parcial"
  return "em_aberto"
}

function openAmount(entry: AccountEntry) {
  return entry.entryStatus === "SETTLED" ? 0 : Math.max(0, entry.amount - entry.settledAmount)
}

function entrySummary(entry: AccountEntry, today: string) {
  return {
    id: entry.id,
    tipo: entry.kind === "rec" ? "a_receber" : "a_pagar",
    contato: entry.contactName,
    descricao: entry.description,
    parcela: entry.installment ?? null,
    categoria: entry.categoryName || null,
    vencimento: day(entry.dueDate),
    valor: reais(entry.amount),
    valor_liquidado: reais(entry.settledAmount),
    em_aberto: reais(openAmount(entry)),
    situacao: situacao(entry, today),
    data_pagamento: optionalDay(entry.paidAt),
    conta_bancaria: entry.bankAccountName,
    repasse: entry.isPayout,
    favorecidos: entry.beneficiaryNames,
    marcador: entry.marker?.name ?? null,
  }
}

export const registerReadTools: ToolRegistrar = (server, context, { tool }) => {
  tool(
    "listar_empresas",
    {
      title: "Listar empresas",
      description:
        "Lista as empresas (organizações) que você acessa no Capi, com o seu papel em cada uma. " +
        "Comece por aqui: todas as outras ferramentas pedem o empresa_id.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const organizations = await listUserOrganizations(context.userId)
      return {
        empresas: organizations.map((organization) => ({
          id: organization.id,
          nome: organization.name,
          documento: organization.document,
          papel: roleLabels[organization.role],
        })),
      }
    },
  )

  tool(
    "resumo_geral",
    {
      title: "Resumo geral da empresa",
      description:
        "Visão geral da empresa: saldo de cada conta bancária, contas a receber e a pagar em aberto " +
        "(vencidas, vencendo hoje e a vencer), transações do extrato pendentes de conciliação e " +
        "quantos favorecidos têm saldo a repassar. Valores em reais.",
      inputSchema: { empresa_id: empresaId },
      annotations: READ_ONLY,
    },
    async ({ empresa_id }) => {
      const organization = await requireOrganization(context, empresa_id)
      const overview = await getOverview(organization.id)
      const buckets = (summary: typeof overview.receivables) => ({
        total_em_aberto: reais(summary.total),
        vencido: { quantidade: summary.buckets.vencido.count, total: reais(summary.buckets.vencido.total) },
        vence_hoje: { quantidade: summary.buckets.venceHoje.count, total: reais(summary.buckets.venceHoje.total) },
        a_vencer: { quantidade: summary.buckets.aVencer.count, total: reais(summary.buckets.aVencer.total) },
      })
      return {
        empresa: organization.name,
        data_referencia: localDay(businessToday()),
        contas_bancarias: overview.accounts.map((account) => ({
          id: account.id,
          nome: account.name,
          saldo: reais(account.balance),
        })),
        saldo_total_contas: reais(overview.accounts.reduce((sum, account) => sum + account.balance, 0)),
        a_receber: buckets(overview.receivables),
        a_pagar: buckets(overview.payables),
        transacoes_pendentes_conciliacao: overview.pendingReconciliationCount,
        favorecidos_com_saldo_a_repassar: overview.beneficiariesWithBalanceCount,
      }
    },
  )

  tool(
    "listar_contas_bancarias",
    {
      title: "Listar contas bancárias",
      description:
        "Contas bancárias ativas da empresa com saldo atual no Capi (saldo inicial + transações conciliadas) " +
        "e quantas transações do extrato ainda esperam conciliação. Valores em reais.",
      inputSchema: { empresa_id: empresaId },
      annotations: READ_ONLY,
    },
    async ({ empresa_id }) => {
      const organization = await requireOrganization(context, empresa_id)
      const accounts = await getBankAccountsOverview(organization.id)
      return {
        empresa: organization.name,
        contas: accounts.map((account) => ({
          id: account.id,
          nome: account.name,
          banco: account.bank,
          agencia: account.branchNumber || null,
          conta: account.accountNumber || null,
          tipo: account.kind === "CHECKING" ? "conta_corrente" : "poupanca_ou_caixinha",
          inicio_controle: day(account.controlStartDate),
          saldo_inicial: reais(account.initialBalance),
          saldo_atual: reais(account.currentBalance),
          transacoes_pendentes: account.pendingCount,
        })),
      }
    },
  )

  tool(
    "extrato_conta_bancaria",
    {
      title: "Extrato de conta bancária",
      description:
        "Extrato conciliado de uma conta bancária, com saldo corrente linha a linha e os lançamentos " +
        "que cada transação liquidou. Filtre por período para extratos longos. Valores em reais " +
        "(positivo = entrada, negativo = saída).",
      inputSchema: {
        empresa_id: empresaId,
        conta_id: z.string().describe("Id da conta (de listar_contas_bancarias)."),
        de: dayString.optional().describe("Data inicial, AAAA-MM-DD."),
        ate: dayString.optional().describe("Data final, AAAA-MM-DD."),
        limite: z.number().int().min(1).max(500).default(200).describe("Máximo de linhas (as mais recentes)."),
      },
      annotations: READ_ONLY,
    },
    async ({ empresa_id, conta_id, de, ate, limite }) => {
      const organization = await requireOrganization(context, empresa_id)
      const statement = await getBankAccountStatement(organization.id, conta_id)

      const selected = statement.lines.filter((line) => inDayRange(day(line.date), de, ate))
      const before = de ? statement.lines.filter((line) => day(line.date) < de).at(-1) : undefined
      const openingBalance = before?.runningBalance ?? statement.bankAccount.initialBalance
      const lines = selected.slice(-limite)

      return {
        empresa: organization.name,
        conta: statement.bankAccount.name,
        saldo_atual: reais(statement.currentBalance),
        periodo: { de: de ?? null, ate: ate ?? null },
        saldo_anterior_ao_periodo: reais(openingBalance),
        saldo_final_do_periodo: reais(selected.at(-1)?.runningBalance ?? openingBalance),
        entradas_no_periodo: reais(selected.filter((l) => l.amount > 0).reduce((sum, l) => sum + l.amount, 0)),
        saidas_no_periodo: reais(selected.filter((l) => l.amount < 0).reduce((sum, l) => sum + l.amount, 0)),
        total_linhas_no_periodo: selected.length,
        linhas_omitidas: selected.length - lines.length,
        linhas: lines.map((line) => ({
          data: day(line.date),
          descricao: line.description,
          valor: reais(line.amount),
          saldo: reais(line.runningBalance),
          transacao_id: line.bankTransactionId,
          // Perna de transferência que ainda espera o extrato desta conta.
          aguardando_extrato: line.bankTransactionId === null,
          lancamentos: line.entries.map((entry) => ({
            id: entry.entryId,
            tipo: entry.entryType,
            contato: entry.contactName,
            descricao: entry.description,
            valor: reais(entry.amount),
          })),
        })),
      }
    },
  )

  tool(
    "transacoes_pendentes",
    {
      title: "Transações do extrato não conciliadas",
      description:
        "Transações importadas do extrato (OFX) que ainda não foram conciliadas com nenhum lançamento, " +
        "de uma conta ou de todas. Inclui as marcadas como ignoradas. Valores em reais.",
      inputSchema: {
        empresa_id: empresaId,
        conta_id: z.string().optional().describe("Id da conta. Sem ele, todas as contas ativas."),
        incluir_ignoradas: z.boolean().default(false),
        limite: z.number().int().min(1).max(500).default(100),
      },
      annotations: READ_ONLY,
    },
    async ({ empresa_id, conta_id, incluir_ignoradas, limite }) => {
      const organization = await requireOrganization(context, empresa_id)
      const accounts = await getBankAccountsOverview(organization.id)
      const targets = conta_id ? accounts.filter((account) => account.id === conta_id) : accounts
      if (conta_id && targets.length === 0) throw new NotFound("Conta bancária ativa")

      const perAccount = await Promise.all(
        targets.map(async (account) =>
          (await listBankTransactions(organization.id, account.id)).map((transaction) => ({
            account,
            transaction,
          })),
        ),
      )
      const all = perAccount
        .flat()
        .filter(({ transaction }) => incluir_ignoradas || transaction.status === "PENDING")
        .sort((a, b) => b.transaction.date.getTime() - a.transaction.date.getTime())

      return {
        empresa: organization.name,
        total: all.length,
        soma_entradas: reais(all.filter((t) => t.transaction.amount > 0).reduce((s, t) => s + t.transaction.amount, 0)),
        soma_saidas: reais(all.filter((t) => t.transaction.amount < 0).reduce((s, t) => s + t.transaction.amount, 0)),
        omitidas: Math.max(0, all.length - limite),
        transacoes: all.slice(0, limite).map(({ account, transaction }) => ({
          id: transaction.id,
          conta: account.name,
          conta_id: account.id,
          data: day(transaction.date),
          descricao: transaction.description,
          valor: reais(transaction.amount),
          situacao: transaction.status === "IGNORED" ? "ignorada" : "pendente",
        })),
      }
    },
  )

  tool(
    "buscar_lancamentos",
    {
      title: "Buscar lançamentos (contas a receber e a pagar)",
      description:
        "Busca lançamentos de contas a receber e/ou a pagar com filtros. Devolve os totais de TODOS os " +
        "resultados (não só dos listados) e uma linha resumida por lançamento; use detalhar_lancamento " +
        "para ver liquidações, destinações e contrato. Situação: em_aberto (a vencer), vencido, parcial, " +
        "liquidado. Valores em reais.",
      inputSchema: {
        empresa_id: empresaId,
        tipo: z.enum(["a_receber", "a_pagar", "ambos"]).default("ambos"),
        situacao: z
          .array(z.enum(["em_aberto", "vencido", "parcial", "liquidado"]))
          .optional()
          .describe("Uma ou mais situações. Sem filtro, todas."),
        contato: z.string().optional().describe("Parte do nome do contato (cliente, fornecedor, favorecido)."),
        texto: z.string().optional().describe("Parte da descrição, categoria ou observação."),
        vencimento_de: dayString.optional(),
        vencimento_ate: dayString.optional(),
        valor_min: z.number().optional().describe("Valor mínimo em reais."),
        valor_max: z.number().optional().describe("Valor máximo em reais."),
        limite: z.number().int().min(1).max(300).default(50),
      },
      annotations: READ_ONLY,
    },
    async (input) => {
      const organization = await requireOrganization(context, input.empresa_id)
      const [receivables, payables] = await Promise.all([
        input.tipo === "a_pagar" ? [] : listReceivables(organization.id),
        input.tipo === "a_receber" ? [] : listPayables(organization.id),
      ])
      const today = localDay(businessToday())

      const matches = [...receivables, ...payables]
        .filter((entry) => {
          if (input.situacao?.length && !input.situacao.includes(situacao(entry, today))) return false
          if (input.contato && !matchesText(entry.contactName, input.contato)) return false
          if (
            input.texto &&
            !matchesText(entry.description, input.texto) &&
            !matchesText(entry.categoryName, input.texto) &&
            !matchesText(entry.notes, input.texto)
          ) {
            return false
          }
          if (!inDayRange(day(entry.dueDate), input.vencimento_de, input.vencimento_ate)) return false
          if (input.valor_min !== undefined && entry.amount < Math.round(input.valor_min * 100)) return false
          if (input.valor_max !== undefined && entry.amount > Math.round(input.valor_max * 100)) return false
          return true
        })
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

      return {
        empresa: organization.name,
        data_referencia: today,
        total_encontrado: matches.length,
        soma_valor: reais(matches.reduce((sum, entry) => sum + entry.amount, 0)),
        soma_em_aberto: reais(matches.reduce((sum, entry) => sum + openAmount(entry), 0)),
        omitidos: Math.max(0, matches.length - input.limite),
        lancamentos: matches.slice(0, input.limite).map((entry) => entrySummary(entry, today)),
      }
    },
  )

  tool(
    "detalhar_lancamento",
    {
      title: "Detalhar lançamento",
      description:
        "Tudo sobre um lançamento: valores, juros/multa/desconto, cada liquidação (com a transação " +
        "bancária), destinação entre favorecidos, contrato de origem, marcador e observação. Valores em reais.",
      inputSchema: {
        empresa_id: empresaId,
        lancamento_id: z.string().describe("Id do lançamento (de buscar_lancamentos)."),
      },
      annotations: READ_ONLY,
    },
    async ({ empresa_id, lancamento_id }) => {
      const organization = await requireOrganization(context, empresa_id)
      const entry = await getAccountEntryById(organization.id, lancamento_id)
      const today = localDay(businessToday())
      return {
        empresa: organization.name,
        ...entrySummary(entry, today),
        forma_pagamento: entry.paymentMethod,
        juros: reais(entry.interest),
        multa: reais(entry.fine),
        desconto: reais(entry.discount),
        observacao: entry.notes,
        contrato: entry.contract
          ? {
              id: entry.contract.saleId,
              modalidade: entry.contract.modality === "RECURRING" ? "recorrente" : "parcelado",
              valor_total: reais(entry.contract.totalAmount),
              parcelas: entry.contract.installmentsCount,
              primeiro_vencimento: day(entry.contract.firstDueDate),
            }
          : null,
        destinacao: entry.allocations.map((allocation) => ({
          favorecido: allocation.beneficiaryName,
          favorecido_id: allocation.beneficiaryId,
          percentual: allocation.percentage,
          valor: reais(allocation.amount),
        })),
        liquidacoes: entry.settlements.map((settlement) => ({
          id: settlement.id,
          data: day(settlement.settledAt),
          origem: settlement.origin === "MANUAL" ? "baixa_manual" : "extrato",
          valor_liquidado: reais(settlement.settledAmount),
          juros: reais(settlement.interest),
          multa: reais(settlement.fine),
          desconto: reais(settlement.discount),
          conta_bancaria: settlement.bankAccountName,
          transacao: settlement.bankTransaction
            ? {
                data: day(settlement.bankTransaction.date),
                descricao: settlement.bankTransaction.description,
                valor: reais(settlement.bankTransaction.amount),
              }
            : null,
          nota: settlement.note,
        })),
      }
    },
  )

  tool(
    "listar_contatos",
    {
      title: "Listar contatos",
      description: "Contatos da empresa (clientes, fornecedores, favorecidos, funcionários, sócios), com busca por nome ou documento.",
      inputSchema: {
        empresa_id: empresaId,
        busca: z.string().optional().describe("Parte do nome, razão social ou documento."),
        tipo: z.enum(["CLIENT", "SUPPLIER", "BENEFICIARY", "EMPLOYEE", "PARTNER"]).optional(),
        limite: z.number().int().min(1).max(500).default(100),
      },
      annotations: READ_ONLY,
    },
    async ({ empresa_id, busca, tipo, limite }) => {
      const organization = await requireOrganization(context, empresa_id)
      const digits = busca?.replace(/\D/g, "")
      const contacts = (await listContacts(organization.id)).filter(
        (contact) =>
          (!tipo || contact.contactType === tipo) &&
          (!busca ||
            matchesText(contact.name, busca) ||
            matchesText(contact.legalName, busca) ||
            (!!digits && !!contact.document?.includes(digits))),
      )
      return {
        empresa: organization.name,
        total: contacts.length,
        contatos: contacts.slice(0, limite).map((contact) => ({
          id: contact.id,
          nome: contact.name,
          razao_social: contact.legalName,
          documento: contact.document,
          tipo: contact.contactType,
          pessoa: contact.personType === "COMPANY" ? "juridica" : "fisica",
          email: contact.email,
          telefone: contact.phone,
          cidade: contact.city,
          uf: contact.state,
          pix: contact.bankDetails?.pixKey || null,
          ativo: contact.active,
        })),
      }
    },
  )

  tool(
    "listar_categorias",
    {
      title: "Listar categorias",
      description: "Plano de categorias de receita e despesa da empresa, em dois níveis (categoria e subcategorias).",
      inputSchema: { empresa_id: empresaId },
      annotations: READ_ONLY,
    },
    async ({ empresa_id }) => {
      const organization = await requireOrganization(context, empresa_id)
      const categories = await listCategories(organization.id)
      const roots = categories.filter((category) => !category.parentId)
      return {
        empresa: organization.name,
        categorias: roots.map((root) => ({
          id: root.id,
          nome: root.name,
          tipo: root.type === "INCOME" ? "receita" : "despesa",
          subcategorias: categories
            .filter((category) => category.parentId === root.id)
            .map((category) => ({ id: category.id, nome: category.name })),
        })),
      }
    },
  )

  tool(
    "saldos_favorecidos",
    {
      title: "Saldos dos favorecidos (repasses)",
      description:
        "Posição de custódia de cada favorecido: disponível para repassar (créditos conciliados menos " +
        "repasses gerados), repasses pendentes (gerados e ainda não pagos) e já realizados. Valores em reais.",
      inputSchema: { empresa_id: empresaId },
      annotations: READ_ONLY,
    },
    async ({ empresa_id }) => {
      const organization = await requireOrganization(context, empresa_id)
      const summary = await getPayoutSummary(organization.id)
      return {
        empresa: organization.name,
        totais: {
          disponivel: reais(summary.totals.available),
          pendente: reais(summary.totals.pending),
          realizado: reais(summary.totals.realized),
        },
        favorecidos: summary.beneficiaries.map((beneficiary) => ({
          id: beneficiary.beneficiaryId,
          nome: beneficiary.name,
          documento: beneficiary.document,
          disponivel: reais(beneficiary.available),
          pendente: reais(beneficiary.pending),
          realizado: reais(beneficiary.realized),
        })),
      }
    },
  )

  tool(
    "extrato_favorecido",
    {
      title: "Extrato do favorecido",
      description:
        "Conta corrente de um favorecido: créditos (recebimentos conciliados, na cota dele) e débitos " +
        "(repasses), com saldo após cada linha, saldo anterior e final do período. Valores em reais.",
      inputSchema: {
        empresa_id: empresaId,
        favorecido_id: z.string().describe("Id do favorecido (de saldos_favorecidos)."),
        de: dayString.optional(),
        ate: dayString.optional(),
        limite: z.number().int().min(1).max(500).default(200),
      },
      annotations: READ_ONLY,
    },
    async ({ empresa_id, favorecido_id, de, ate, limite }) => {
      const organization = await requireOrganization(context, empresa_id)
      const statement = await getBeneficiaryStatement(organization.id, favorecido_id)
      const slice = sliceStatement(statement.lines, {
        from: de ? new Date(`${de}T00:00:00Z`) : null,
        to: ate ? new Date(`${ate}T23:59:59Z`) : null,
      })
      const lines = slice.lines.slice(-limite)
      return {
        empresa: organization.name,
        favorecido: statement.name,
        posicao_atual: {
          disponivel: reais(statement.available),
          pendente: reais(statement.pending),
          realizado: reais(statement.realized),
        },
        periodo: { de: de ?? null, ate: ate ?? null },
        saldo_anterior: reais(slice.openingBalance),
        creditos: reais(slice.credits),
        debitos: reais(slice.debits),
        saldo_final: reais(slice.closingBalance),
        linhas_omitidas: slice.lines.length - lines.length,
        linhas: lines.map((line) => ({
          data: day(line.date),
          tipo: line.kind === "CREDIT" ? "credito" : "debito",
          titulo: line.title,
          descricao: line.description,
          parcela: line.installmentLabel,
          valor: reais(line.amount),
          saldo: reais(line.balance),
          lancamento_id: line.entryId,
          situacao_repasse: line.status === "PENDING" ? "pendente" : line.status === "REALIZED" ? "realizado" : null,
        })),
      }
    },
  )
}
