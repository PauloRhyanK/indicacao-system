-- CreateEnum
CREATE TYPE "user_access_scope" AS ENUM ('INTERNAL', 'FULL', 'CONFIDENCIAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "access_scope" "user_access_scope" NOT NULL DEFAULT 'INTERNAL';

-- Administradores existentes: acesso aos dois ambientes
UPDATE "users" u
SET "access_scope" = 'FULL'
FROM "user_roles" ur
JOIN "roles" r ON r.id = ur.role_id
WHERE ur.user_id = u.id AND r.name = 'Administrador';

-- Papel exclusivo do ambiente confidencial
INSERT INTO "roles" ("id", "name", "is_system", "created_at")
VALUES (gen_random_uuid(), 'Acesso Confidencial', true, NOW())
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r.id, p.key
FROM "roles" r
CROSS JOIN (VALUES ('rj.view')) AS p(key)
WHERE r.name = 'Acesso Confidencial'
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
