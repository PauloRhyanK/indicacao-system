import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { ROLE_ADMIN_NAME } from "../constants/permissions.js";
import { setUserRoles } from "./permission.service.js";
import { activeLeadWhere, activeUserWhere } from "../utils/softDelete.js";
import type { CreateUserInput } from "../schemas/user.schema.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  mustChangePassword: true,
  accessScope: true,
  createdAt: true,
  personalDailyTarget: true,
  userRoles: {
    select: {
      role: { select: { id: true, name: true, isSystem: true } },
    },
  },
} as const;

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  accessScope: string;
  createdAt: Date;
  personalDailyTarget: unknown;
  userRoles: { role: { id: string; name: string; isSystem: boolean } }[];
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mustChangePassword: row.mustChangePassword,
    access_scope: row.accessScope,
    createdAt: row.createdAt,
    personalDailyTarget:
      row.personalDailyTarget !== null ? Number(row.personalDailyTarget) : null,
    roles: row.userRoles.map((ur) => ur.role),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: activeUserWhere,
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  return users.map(mapUser);
}

export async function updatePersonalDailyTarget(userId: string, amount: number | null) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere },
    select: { id: true },
  });
  if (!user) throw notFound("Usuário não encontrado");

  return prisma.user.update({
    where: { id: userId },
    data: {
      personalDailyTarget: amount !== null && amount !== undefined ? amount : null,
    },
    select: {
      id: true,
      personalDailyTarget: true,
    },
  });
}

export async function createUser(input: CreateUserInput, actorUserId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing && !existing.deletedAt) throw conflict("Já existe um usuário com este e-mail");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      accessScope: "INTERNAL",
    },
    select: { id: true },
  });

  await setUserRoles(user.id, input.roleIds, actorUserId);

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicSelect,
  });
  return full ? mapUser(full) : null;
}

export async function countUserLeadLinks(userId: string) {
  return prisma.lead.count({
    where: {
      ...activeLeadWhere,
      OR: [{ responsavelId: userId }, { coVendedorId: userId }],
    },
  });
}

async function isOnlyActiveAdmin(userId: string): Promise<boolean> {
  const adminRoles = await prisma.role.findMany({
    where: { name: ROLE_ADMIN_NAME },
    select: { id: true },
  });
  if (adminRoles.length === 0) return false;

  const adminRoleIds = adminRoles.map((r) => r.id);
  const userIsAdmin = await prisma.userRole.count({
    where: { userId, roleId: { in: adminRoleIds } },
  });
  if (userIsAdmin === 0) return false;

  const otherActiveAdmins = await prisma.userRole.count({
    where: {
      roleId: { in: adminRoleIds },
      userId: { not: userId },
      user: activeUserWhere,
    },
  });
  return otherActiveAdmins === 0;
}

export async function deleteUser(targetUserId: string, actorUserId: string) {
  if (targetUserId === actorUserId) {
    throw badRequest("Você não pode excluir sua própria conta");
  }

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, ...activeUserWhere },
    select: { id: true },
  });
  if (!user) throw notFound("Usuário não encontrado");

  if (await isOnlyActiveAdmin(targetUserId)) {
    throw forbidden("Não é possível excluir o único administrador ativo");
  }

  const linkedLeads = await countUserLeadLinks(targetUserId);

  await prisma.$transaction(async (tx) => {
    await tx.lead.updateMany({
      where: {
        ...activeLeadWhere,
        OR: [{ responsavelId: targetUserId }, { coVendedorId: targetUserId }],
      },
      data: { responsavelId: null, coVendedorId: null },
    });

    await tx.user.update({
      where: { id: targetUserId },
      data: { deletedAt: new Date() },
    });
  });

  return { linkedLeads };
}

export async function requirePasswordSetup(targetUserId: string, actorUserId: string) {
  if (targetUserId === actorUserId) {
    throw badRequest("Você não pode exigir redefinição de senha na sua própria conta");
  }

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, ...activeUserWhere },
    select: { id: true, mustChangePassword: true },
  });
  if (!user) throw notFound("Usuário não encontrado");

  if (user.mustChangePassword) {
    return { alreadyPending: true as const };
  }

  if (await isOnlyActiveAdmin(targetUserId)) {
    throw forbidden("Não é possível exigir redefinição de senha do único administrador ativo");
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { mustChangePassword: true },
  });

  return { alreadyPending: false as const };
}
