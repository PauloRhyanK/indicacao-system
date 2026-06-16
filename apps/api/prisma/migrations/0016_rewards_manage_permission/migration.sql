-- Permissão de recompensas da campanha (ambientes que não re-rodaram o seed após o recurso)
INSERT INTO "permissions" ("key", "label", "group_name")
VALUES ('rewards.manage', 'Gerenciar recompensas da campanha', 'Campanha')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rewards.manage'
FROM "roles" r
WHERE r.name = 'Administrador'
ON CONFLICT DO NOTHING;
