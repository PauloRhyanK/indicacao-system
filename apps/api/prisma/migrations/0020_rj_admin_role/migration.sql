-- Admin legado com FULL passa a INTERNAL (sem acesso cruzado ao confidencial)
UPDATE "users" SET "access_scope" = 'INTERNAL' WHERE "access_scope" = 'FULL';

-- Papel Administrador RJ (gestão completa do módulo confidencial)
INSERT INTO "roles" ("id", "name", "is_system", "created_at")
VALUES (gen_random_uuid(), 'Administrador RJ', true, NOW())
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.view'), ('rj.manage')) AS p(key)
WHERE r.name = 'Administrador RJ'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
