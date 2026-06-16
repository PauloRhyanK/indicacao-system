import type { PrismaClient } from "@prisma/client";

const PERMISSIONS_CATALOG = [
  { key: "leads.view_all", label: "Ver todos os leads", groupName: "Leads" },
  { key: "leads.view_own", label: "Ver somente seus leads", groupName: "Leads" },
  { key: "leads.create", label: "Criar lead", groupName: "Leads" },
  { key: "leads.edit_all", label: "Editar qualquer lead", groupName: "Leads" },
  { key: "leads.edit_own", label: "Editar somente os seus", groupName: "Leads" },
  { key: "leads.delete", label: "Excluir lead", groupName: "Leads" },
  { key: "leads.import", label: "Importar leads (Excel)", groupName: "Leads" },
  { key: "sales.create", label: "Registrar venda", groupName: "Vendas" },
  { key: "sales.view_all", label: "Ver todas as vendas", groupName: "Vendas" },
  { key: "sales.delete", label: "Cancelar venda", groupName: "Vendas" },
  {
    key: "rewards.payments",
    label: "Ver e registrar pagamento de recompensas",
    groupName: "Indicações",
  },
  {
    key: "rewards.client_choice",
    label: "Registrar escolha do cliente",
    groupName: "Indicações",
  },
  { key: "meta.configure_day", label: "Configurar meta do dia", groupName: "Metas" },
  { key: "meta.configure_global", label: "Configurar meta global", groupName: "Metas" },
  { key: "dashboard.general", label: "Visão geral da empresa", groupName: "Dashboard" },
  { key: "tv.view", label: "Acessar painel TV", groupName: "Dashboard" },
  { key: "users.manage", label: "Gerenciar usuários", groupName: "Administração" },
  { key: "roles.manage", label: "Gerenciar papéis", groupName: "Administração" },
  { key: "settings.manage", label: "Gerenciar domínios do sistema", groupName: "Administração" },
  {
    key: "rj.view",
    label: "Ver condomínio de credores (RJ)",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.manage",
    label: "Gerenciar condomínio de credores (RJ)",
    groupName: "Recuperacao Judicial",
  },
] as const;

const COLABORADOR_PERMISSION_KEYS = [
  "leads.view_all",
  "leads.create",
  "leads.edit_all",
  "leads.import",
  "sales.create",
  "sales.view_all",
  "rewards.client_choice",
  "dashboard.general",
  "tv.view",
] as const;

const ROLE_ADMIN_NAME = "Administrador";
const ROLE_COLABORADOR_NAME = "Colaborador";

async function syncPermissionsCatalog(prisma: PrismaClient) {
  for (const p of PERMISSIONS_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, groupName: p.groupName },
      create: { key: p.key, label: p.label, groupName: p.groupName },
    });
  }
}

export async function ensureSystemRoles(prisma: PrismaClient) {
  await syncPermissionsCatalog(prisma);

  const adminRole = await prisma.role.upsert({
    where: { name: ROLE_ADMIN_NAME },
    update: { isSystem: true },
    create: { name: ROLE_ADMIN_NAME, isSystem: true },
  });

  const colabRole = await prisma.role.upsert({
    where: { name: ROLE_COLABORADOR_NAME },
    update: { isSystem: true },
    create: { name: ROLE_COLABORADOR_NAME, isSystem: true },
  });

  const allKeys = PERMISSIONS_CATALOG.map((p) => p.key);

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allKeys.map((permissionKey) => ({ roleId: adminRole.id, permissionKey })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: colabRole.id } });
  await prisma.rolePermission.createMany({
    data: COLABORADOR_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: colabRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });

  return { adminRoleId: adminRole.id, colaboradorRoleId: colabRole.id };
}

export async function assignRoleToUser(prisma: PrismaClient, userId: string, roleId: string) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId },
    update: {},
  });
}
