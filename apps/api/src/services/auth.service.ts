import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { conflict, unauthorized } from "../utils/httpError.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

export async function validateCredentials(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized("Credenciais inválidas");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw unauthorized("Credenciais inválidas");

  return user;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Já existe um usuário com este e-mail");

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: UserRole.CONSULTANT,
    },
  });
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
