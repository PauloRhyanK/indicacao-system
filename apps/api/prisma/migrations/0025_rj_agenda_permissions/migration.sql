-- Permissões da agenda de reuniões do módulo RJ

INSERT INTO "permissions" ("key", "label", "group_name")
VALUES
  ('rj.agenda.view', 'Ver agenda de reuniões', 'Recuperacao Judicial'),
  ('rj.agenda.view_all', 'Ver agenda de toda a equipe', 'Recuperacao Judicial'),
  ('rj.agenda.manage', 'Gerenciar reuniões', 'Recuperacao Judicial')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

-- Administrador (CRM): todas as permissões de agenda
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.agenda.view'), ('rj.agenda.view_all'), ('rj.agenda.manage')) AS p(key)
WHERE r.name = 'Administrador'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;

-- Administrador RJ: todas as permissões de agenda
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.agenda.view'), ('rj.agenda.view_all'), ('rj.agenda.manage')) AS p(key)
WHERE r.name = 'Administrador RJ'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;

-- Acesso Confidencial: ver e gerenciar a própria agenda
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.agenda.view'), ('rj.agenda.manage')) AS p(key)
WHERE r.name = 'Acesso Confidencial'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;

-- Consulta Confidencial: somente ver reuniões em que participa
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rj.agenda.view'
FROM "roles" r
WHERE r.name = 'Consulta Confidencial'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
