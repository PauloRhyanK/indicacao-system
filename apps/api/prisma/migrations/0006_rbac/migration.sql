-- CreateTable permissions
CREATE TABLE "permissions" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "group_name" TEXT NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable roles
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateTable role_permissions
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable user_roles
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- Seed permissions catalog
INSERT INTO "permissions" ("key", "label", "group_name") VALUES
  ('leads.view_all', 'Ver todos os leads', 'Leads'),
  ('leads.view_own', 'Ver somente seus leads', 'Leads'),
  ('leads.create', 'Criar lead', 'Leads'),
  ('leads.edit_all', 'Editar qualquer lead', 'Leads'),
  ('leads.edit_own', 'Editar somente os seus', 'Leads'),
  ('leads.delete', 'Excluir lead', 'Leads'),
  ('leads.import', 'Importar leads (Excel)', 'Leads'),
  ('sales.create', 'Registrar venda', 'Vendas'),
  ('sales.view_all', 'Ver todas as vendas', 'Vendas'),
  ('sales.delete', 'Estornar venda', 'Vendas'),
  ('meta.configure_day', 'Configurar meta do dia', 'Metas'),
  ('meta.configure_global', 'Configurar meta global', 'Metas'),
  ('dashboard.general', 'Visão geral da empresa', 'Dashboard'),
  ('tv.view', 'Acessar painel TV', 'Dashboard'),
  ('users.manage', 'Gerenciar usuários', 'Administração'),
  ('roles.manage', 'Gerenciar papéis', 'Administração'),
  ('settings.manage', 'Gerenciar domínios do sistema', 'Administração');

-- Seed system roles
INSERT INTO "roles" ("id", "name", "is_system") VALUES
  ('00000000-0000-4000-8000-000000000001', 'Administrador', true),
  ('00000000-0000-4000-8000-000000000002', 'Colaborador', true);

-- Administrador: all permissions
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT '00000000-0000-4000-8000-000000000001', "key" FROM "permissions";

-- Colaborador: basic permissions
INSERT INTO "role_permissions" ("role_id", "permission_key") VALUES
  ('00000000-0000-4000-8000-000000000002', 'leads.view_all'),
  ('00000000-0000-4000-8000-000000000002', 'leads.create'),
  ('00000000-0000-4000-8000-000000000002', 'leads.edit_all'),
  ('00000000-0000-4000-8000-000000000002', 'leads.import'),
  ('00000000-0000-4000-8000-000000000002', 'sales.create'),
  ('00000000-0000-4000-8000-000000000002', 'sales.view_all'),
  ('00000000-0000-4000-8000-000000000002', 'dashboard.general'),
  ('00000000-0000-4000-8000-000000000002', 'tv.view');

-- Migrate existing users to roles
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "id", '00000000-0000-4000-8000-000000000001'
FROM "users" WHERE "role" = 'ADMIN';

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "id", '00000000-0000-4000-8000-000000000002'
FROM "users" WHERE "role" = 'CONSULTANT';

-- Drop legacy role column and enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
