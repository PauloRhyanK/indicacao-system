import bcrypt from "bcryptjs";
import type { UserAccessScope } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { ROLE_CONFIDENCIAL_NAME } from "../constants/permissions.js";
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

async function getDefaultConfidencialRoleId() {
  const role = await prisma.role.findUnique({ where: { name: ROLE_CONFIDENCIAL_NAME } });
  if (!role) throw badRequest("Ambiente confidencial não configurado.");
  return role.id;
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Usuário";
  return local.replace(/[._-]+/g, " ").trim() || "Usuário";
}

export async function setInitialPassword(input: SetInitialPasswordInput) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const created = await prisma.user.create({
      data: {
        name: nameFromEmail(email),
        email,
        passwordHash,
        mustChangePassword: false,
        accessScope: "CONFIDENCIAL",
        confidencialApprovedAt: null,
      },
    });
    await assignRoleToUser(created.id, await getDefaultConfidencialRoleId());
    return created;
  }

  if (user.deletedAt) {
    if (user.accessScope !== "CONFIDENCIAL") {
      throw badRequest("Este e-mail não pode ser usado neste ambiente.");
    }
    const restored = await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        passwordHash,
        mustChangePassword: false,
        confidencialApprovedAt: null,
      },
    });
    await assignRoleToUser(restored.id, await getDefaultConfidencialRoleId());
    return restored;
  }

  if (user.accessScope === "INTERNAL" && !user.mustChangePassword) {
    throw badRequest("Este e-mail já está cadastrado no sistema admin.");
  }

  if (user.accessScope !== "CONFIDENCIAL" && user.accessScope !== "INTERNAL") {
    throw unauthorized("E-mail não encontrado");
  }

  if (!user.mustChangePassword) {
    throw badRequest("Esta conta já possui senha definida. Use o login normal.");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
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
      accessScope: "INTERNAL",
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
    accessScope?: UserAccessScope;
    confidencialApprovedAt?: Date | null;
    outlookRefreshToken?: string | null;
  },
  roles: { id: string; name: string; isSystem: boolean }[] = [],
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles,
    accessScope: user.accessScope ?? "INTERNAL",
    createdAt: user.createdAt,
    mustChangePassword: user.mustChangePassword ?? false,
    confidencialApprovedAt: user.confidencialApprovedAt?.toISOString() ?? null,
    outlookConnected: !!user.outlookRefreshToken,
  };
}
