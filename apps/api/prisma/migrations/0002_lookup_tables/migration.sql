-- CreateTable: auxiliary lookup tables
CREATE TABLE "lead_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "lead_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "next_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "next_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_statuses_slug_key" ON "lead_statuses"("slug");
CREATE UNIQUE INDEX "lead_sources_slug_key" ON "lead_sources"("slug");
CREATE UNIQUE INDEX "next_actions_slug_key" ON "next_actions"("slug");

-- Seed lookup tables
INSERT INTO "lead_statuses" ("slug", "name") VALUES
  ('reuniao-agendada', 'Reunião agendada'),
  ('reuniao-realizada', 'Reunião realizada'),
  ('pensando', 'Pensando'),
  ('mandar-proposta', 'Mandar proposta'),
  ('proposta-enviada', 'Proposta enviada'),
  ('em-negociacao', 'Em negociação'),
  ('fechado', 'Fechado'),
  ('perdido', 'Perdido'),
  ('sem-retorno', 'Sem retorno'),
  ('follow-up', 'Follow-up'),
  ('reagendar', 'Reagendar');

INSERT INTO "lead_sources" ("slug", "name") VALUES
  ('base-interna', 'Base interna'),
  ('mpa', 'MPA'),
  ('reativacao', 'Reativação'),
  ('prospeccao-ativa', 'Prospecção ativa'),
  ('base-lucas', 'Base Lucas'),
  ('whatsapp', 'WhatsApp'),
  ('outro', 'Outro'),
  ('evento-mulheres', 'Evento mulheres');

INSERT INTO "next_actions" ("slug", "name") VALUES
  ('cobrar-decisao', 'Cobrar decisão'),
  ('mandar-proposta', 'Mandar proposta'),
  ('reenviar-proposta', 'Reenviar proposta'),
  ('agendar-retorno', 'Agendar retorno'),
  ('ligar-novamente', 'Ligar novamente'),
  ('enviar-mensagem', 'Enviar mensagem'),
  ('aguardar-cliente', 'Aguardar cliente'),
  ('sem-acao', 'Sem ação'),
  ('fechado', 'Fechado'),
  ('encerrado', 'Encerrado');

-- Add FK columns to leads
ALTER TABLE "leads" ADD COLUMN "source_id" UUID;
ALTER TABLE "leads" ADD COLUMN "sales_status_id" UUID;
ALTER TABLE "leads" ADD COLUMN "next_action_id" UUID;

-- Migrate existing TEXT data to FKs (accent-insensitive match)
UPDATE "leads" l SET "sales_status_id" = s."id"
FROM "lead_statuses" s
WHERE l."sales_status" IS NOT NULL
  AND lower(translate(l."sales_status", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
    = lower(translate(s."name", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'));

UPDATE "leads" l SET "source_id" = s."id"
FROM "lead_sources" s
WHERE l."source" IS NOT NULL
  AND lower(translate(l."source", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
    = lower(translate(s."name", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'));

UPDATE "leads" l SET "next_action_id" = a."id"
FROM "next_actions" a
WHERE l."next_action" IS NOT NULL
  AND lower(translate(l."next_action", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
    = lower(translate(a."name", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'));

-- Drop old TEXT columns and indexes
DROP INDEX IF EXISTS "leads_sales_status_idx";
DROP INDEX IF EXISTS "leads_source_idx";
ALTER TABLE "leads" DROP COLUMN "source";
ALTER TABLE "leads" DROP COLUMN "sales_status";
ALTER TABLE "leads" DROP COLUMN "next_action";

-- Add FK constraints and new indexes
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_sales_status_id_fkey" FOREIGN KEY ("sales_status_id") REFERENCES "lead_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_next_action_id_fkey" FOREIGN KEY ("next_action_id") REFERENCES "next_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "leads_sales_status_id_idx" ON "leads"("sales_status_id");
CREATE INDEX "leads_source_id_idx" ON "leads"("source_id");
