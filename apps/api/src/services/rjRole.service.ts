import { prisma } from "../config/prisma.js";
import {
  PERMISSIONS_CATALOG,
  RJ_GROUP_NAME,
  RJ_PERMISSION_KEYS,
  RJ_SYSTEM_ROLE_NAMES,
} from "../constants/permissions.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import {
  invalidateAllPermissionCache,
  invalidateUserPermissionCache,
} from "./permission.service.js";
import { activeUserWhere } from "../utils/softDelete.js";
import {
  buildPermissionChangeSummary,
  buildRoleNamesSummary,
  recordRjAudit,
} from "./rjAudit.service.js";

const RJ_KEY_SET = new Set<string>(RJ_PERMISSION_KEYS);

function hasOnlyRjPermissions(keys: string[]): boolean {
  return keys.every((k) => RJ_KEY_SET.has(k));
}

async function assertRjOnlyRole(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { select: { permissionKey: true } } },
  });
  if (!role) throw notFound("Papel não encontrado");
  const keys = role.rolePermissions.map((rp) => rp.permissionKey);
  if (!hasOnlyRjPermissions(keys)) {
    throw badRequest("Papel não pertence ao módulo RJ");
  }
  return role;
}

export function listRjPermissionsCatalog() {
  const permissions = PERMISSIONS_CATALOG.filter((p) => p.groupName === RJ_GROUP_NAME);
  return [{ groupName: RJ_GROUP_NAME, permissions }];
}

export async function listRjRoles() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      rolePermissions: { select: { permissionKey: true } },
      _count: { select: { userRoles: true } },
    },
  });

  return roles
    .filter((r) => hasOnlyRjPermissions(r.rolePermissions.map((rp) => rp.permissionKey)))
    .map((r) => ({
      id: r.id,
      name: r.name,
      isSystem: r.isSystem,
      createdAt: r.createdAt,
      permissionKeys: r.rolePermissions.map((rp) => rp.permissionKey),
      userCount: r._count.userRoles,
    }));
}

export async function createRjRole(name: string, actorUserId?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw badRequest("Nome do papel é obrigatório");
  const existing = await prisma.role.findUnique({ where: { name: trimmed } });
  if (existing) throw conflict("Já existe um papel com este nome");
  const role = await prisma.role.create({ data: { name: trimmed } });
  await prisma.rolePermission.create({
    data: { roleId: role.id, permissionKey: "rj.view" },
  });
  invalidateAllPermissionCache();

  await recordRjAudit({
    actorUserId,
    entityType: "papel",
    entityId: role.id,
    entityLabel: role.name,
    action: "create",
    summary: `Papel criado: ${role.name}`,
  });

  return {
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
    permissionKeys: ["rj.view"],
    userCount: 0,
    createdAt: role.createdAt,
  };
}

export async function updateRjRoleName(id: string, name: string, actorUserId?: string) {
  const role = await assertRjOnlyRole(id);
  if (RJ_SYSTEM_ROLE_NAMES.includes(role.name as (typeof RJ_SYSTEM_ROLE_NAMES)[number])) {
    throw forbidden("Papéis do sistema RJ não podem ser renomeados");
  }
  const trimmed = name.trim();
  if (!trimmed) throw badRequest("Nome do papel é obrigatório");
  const dup = await prisma.role.findFirst({ where: { name: trimmed, NOT: { id } } });
  if (dup) throw conflict("Já existe um papel com este nome");
  const updated = await prisma.role.update({ where: { id }, data: { name: trimmed } });

  await recordRjAudit({
    actorUserId,
    entityType: "papel",
    entityId: updated.id,
    entityLabel: updated.name,
    action: "update",
    summary: `Papel renomeado: ${role.name} → ${updated.name}`,
    changes: [
      { field: "name", label: "Nome", oldValue: role.name, newValue: updated.name },
    ],
  });

  return { id: updated.id, name: updated.name };
}

