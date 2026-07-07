-- Biblioteca de pitches comerciais (playbook) + vínculo no lead + relato do SDR.

-- 1. Tabela de pitches
CREATE TABLE "invest_pitches" (
    "id" UUID NOT NULL,
    "faixa" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "gancho" TEXT NOT NULL DEFAULT '',
    "padrao_do_segmento" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "conteudo" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invest_pitches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invest_pitches_faixa_idx" ON "invest_pitches"("faixa");
CREATE INDEX "invest_pitches_deleted_at_idx" ON "invest_pitches"("deleted_at");

ALTER TABLE "invest_pitches"
    ADD CONSTRAINT "invest_pitches_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Vínculo do pitch selecionado + relato da ligação do SDR no lead
ALTER TABLE "invest_leads" ADD COLUMN "pitch_id" UUID;
ALTER TABLE "invest_leads" ADD COLUMN "sdr_relato" TEXT NOT NULL DEFAULT '';
ALTER TABLE "invest_leads" ADD COLUMN "sdr_relato_por_id" UUID;
ALTER TABLE "invest_leads" ADD COLUMN "sdr_relato_em" TIMESTAMP(3);

CREATE INDEX "invest_leads_pitch_id_idx" ON "invest_leads"("pitch_id");

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_pitch_id_fkey"
    FOREIGN KEY ("pitch_id") REFERENCES "invest_pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_sdr_relato_por_id_fkey"
    FOREIGN KEY ("sdr_relato_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
