-- KUS-140: permissão de captação (cadastrar lead) separada da gestão do pipeline.

INSERT INTO "permissions" ("key", "label", "group_name")
VALUES ('investimentos.create', 'Cadastrar lead de investimento (captação)', 'Investimentos')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

-- Admin e Colaborador podem capturar leads.
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", 'investimentos.create'
FROM "roles" r
WHERE r."name" IN ('Administrador', 'Colaborador')
ON CONFLICT DO NOTHING;