export async function deleteRjRole(id: string, actorUserId?: string) {
  const role = await assertRjOnlyRole(id);
  if (role.isSystem) throw forbidden("Papéis do sistema não podem ser excluídos");
  await prisma.role.delete({ where: { id } });
  invalidateAllPermissionCache();

  await recordRjAudit({
    actorUserId,
    entityType: "papel",
    entityId: role.id,
    entityLabel: role.name,
    action: "delete",
    summary: `Papel excluído: ${role.name}`,
  });
}

function normalizeRjPermissionKeys(keys: string[]): string[] {
  const set = new Set(keys);
  if (set.has("rj.manage") || set.has("rj.settings")) {
    set.add("rj.view");
  }
  return [...set];
}

export async function setRjRolePermissions(
  roleId: string,
  permissionKeys: string[],
  actorUserId?: string,
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { select: { permissionKey: true } } },
  });
  if (!role) throw notFound("Papel não encontrado");
  const currentKeys = role.rolePermissions.map((rp) => rp.permissionKey);
  if (!hasOnlyRjPermissions(currentKeys)) {
    throw badRequest("Papel não pertence ao módulo RJ");
  }

  const normalizedKeys = normalizeRjPermissionKeys(permissionKeys);

  if (normalizedKeys.length === 0) {
    throw badRequest("Selecione ao menos uma permissão RJ");
  }

  for (const key of normalizedKeys) {
    if (!RJ_KEY_SET.has(key)) throw badRequest(`Permissão inválida para RJ: ${key}`);
  }

  const beforeSorted = [...currentKeys].sort();
  const afterSorted = [...normalizedKeys].sort();
  const changed =
    beforeSorted.length !== afterSorted.length ||
    beforeSorted.some((k, i) => k !== afterSorted[i]);

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (normalizedKeys.length > 0) {
      await tx.rolePermission.createMany({
        data: normalizedKeys.map((permissionKey) => ({ roleId, permissionKey })),
      });
    }
  });

  invalidateAllPermissionCache();

  if (changed) {
    await recordRjAudit({
      actorUserId,
      entityType: "papel",
      entityId: role.id,
      entityLabel: role.name,
      action: "update",
      summary: buildPermissionChangeSummary(currentKeys, normalizedKeys),
      changes: [
        {
          field: "permissions",
          label: "Permissões",
          oldValue: beforeSorted.join(", "),
          newValue: afterSorted.join(", "),
        },
      ],
    });
  }

  const roles = await listRjRoles();
  return roles.find((r) => r.id === roleId);
}

export async function setConfidencialUserRoles(
  targetUserId: string,
  roleIds: string[],
  actorUserId?: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");

  if (roleIds.length === 0) throw badRequest("Selecione ao menos um papel RJ");

  for (const roleId of roleIds) {
    await assertRjOnlyRole(roleId);
  }

  const beforeRows = await prisma.userRole.findMany({
    where: { userId: targetUserId },
    include: { role: { select: { name: true } } },
  });
  const beforeNames = beforeRows.map((r) => r.role.name).sort();

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: targetUserId } });
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: targetUserId, roleId })),
    });
  });

  invalidateUserPermissionCache(targetUserId);

  const rows = await prisma.userRole.findMany({
    where: { userId: targetUserId },
    include: { role: { select: { id: true, name: true, isSystem: true } } },
  });
  const afterNames = rows.map((r) => r.role.name).sort();

  if (actorUserId) {
    const beforeLabel = beforeNames.join(", ");
    const afterLabel = afterNames.join(", ");
    if (beforeLabel !== afterLabel) {
      const userInfo = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, name: true },
      });
      await recordRjAudit({
        actorUserId,
        entityType: "usuario",
        entityId: targetUserId,
        entityLabel: userInfo?.email ?? targetUserId,
        action: "role_change",
        summary: `${userInfo?.name ?? "Usuário"}: ${buildRoleNamesSummary(beforeNames, afterNames)}`,
        changes: [
          {
            field: "roles",
            label: "Papéis",
            oldValue: beforeNames.length ? beforeNames.join(", ") : null,
            newValue: afterNames.join(", "),
          },
        ],
      });
    }
  }

  return rows.map((r) => r.role);
}

export async function getConfidencialUserRoles(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");

  const rows = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, name: true, isSystem: true } } },
  });
  return rows.map((r) => r.role);
}
