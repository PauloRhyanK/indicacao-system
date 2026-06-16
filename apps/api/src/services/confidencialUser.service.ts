import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { UserAccessScope } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ROLE_CONFIDENCIAL_NAME } from "../constants/permissions.js";
import { activeUserWhere } from "../utils/softDelete.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { assignRoleToUser } from "./permission.service.js";
import { setConfidencialUserRoles } from "./rjRole.service.js";
import { recordRjAudit } from "./rjAudit.service.js";
import type { CreateConfidencialUserInput } from "../schemas/confidencialUser.schema.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  mustChangePassword: true,
  accessScope: true,
  confidencialApprovedAt: true,
  createdAt: true,
  userRoles: {
    select: {
      role: { select: { id: true, name: true, isSystem: true } },
    },
  },
} as const;

function mapConfidencialUser(row: {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  accessScope: UserAccessScope;
  confidencialApprovedAt: Date | null;
  createdAt: Date;
  userRoles: { role: { id: string; name: string; isSystem: boolean } }[];
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mustChangePassword: row.mustChangePassword,
    accessScope: row.accessScope,
    confidencialApprovedAt: row.confidencialApprovedAt?.toISOString() ?? null,
    isApproved: row.confidencialApprovedAt != null,
    createdAt: row.createdAt,
    roles: row.userRoles.map((ur) => ur.role),
  };
}

async function getDefaultConfidencialRoleId() {
  const role = await prisma.role.findUnique({ where: { name: ROLE_CONFIDENCIAL_NAME } });
  if (!role) throw notFound("Papel de acesso confidencial não configurado");
  return role.id;
}

export async function listConfidencialUsers() {
  const users = await prisma.user.findMany({
    where: { ...activeUserWhere, accessScope: "CONFIDENCIAL" },
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  return users.map(mapConfidencialUser);
}

export async function createConfidencialUser(
  input: CreateConfidencialUserInput,
  actorUserId?: string,
) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deletedAt) {
    throw conflict("Já existe um usuário com este e-mail");
  }

  const placeholderPassword = randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await bcrypt.hash(placeholderPassword, 10),
      mustChangePassword: true,
      accessScope: "CONFIDENCIAL",
      confidencialApprovedAt: new Date(),
    },
    select: { id: true },
  });

  if (input.roleIds && input.roleIds.length > 0) {
    await setConfidencialUserRoles(user.id, input.roleIds);
  } else {
    await assignRoleToUser(user.id, await getDefaultConfidencialRoleId());
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicSelect,
  });
  const mapped = full ? mapConfidencialUser(full) : null;

  if (mapped) {
    const roleNames = mapped.roles.map((r) => r.name);
    await recordRjAudit({
      actorUserId,
      entityType: "usuario",
      entityId: mapped.id,
      entityLabel: mapped.email,
      action: "create",
      summary: `Usuário cadastrado: ${mapped.name} (${mapped.email})`,
      changes: [
        {
          field: "roles",
          label: "Papéis",
          oldValue: null,
          newValue: roleNames.join(", ") || "—",
        },
      ],
    });
  }

  return mapped;
}

export async function approveConfidencialUser(userId: string, actorUserId?: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
    select: publicSelect,
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");
  if (user.confidencialApprovedAt) {
    throw badRequest("Este usuário já foi liberado.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { confidencialApprovedAt: new Date() },
    select: publicSelect,
  });

  await recordRjAudit({
    actorUserId,
    entityType: "usuario",
    entityId: updated.id,
    entityLabel: updated.email,
    action: "approve",
    summary: `Acesso liberado: ${updated.name} (${updated.email})`,
  });

  return mapConfidencialUser(updated);
}

export async function resetConfidencialUserPassword(userId: string, actorUserId: string) {
  if (userId === actorUserId) {
    throw badRequest("Use a página de redefinição de senha para alterar a sua própria senha.");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
    select: { id: true, name: true, email: true, mustChangePassword: true },
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");

  if (user.mustChangePassword) {
    return { alreadyPending: true as const };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: true },
  });

  await recordRjAudit({
    actorUserId,
    entityType: "usuario",
    entityId: user.id,
    entityLabel: user.email,
    action: "reset_password",
    summary: `Senha resetada: ${user.name} (${user.email})`,
  });

  return { alreadyPending: false as const };
}

export async function deleteConfidencialUser(userId: string, actorUserId?: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  await recordRjAudit({
    actorUserId,
    entityType: "usuario",
    entityId: user.id,
    entityLabel: user.email,
    action: "delete",
    summary: `Usuário removido: ${user.name} (${user.email})`,
  });
}
