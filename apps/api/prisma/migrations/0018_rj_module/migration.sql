-- Módulo Recuperação Judicial — credores MG2

CREATE TABLE "rj_credores" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sujeito" BOOLEAN NOT NULL DEFAULT true,
    "classe" TEXT,
    "motivo" TEXT,
    "valor" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'juridico',
    "contato" TEXT NOT NULL DEFAULT '',
    "passo" TEXT NOT NULL DEFAULT '',
    "retorno" DATE,
    "obs" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rj_credores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rj_credores_deleted_at_idx" ON "rj_credores"("deleted_at");
CREATE INDEX "rj_credores_status_idx" ON "rj_credores"("status");
CREATE INDEX "rj_credores_sujeito_idx" ON "rj_credores"("sujeito");

CREATE TABLE "rj_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "passivo" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "permissions" ("key", "label", "group_name")
VALUES
    ('rj.view', 'Ver condomínio de credores (RJ)', 'Recuperacao Judicial'),
    ('rj.manage', 'Gerenciar condomínio de credores (RJ)', 'Recuperacao Judicial')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.view'), ('rj.manage')) AS p(key)
WHERE r.name = 'Administrador'
ON CONFLICT DO NOTHING;

INSERT INTO "rj_config" ("id", "passivo", "updated_at")
VALUES ('singleton', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "rj_credores" (
    "id", "nome", "sujeito", "classe", "motivo", "valor", "status",
    "contato", "passo", "retorno", "obs", "created_at", "updated_at"
) VALUES
    ('aaaaaaaa-0001-4000-8000-000000000001', 'Husqvarna', true, 'III', NULL, 0, 'juridico', '', 'Diretoria vai falar com o jurídico; diretor retorna amanhã', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0002-4000-8000-000000000002', 'Changsha', true, 'III', NULL, 0, 'juridico', '', 'Aguardando alinhamento com o jurídico deles', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0003-4000-8000-000000000003', 'AF Transporte', true, 'III', NULL, 0, 'juridico', '', 'Retorna amanhã após conversar com o jurídico', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0004-4000-8000-000000000004', 'Transvegas', true, 'III', NULL, 0, 'confirmado', '', 'Confirmado — está dentro do bloco', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0005-4000-8000-000000000005', 'Grupo Armando Pneus', true, 'III', NULL, 0, 'juridico', '', 'Vão conversar com o jurídico', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0006-4000-8000-000000000006', 'Arogran', true, 'III', NULL, 0, 'semcontato', '', 'Ainda não consegui contato', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0007-4000-8000-000000000007', 'Maroto', true, 'III', NULL, 0, 'semcontato', '', 'Ainda não consegui contato', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0008-4000-8000-000000000008', 'Toolstar', true, 'III', NULL, 0, 'juridico', '', 'Gerente vai conversar com o pessoal do jurídico', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-0009-4000-8000-000000000009', 'Gracol / Gray', true, 'III', NULL, 0, 'juridico', '', 'Reunião com o jurídico amanhã; vai ligar quando conversarem', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-000a-4000-8000-00000000000a', 'Guidoni', true, 'III', NULL, 0, 'juridico', '', 'Vão conversar com o jurídico', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-000b-4000-8000-00000000000b', 'Toledo', true, 'III', NULL, 0, 'juridico', '', 'Vão conversar com o jurídico', NULL, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
