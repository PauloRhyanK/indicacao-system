-- Permissões granulares de indicações / recompensas
INSERT INTO "permissions" ("key", "label", "group_name")
VALUES
  ('rewards.payments', 'Ver e registrar pagamento de recompensas', 'Indicações'),
  ('rewards.client_choice', 'Registrar escolha do cliente', 'Indicações')
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label", "group_name" = EXCLUDED."group_name";

-- Quem tinha rewards.manage passa a ter pagamentos
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT rp.role_id, 'rewards.payments'
FROM "role_permissions" rp
WHERE rp.permission_key = 'rewards.manage'
ON CONFLICT DO NOTHING;

-- Administrador: pagamentos + escolha do cliente
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rewards.payments'
FROM "roles" r
WHERE r.name = 'Administrador'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rewards.client_choice'
FROM "roles" r
WHERE r.name = 'Administrador'
ON CONFLICT DO NOTHING;

-- Colaborador: apenas escolha do cliente
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, 'rewards.client_choice'
FROM "roles" r
WHERE r.name = 'Colaborador'
ON CONFLICT DO NOTHING;

-- Encerrar recompensas de primeiro contato (não usadas na campanha)
UPDATE "campaign_rewards"
SET "status" = 'CANCELLED', "updated_at" = NOW()
WHERE "type" = 'FIRST_CONTACT' AND "status" != 'CANCELLED';
