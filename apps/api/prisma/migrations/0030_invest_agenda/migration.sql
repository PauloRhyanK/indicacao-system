-- KUS-153: agenda interna de reuniões + competência de faixa por assessor.

CREATE TABLE "invest_reunioes" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "assessor_id" UUID NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL,
    "data_hora_fim" TIMESTAMP(3),
    "titulo" TEXT NOT NULL DEFAULT '',
    "local" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "faixa" TEXT,
    "criado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invest_reunioes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invest_reunioes_assessor_id_data_hora_inicio_idx" ON "invest_reunioes"("assessor_id", "data_hora_inicio");
CREATE INDEX "invest_reunioes_lead_id_idx" ON "invest_reunioes"("lead_id");
CREATE INDEX "invest_reunioes_deleted_at_idx" ON "invest_reunioes"("deleted_at");

ALTER TABLE "invest_reunioes"
    ADD CONSTRAINT "invest_reunioes_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "invest_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invest_reunioes"
    ADD CONSTRAINT "invest_reunioes_assessor_id_fkey"
    FOREIGN KEY ("assessor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invest_reunioes"
    ADD CONSTRAINT "invest_reunioes_criado_por_id_fkey"
    FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "invest_assessor_faixas" (
    "user_id" UUID NOT NULL,
    "faixa" TEXT NOT NULL,

    CONSTRAINT "invest_assessor_faixas_pkey" PRIMARY KEY ("user_id", "faixa")
);

ALTER TABLE "invest_assessor_faixas"
    ADD CONSTRAINT "invest_assessor_faixas_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
