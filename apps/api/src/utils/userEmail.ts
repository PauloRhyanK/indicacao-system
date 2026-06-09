import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { normalizeText } from "./slugify.js";

export const USER_EMAIL_DOMAIN = "caisinvestimentos.com.br";

/** Primeiro nome → local-part sem acento (ex.: "Fabrício Silva" → "fabricio"). */
export function emailLocalPartFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return normalizeText(first).replace(/[^a-z0-9]/g, "");
}

export function buildEmailFromLocalPart(localPart: string, numericSuffix: number | null): string {
  const base = localPart || "usuario";
  const part = numericSuffix === null ? base : `${base}${numericSuffix}`;
  return `${part}@${USER_EMAIL_DOMAIN}`;
}

export function previewEmailForName(name: string): string {
  const local = emailLocalPartFromName(name);
  return buildEmailFromLocalPart(local || "usuario", null);
}

async function emailExists(
  email: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> {
  const row = await tx.user.findUnique({ where: { email }, select: { id: true, deletedAt: true } });
  return !!row && !row.deletedAt;
}

export async function allocateEmailForName(
  name: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const local = emailLocalPartFromName(name) || "usuario";
  let numericSuffix: number | null = null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const candidate = buildEmailFromLocalPart(local, numericSuffix);
    if (!(await emailExists(candidate, tx))) return candidate;
    numericSuffix = numericSuffix === null ? 2 : numericSuffix + 1;
  }

  throw new Error("Não foi possível alocar e-mail único para o usuário");
}
