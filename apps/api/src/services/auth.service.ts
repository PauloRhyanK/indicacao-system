import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import {
  assignRoleToUser,
  getColaboradorRoleId,
} from "./permission.service.js";
import type { LoginInput, RegisterInput, SetInitialPasswordInput } from "../schemas/auth.schema.js";

export const PASSWORD_SETUP_REQUIRED = "PASSWORD_SETUP_REQUIRED";

export async function validateCredentials(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.deletedAt) throw unauthorized("Credenciais inválidas");

  if (user.mustChangePassword) {
    throw unauthorized("Defina sua senha no primeiro acesso", {
      code: PASSWORD_SETUP_REQUIRED,
    });
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw unauthorized("Credenciais inválidas");

  return user;
}

export async function setInitialPassword(input: SetInitialPasswordInput) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw unauthorized("E-mail não encontrado");

  if (!user.mustChangePassword) {
    throw badRequest("Esta conta já possui senha definida. Use o login normal.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(input.password, 10),
      mustChangePassword: false,
    },
  });

  return updated;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Já existe um usuário com este e-mail");

  const colaboradorRoleId = await getColaboradorRoleId();

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
  });

  await assignRoleToUser(user.id, colaboradorRoleId);
  return user;
}

export function publicUser(
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    mustChangePassword?: boolean;
  },
  roles: { id: string; name: string; isSystem: boolean }[] = [],
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles,
    createdAt: user.createdAt,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}
