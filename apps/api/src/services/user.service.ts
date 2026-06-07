import bcrypt from "bcryptjs";
import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { conflict, notFound } from "../utils/httpError.js";
import type { CreateUserInput } from "../schemas/user.schema.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export async function listUsers(role?: UserRole) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    select: publicSelect,
    orderBy: { name: "asc" },
  });
}

export async function updatePersonalDailyTarget(userId: string, amount: number | null) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw notFound("Usuário não encontrado");

  return prisma.user.update({
    where: { id: userId },
    data: {
      personalDailyTarget:
        amount !== null && amount !== undefined ? new Prisma.Decimal(amount) : null,
    },
    select: {
      id: true,
      personalDailyTarget: true,
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Já existe um usuário com este e-mail");

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
    },
    select: publicSelect,
  });
}
