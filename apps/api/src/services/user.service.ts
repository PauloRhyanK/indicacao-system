import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { conflict } from "../utils/httpError.js";
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
