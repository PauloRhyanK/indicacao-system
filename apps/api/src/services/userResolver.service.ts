import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";
import { normalizeText } from "../utils/slugify.js";
import { activeUserWhere } from "../utils/softDelete.js";
import { allocateEmailForName, previewEmailForName } from "../utils/userEmail.js";
import { ROLE_COLABORADOR_NAME } from "../constants/permissions.js";

export type UserMappingAction =
  | { action: "map"; userId: string }
  | { action: "create"; name: string };

export interface UserImportMappings {
  users?: Record<string, UserMappingAction>;
}

export interface CreatedImportUser {
  userId: string;
  name: string;
  email: string;
}

export interface ResolveUserContext {
  createdUsers: Map<string, CreatedImportUser>;
  aliasAccumulator: Map<string, string[]>;
}

function randomPlaceholderPassword(): string {
  return `Imp${Math.random().toString(36).slice(2, 14)}!`;
}

export { previewEmailForName };

export async function findUserByNormalizedName(name: string) {
  const normalized = normalizeText(name);
  const users = await prisma.user.findMany({
    where: activeUserWhere,
    select: { id: true, name: true },
  });
  return users.find((u) => normalizeText(u.name) === normalized) ?? null;
}

export async function findUserByAlias(rawName: string) {
  const normalized = normalizeText(rawName);
  const alias = await prisma.userAlias.findUnique({
    where: { aliasNormalized: normalized },
    include: { user: { select: { id: true, name: true, deletedAt: true } } },
  });
  if (!alias || alias.user.deletedAt) return null;
  return alias.user;
}

export async function resolveUserPreview(rawName: string): Promise<string | null> {
  if (!rawName?.trim()) return null;
  const alias = await findUserByAlias(rawName);
  if (alias) return alias.id;
  const byName = await findUserByNormalizedName(rawName);
  return byName?.id ?? null;
}

export async function collectUnknownUserNames(names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort();
  const unknown: string[] = [];

  for (const raw of unique) {
    const resolved = await resolveUserPreview(raw);
    if (!resolved) unknown.push(raw);
  }

  return unknown;
}

export async function getSuggestedUserMappings(
  names: string[],
): Promise<Record<string, { userId: string; userName: string }>> {
  const suggestions: Record<string, { userId: string; userName: string }> = {};

  for (const raw of names) {
    const alias = await findUserByAlias(raw);
    if (alias) {
      suggestions[raw] = { userId: alias.id, userName: alias.name };
      continue;
    }
    const byName = await findUserByNormalizedName(raw);
    if (byName) {
      suggestions[raw] = { userId: byName.id, userName: byName.name };
    }
  }

  return suggestions;
}

export function validateUserMappingsCoverUnknown(
  unknownNames: string[],
  mappings: UserImportMappings,
): string[] {
  const missing: string[] = [];
  for (const val of unknownNames) {
    const action = mappings.users?.[val];
    if (!action) {
      missing.push(`Vendedor: ${val}`);
      continue;
    }
    if (action.action === "map" && !action.userId) missing.push(`Vendedor: ${val}`);
    if (action.action === "create" && !action.name.trim()) missing.push(`Vendedor: ${val}`);
  }
  return missing;
}

function trackAlias(ctx: ResolveUserContext | undefined, raw: string, userId: string) {
  if (!ctx) return;
  const list = ctx.aliasAccumulator.get(userId) ?? [];
  if (!list.includes(raw.trim())) list.push(raw.trim());
  ctx.aliasAccumulator.set(userId, list);
}

function trackCreatedUser(
  ctx: ResolveUserContext | undefined,
  userId: string,
  name: string,
  email: string,
) {
  if (!ctx) return;
  if (!ctx.createdUsers.has(userId)) {
    ctx.createdUsers.set(userId, { userId, name, email });
  }
}

export async function resolveUserId(
  rawName: string | undefined,
  mappings: UserImportMappings,
  tx: Prisma.TransactionClient,
  cache: Map<string, string | null>,
  ctx?: ResolveUserContext,
): Promise<string | undefined> {
  if (!rawName) return undefined;
  const trimmed = rawName.trim();
  if (!trimmed) return undefined;

  const cacheKey = normalizeText(trimmed);
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (cached) trackAlias(ctx, trimmed, cached);
    return cached ?? undefined;
  }

  const mapping = mappings.users?.[trimmed];

  if (mapping?.action === "map") {
    const user = await tx.user.findFirst({
      where: { id: mapping.userId, ...activeUserWhere },
      select: { id: true },
    });
    if (!user) throw badRequest(`Usuário mapeado não encontrado para "${trimmed}"`);
    cache.set(cacheKey, user.id);
    trackAlias(ctx, trimmed, user.id);
    return user.id;
  }

  if (mapping?.action === "create") {
    const officialName = mapping.name.trim();
    const email = await allocateEmailForName(officialName, tx);
    const placeholder = randomPlaceholderPassword();

    const created = await tx.user.create({
      data: {
        name: officialName,
        email,
        passwordHash: await bcrypt.hash(placeholder, 10),
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true },
    });

    const colaboradorRole = await tx.role.findUnique({
      where: { name: ROLE_COLABORADOR_NAME },
      select: { id: true },
    });
    if (colaboradorRole) {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: created.id, roleId: colaboradorRole.id } },
        create: { userId: created.id, roleId: colaboradorRole.id },
        update: {},
      });
    }

    cache.set(cacheKey, created.id);
    trackAlias(ctx, trimmed, created.id);
    trackCreatedUser(ctx, created.id, created.name, created.email);
    return created.id;
  }

  const alias = await tx.userAlias.findUnique({
    where: { aliasNormalized: cacheKey },
    include: { user: { select: { id: true, deletedAt: true } } },
  });
  if (alias && !alias.user.deletedAt) {
    cache.set(cacheKey, alias.user.id);
    trackAlias(ctx, trimmed, alias.user.id);
    return alias.user.id;
  }

  const users = await tx.user.findMany({
    where: activeUserWhere,
    select: { id: true, name: true },
  });
  const byName = users.find((u) => normalizeText(u.name) === cacheKey);
  if (byName) {
    cache.set(cacheKey, byName.id);
    trackAlias(ctx, trimmed, byName.id);
    return byName.id;
  }

  cache.set(cacheKey, null);
  throw badRequest(`Vendedor "${trimmed}" não mapeado`);
}

export async function persistUserAliases(
  mappings: UserImportMappings,
  ctx: ResolveUserContext | undefined,
  tx: Prisma.TransactionClient = prisma,
) {
  const entries = ctx?.aliasAccumulator ?? new Map<string, string[]>();

  if (mappings.users) {
    for (const [raw, action] of Object.entries(mappings.users)) {
      if (action.action === "map") {
        trackAlias({ createdUsers: new Map(), aliasAccumulator: entries }, raw, action.userId);
      }
    }
  }

  for (const [userId, aliases] of entries) {
    for (const raw of aliases) {
      const aliasNormalized = normalizeText(raw);
      await tx.userAlias.upsert({
        where: { aliasNormalized },
        create: { aliasNormalized, aliasRaw: raw, userId },
        update: { aliasRaw: raw, userId },
      });
    }
  }
}

export function buildCreatedUsersReport(
  ctx: ResolveUserContext,
): { name: string; email: string; sheetAliases: string[] }[] {
  return [...ctx.createdUsers.values()].map((u) => ({
    name: u.name,
    email: u.email,
    sheetAliases: ctx.aliasAccumulator.get(u.userId) ?? [],
  }));
}
