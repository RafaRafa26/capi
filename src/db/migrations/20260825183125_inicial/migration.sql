-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "PapelContato" AS ENUM ('PAGADOR', 'FAVORECIDO', 'FORNECEDOR');

-- CreateEnum
CREATE TYPE "NaturezaConta" AS ENUM ('PROPRIA', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEBIMENTO', 'PAGAMENTO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PREVISTO', 'PARCIAL', 'LIQUIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ModoDestinacao" AS ENUM ('PERCENTUAL', 'VALOR_FIXO');

-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('PENDENTE', 'CONCILIADA', 'IGNORADA');

-- CreateEnum
CREATE TYPE "OrigemLiquidacao" AS ENUM ('EXTRATO', 'BAIXA_MANUAL');

-- CreateEnum
CREATE TYPE "TipoMovimentoCustodia" AS ENUM ('CREDITO', 'DEBITO');

-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateTable
CREATE TABLE "organizacao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contato" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo_pessoa" "TipoPessoa" NOT NULL,
    "documento" TEXT NOT NULL,
    "papeis" "PapelContato"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "banco" TEXT,
    "tipo_conta" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipo_chave_pix" TEXT,
    "chave_pix" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta_bancaria" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT NOT NULL,
    "conta" TEXT NOT NULL,
    "natureza" "NaturezaConta" NOT NULL,
    "saldo_inicial" INTEGER NOT NULL DEFAULT 0,
    "data_saldo_inicial" DATE,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conta_bancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "pai_id" UUID,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_custo" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamento" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "contato_id" UUID,
    "categoria_id" UUID,
    "centro_custo_id" UUID,
    "conta_bancaria_id" UUID,
    "conta_destino_id" UUID,
    "numero_parcela" INTEGER,
    "total_parcelas" INTEGER,
    "vencimento" DATE NOT NULL,
    "valor_previsto" INTEGER NOT NULL,
    "juros" INTEGER NOT NULL DEFAULT 0,
    "multa" INTEGER NOT NULL DEFAULT 0,
    "desconto" INTEGER NOT NULL DEFAULT 0,
    "valor_liquidado" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLancamento" NOT NULL DEFAULT 'PREVISTO',
    "lancamento_par_id" UUID,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinacao" (
    "id" UUID NOT NULL,
    "lancamento_id" UUID NOT NULL,
    "favorecido_id" UUID NOT NULL,
    "modo" "ModoDestinacao" NOT NULL,
    "valor" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "destinacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "conta_bancaria_id" UUID NOT NULL,
    "usuario_id" UUID,
    "arquivo" TEXT NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fim" DATE NOT NULL,
    "total_lidas" INTEGER NOT NULL DEFAULT 0,
    "total_importadas" INTEGER NOT NULL DEFAULT 0,
    "importado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacao_bancaria" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "conta_bancaria_id" UUID NOT NULL,
    "importacao_id" UUID,
    "identificador_banco" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "valor" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusTransacao" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacao_bancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidacao" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "origem" "OrigemLiquidacao" NOT NULL,
    "transacao_id" UUID,
    "conta_bancaria_id" UUID,
    "lancamento_id" UUID NOT NULL,
    "valor_liquidado" INTEGER NOT NULL,
    "data_liquidacao" DATE NOT NULL,
    "observacao" TEXT,
    "usuario_id" UUID,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimento_custodia" (
    "id" UUID NOT NULL,
    "organizacao_id" UUID NOT NULL,
    "favorecido_id" UUID NOT NULL,
    "liquidacao_id" UUID NOT NULL,
    "tipo" "TipoMovimentoCustodia" NOT NULL,
    "valor" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimento_custodia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_organizacao_id_idx" ON "usuario"("organizacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_token_hash_key" ON "sessao"("token_hash");

-- CreateIndex
CREATE INDEX "sessao_usuario_id_idx" ON "sessao"("usuario_id");

-- CreateIndex
CREATE INDEX "contato_organizacao_id_idx" ON "contato"("organizacao_id");

-- CreateIndex
CREATE INDEX "conta_bancaria_organizacao_id_idx" ON "conta_bancaria"("organizacao_id");

-- CreateIndex
CREATE INDEX "categoria_organizacao_id_idx" ON "categoria"("organizacao_id");

-- CreateIndex
CREATE INDEX "centro_custo_organizacao_id_idx" ON "centro_custo"("organizacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "lancamento_lancamento_par_id_key" ON "lancamento"("lancamento_par_id");

-- CreateIndex
CREATE INDEX "lancamento_organizacao_id_idx" ON "lancamento"("organizacao_id");

-- CreateIndex
CREATE INDEX "lancamento_organizacao_id_status_idx" ON "lancamento"("organizacao_id", "status");

-- CreateIndex
CREATE INDEX "lancamento_organizacao_id_vencimento_idx" ON "lancamento"("organizacao_id", "vencimento");

-- CreateIndex
CREATE INDEX "destinacao_lancamento_id_idx" ON "destinacao"("lancamento_id");

-- CreateIndex
CREATE INDEX "importacao_organizacao_id_idx" ON "importacao"("organizacao_id");

-- CreateIndex
CREATE INDEX "transacao_bancaria_organizacao_id_status_idx" ON "transacao_bancaria"("organizacao_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transacao_bancaria_conta_bancaria_id_identificador_banco_key" ON "transacao_bancaria"("conta_bancaria_id", "identificador_banco");

-- CreateIndex
CREATE INDEX "liquidacao_organizacao_id_idx" ON "liquidacao"("organizacao_id");

-- CreateIndex
CREATE INDEX "liquidacao_lancamento_id_idx" ON "liquidacao"("lancamento_id");

-- CreateIndex
CREATE INDEX "liquidacao_transacao_id_idx" ON "liquidacao"("transacao_id");

-- CreateIndex
CREATE INDEX "movimento_custodia_organizacao_id_favorecido_id_idx" ON "movimento_custodia"("organizacao_id", "favorecido_id");

-- CreateIndex
CREATE INDEX "movimento_custodia_liquidacao_id_idx" ON "movimento_custodia"("liquidacao_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato" ADD CONSTRAINT "contato_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_bancaria" ADD CONSTRAINT "conta_bancaria_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_pai_id_fkey" FOREIGN KEY ("pai_id") REFERENCES "categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centro_custo" ADD CONSTRAINT "centro_custo_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centro_custo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_conta_destino_id_fkey" FOREIGN KEY ("conta_destino_id") REFERENCES "conta_bancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_lancamento_par_id_fkey" FOREIGN KEY ("lancamento_par_id") REFERENCES "lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinacao" ADD CONSTRAINT "destinacao_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "lancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinacao" ADD CONSTRAINT "destinacao_favorecido_id_fkey" FOREIGN KEY ("favorecido_id") REFERENCES "contato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao" ADD CONSTRAINT "importacao_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao" ADD CONSTRAINT "importacao_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao" ADD CONSTRAINT "importacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_bancaria" ADD CONSTRAINT "transacao_bancaria_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_bancaria" ADD CONSTRAINT "transacao_bancaria_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_bancaria" ADD CONSTRAINT "transacao_bancaria_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao" ADD CONSTRAINT "liquidacao_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao" ADD CONSTRAINT "liquidacao_transacao_id_fkey" FOREIGN KEY ("transacao_id") REFERENCES "transacao_bancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao" ADD CONSTRAINT "liquidacao_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao" ADD CONSTRAINT "liquidacao_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "lancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao" ADD CONSTRAINT "liquidacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_custodia" ADD CONSTRAINT "movimento_custodia_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_custodia" ADD CONSTRAINT "movimento_custodia_favorecido_id_fkey" FOREIGN KEY ("favorecido_id") REFERENCES "contato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_custodia" ADD CONSTRAINT "movimento_custodia_liquidacao_id_fkey" FOREIGN KEY ("liquidacao_id") REFERENCES "liquidacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
