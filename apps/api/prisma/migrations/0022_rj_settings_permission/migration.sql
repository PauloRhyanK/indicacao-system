-- Permissão separada para configurações (usuários e papéis) do confidencial
INSERT INTO "permissions" ("key", "label", "group_name")
VALUES ('rj.settings', 'Configurações do confidencial (usuários e papéis)', 'Recuperacao Judicial')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

UPDATE "permissions"
SET "label" = 'Ver credores (somente leitura)'
WHERE "key" = 'rj.view';

UPDATE "permissions"
SET "label" = 'Gerenciar credores'
WHERE "key" = 'rj.manage';

-- Papel somente leitura (sistema)
INSERT INTO "roles" ("id", "name", "is_system", "created_at")
VALUES (gen_random_uuid(), 'Consulta Confidencial', true, NOW())
ON CONFLICT ("name") DO UPDATE SET "is_system" = true;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rj.view'
FROM "roles" r
WHERE r.name = 'Consulta Confidencial'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;

-- Acesso Confidencial (default): credores com edição, sem configurações
DELETE FROM "role_permissions"
WHERE "role_id" IN (SELECT id FROM "roles" WHERE name = 'Acesso Confidencial');

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.view'), ('rj.manage')) AS p(key)
WHERE r.name = 'Acesso Confidencial'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;

-- Administrador RJ: credores + configurações
DELETE FROM "role_permissions"
WHERE "role_id" IN (SELECT id FROM "roles" WHERE name = 'Administrador RJ');

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.view'), ('rj.manage'), ('rj.settings')) AS p(key)
WHERE r.name = 'Administrador RJ'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
