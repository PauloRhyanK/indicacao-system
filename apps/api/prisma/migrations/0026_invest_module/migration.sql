-- Módulo CAIS Investimentos — pipeline de prospecção (campanha BNF)

CREATE TABLE "invest_leads" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'outro',
    "produto" TEXT NOT NULL DEFAULT 'carteira',
    "pitch" TEXT NOT NULL DEFAULT '',
    "pl" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "etapa" TEXT NOT NULL DEFAULT 'lead',
    "probabilidade" INTEGER NOT NULL DEFAULT 5,
    "responsavel_id" UUID,
    "responsavel_nome" TEXT NOT NULL DEFAULT '',
    "contato" TEXT NOT NULL DEFAULT '',
    "passo" TEXT NOT NULL DEFAULT '',
    "retorno" DATE,
    "obs" TEXT NOT NULL DEFAULT '',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invest_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invest_leads_etapa_idx" ON "invest_leads"("etapa");
CREATE INDEX "invest_leads_responsavel_id_idx" ON "invest_leads"("responsavel_id");
CREATE INDEX "invest_leads_deleted_at_idx" ON "invest_leads"("deleted_at");

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_responsavel_id_fkey"
    FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "invest_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "meta" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invest_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "permissions" ("key", "label", "group_name")
VALUES
    ('investimentos.view', 'Ver pipeline de investimentos', 'Investimentos'),
    ('investimentos.manage', 'Gerenciar leads de investimentos', 'Investimentos'),
    ('investimentos.import', 'Importar planilha de investimentos', 'Investimentos')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

-- Admin recebe as novas permissões (o seed/ensureSystemRoles também garante isso em runtime)
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
CROSS JOIN (VALUES ('investimentos.view'), ('investimentos.manage'), ('investimentos.import')) AS p("key")
WHERE r."name" = 'Administrador'
ON CONFLICT DO NOTHING;
