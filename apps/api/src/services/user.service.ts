import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { conflict, notFound } from "../utils/httpError.js";
import { setUserRoles } from "./permission.service.js";
import type { CreateUserInput } from "../schemas/user.schema.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
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
  createdAt: Date;
  userRoles: { role: { id: string; name: string; isSystem: boolean } }[];
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    roles: row.userRoles.map((ur) => ur.role),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  return users.map(mapUser);
}

export async function updatePersonalDailyTarget(userId: string, amount: number | null) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
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
  if (existing) throw conflict("Já existe um usuário com este e-mail");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
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
