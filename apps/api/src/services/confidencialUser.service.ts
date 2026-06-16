import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { UserAccessScope } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ROLE_CONFIDENCIAL_NAME } from "../constants/permissions.js";
import { activeUserWhere } from "../utils/softDelete.js";
import { conflict, notFound } from "../utils/httpError.js";
import { assignRoleToUser } from "./permission.service.js";
import type { CreateConfidencialUserInput } from "../schemas/confidencialUser.schema.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  mustChangePassword: true,
  accessScope: true,
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
  createdAt: Date;
  userRoles: { role: { id: string; name: string; isSystem: boolean } }[];
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mustChangePassword: row.mustChangePassword,
    accessScope: row.accessScope,
    createdAt: row.createdAt,
    roles: row.userRoles.map((ur) => ur.role),
  };
}

async function getConfidencialRoleId() {
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

export async function createConfidencialUser(input: CreateConfidencialUserInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deletedAt) {
    throw conflict("Já existe um usuário com este e-mail");
  }

  const placeholderPassword = randomBytes(32).toString("hex");
  const confidencialRoleId = await getConfidencialRoleId();

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await bcrypt.hash(placeholderPassword, 10),
      mustChangePassword: true,
      accessScope: "CONFIDENCIAL",
    },
    select: { id: true },
  });

  await assignRoleToUser(user.id, confidencialRoleId);

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicSelect,
  });
  return full ? mapConfidencialUser(full) : null;
}

export async function deleteConfidencialUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere, accessScope: "CONFIDENCIAL" },
    select: { id: true },
  });
  if (!user) throw notFound("Usuário confidencial não encontrado");

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}
