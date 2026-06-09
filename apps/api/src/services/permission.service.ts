import { prisma } from "../config/prisma.js";
import {
  ALL_PERMISSION_KEYS,
  COLABORADOR_PERMISSION_KEYS,
  PERMISSIONS_CATALOG,
  ROLE_ADMIN_NAME,
  ROLE_COLABORADOR_NAME,
} from "../constants/permissions.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";

const CACHE_TTL_MS = 60_000;
const permissionCache = new Map<string, { expires: number; perms: Set<string> }>();

export function invalidateUserPermissionCache(userId: string) {
  permissionCache.delete(userId);
}

export function invalidateAllPermissionCache() {
  permissionCache.clear();
}

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.perms;

  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          rolePermissions: { select: { permissionKey: true } },
        },
      },
    },
  });

  const perms = new Set<string>();
  for (const row of rows) {
    for (const rp of row.role.rolePermissions) {
      perms.add(rp.permissionKey);
    }
  }

  permissionCache.set(userId, { perms, expires: Date.now() + CACHE_TTL_MS });
  return perms;
}

export async function userHasAnyPermission(userId: string, keys: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return keys.some((k) => perms.has(k));
}

export function listPermissionsCatalog() {
  const groups = new Map<string, typeof PERMISSIONS_CATALOG>();
  for (const p of PERMISSIONS_CATALOG) {
    const list = groups.get(p.groupName) ?? [];
    list.push(p);
    groups.set(p.groupName, list);
  }
  return Array.from(groups.entries()).map(([groupName, permissions]) => ({
    groupName,
    permissions,
  }));
}

export async function syncPermissionsCatalog() {
  for (const p of PERMISSIONS_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, description: p.description, groupName: p.groupName },
      create: {
        key: p.key,
        label: p.label,
        description: p.description,
        groupName: p.groupName,
      },
    });
  }
}

export async function ensureSystemRoles() {
  await syncPermissionsCatalog();

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

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: ALL_PERMISSION_KEYS.map((key) => ({ roleId: adminRole.id, permissionKey: key })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: colabRole.id } });
  await prisma.rolePermission.createMany({
    data: COLABORADOR_PERMISSION_KEYS.map((key) => ({
      roleId: colabRole.id,
      permissionKey: key,
    })),
    skipDuplicates: true,
  });

  return { adminRoleId: adminRole.id, colaboradorRoleId: colabRole.id };
}

export async function getColaboradorRoleId(): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name: ROLE_COLABORADOR_NAME } });
  if (!role) throw notFound("Papel Colaborador não encontrado");
  return role.id;
}

export async function assignRoleToUser(userId: string, roleId: string) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId },
    update: {},
  });
  invalidateUserPermissionCache(userId);
}

export async function listRoles() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      rolePermissions: { select: { permissionKey: true } },
      _count: { select: { userRoles: true } },
    },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    permissionKeys: r.rolePermissions.map((rp) => rp.permissionKey),
    userCount: r._count.userRoles,
  }));
}

export async function createRole(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest("Nome do papel é obrigatório");
  const existing = await prisma.role.findUnique({ where: { name: trimmed } });
  if (existing) throw conflict("Já existe um papel com este nome");
  return prisma.role.create({
    data: { name: trimmed },
    include: { rolePermissions: { select: { permissionKey: true } } },
  });
}

export async function updateRoleName(id: string, name: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw notFound("Papel não encontrado");
  const trimmed = name.trim();
  if (!trimmed) throw badRequest("Nome do papel é obrigatório");
  const dup = await prisma.role.findFirst({ where: { name: trimmed, NOT: { id } } });
  if (dup) throw conflict("Já existe um papel com este nome");
  return prisma.role.update({ where: { id }, data: { name: trimmed } });
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw notFound("Papel não encontrado");
  if (role.isSystem) throw forbidden("Papéis do sistema não podem ser excluídos");
  await prisma.role.delete({ where: { id } });
  invalidateAllPermissionCache();
}

export async function setRolePermissions(roleId: string, permissionKeys: string[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw notFound("Papel não encontrado");

  const valid = new Set(ALL_PERMISSION_KEYS);
  for (const key of permissionKeys) {
    if (!valid.has(key)) throw badRequest(`Permissão inválida: ${key}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionKeys.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionKeys.map((permissionKey) => ({ roleId, permissionKey })),
      });
    }
  });

  invalidateAllPermissionCache();
  const roles = await listRoles();
  return roles.find((r) => r.id === roleId);
}

export async function setUserRoles(
  targetUserId: string,
  roleIds: string[],
  actorUserId: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });
  if (!user) throw notFound("Usuário não encontrado");

  if (roleIds.length > 0) {
    const found = await prisma.role.count({ where: { id: { in: roleIds } } });
    if (found !== roleIds.length) throw badRequest("Um ou mais papéis são inválidos");
  }

  const actorPerms = await getUserPermissions(actorUserId);
  if (targetUserId === actorUserId && actorPerms.has("roles.manage")) {
    const willHaveRolesManage = await prisma.role.count({
      where: {
        id: { in: roleIds },
        rolePermissions: { some: { permissionKey: "roles.manage" } },
      },
    });
    if (willHaveRolesManage === 0) {
      const others = await prisma.userRole.count({
        where: {
          userId: { not: actorUserId },
          role: { rolePermissions: { some: { permissionKey: "roles.manage" } } },
        },
      });
      if (others === 0) {
        throw forbidden("Não é possível remover a última permissão de gerenciar papéis");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: targetUserId } });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: targetUserId, roleId })),
      });
    }
  });

  invalidateUserPermissionCache(targetUserId);
}

export async function getUserRoles(userId: string) {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, name: true, isSystem: true } } },
  });
  return rows.map((r) => r.role);
}

export function canViewAllLeads(perms: Set<string>) {
  return perms.has("leads.view_all");
}

export function canViewOwnLeads(perms: Set<string>) {
  return perms.has("leads.view_own");
}

export function assertLeadViewAccess(perms: Set<string>) {
  if (!canViewAllLeads(perms) && !canViewOwnLeads(perms)) {
    throw forbidden("Você não tem permissão para visualizar leads");
  }
}

export function leadListFilter(perms: Set<string>, _userId: string) {
  assertLeadViewAccess(perms);
  return {};
}

export async function assertLeadReadable(leadId: string, _userId: string, perms: Set<string>) {
  assertLeadViewAccess(perms);
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) throw notFound("Lead não encontrado");
}

export async function assertLeadEditable(leadId: string, _userId: string, perms: Set<string>) {
  if (perms.has("leads.edit_all")) return;
  if (!perms.has("leads.edit_own")) {
    throw forbidden("Você não tem permissão para editar leads");
  }
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) throw notFound("Lead não encontrado");
}
