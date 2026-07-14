-- CreateTable
CREATE TABLE "invest_clientes" (
    "id" UUID NOT NULL,
    "conta" TEXT NOT NULL,
    "btg_cliente_id" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "assessor_nome" TEXT NOT NULL DEFAULT '',
    "assessor_email" TEXT NOT NULL DEFAULT '',
    "pl_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pl_declarado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "faixa_btg" TEXT NOT NULL DEFAULT '',
    "faixa" TEXT,
    "cidade" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT '',
    "profissao" TEXT NOT NULL DEFAULT '',
    "tipo_investidor" TEXT NOT NULL DEFAULT '',
    "dados_extras" JSONB NOT NULL DEFAULT '{}',
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invest_clientes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "invest_leads" ADD COLUMN "invest_cliente_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "invest_clientes_conta_key" ON "invest_clientes"("conta");

-- CreateIndex
CREATE UNIQUE INDEX "invest_clientes_btg_cliente_id_key" ON "invest_clientes"("btg_cliente_id");

-- CreateIndex
CREATE INDEX "invest_clientes_assessor_nome_idx" ON "invest_clientes"("assessor_nome");

-- CreateIndex
CREATE INDEX "invest_clientes_faixa_idx" ON "invest_clientes"("faixa");

-- CreateIndex
CREATE INDEX "invest_clientes_nome_idx" ON "invest_clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "invest_leads_invest_cliente_id_key" ON "invest_leads"("invest_cliente_id");

-- CreateIndex
CREATE INDEX "invest_leads_invest_cliente_id_idx" ON "invest_leads"("invest_cliente_id");

-- AddForeignKey
ALTER TABLE "invest_leads" ADD CONSTRAINT "invest_leads_invest_cliente_id_fkey" FOREIGN KEY ("invest_cliente_id") REFERENCES "invest_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
