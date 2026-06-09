import type { Prisma } from "@prisma/client";
import { badRequest } from "../utils/httpError.js";
import { normalizeText } from "../utils/slugify.js";
import {
  createLookupByName,
  findBySlug,
  findStatusByName,
  type LookupKind,
} from "./lookup.service.js";

export type UserMappingAction =
  | { action: "map"; userId: string }
  | { action: "create"; name: string; email: string; password?: string }
  | { action: "skip" };

export interface ImportMappings {
  statuses?: Record<string, MappingAction>;
  users?: Record<string, UserMappingAction>;
}

export type MappingAction =
  | { action: "map"; targetSlug: string }
  | { action: "create"; name: string };

export interface UnknownValues {
  statuses: string[];
}

export async function collectUnknownValues(rows: Record<string, unknown>[]): Promise<UnknownValues> {
  const statusSet = new Set<string>();

  for (const row of rows) {
    if (row.salesStatus) {
      const val = String(row.salesStatus).trim();
      if (val && !(await findStatusByName(val))) statusSet.add(val);
    }
  }

  return {
    statuses: [...statusSet].sort(),
  };
}

export function hasUnknownValues(unknown: UnknownValues): boolean {
  return unknown.statuses.length > 0;
}

export async function resolveStatusId(
  raw: string | undefined,
  mappings: ImportMappings,
  tx: Prisma.TransactionClient,
  cache: Map<string, string | null>
): Promise<string | undefined> {
  return resolveId("status", raw, mappings.statuses, findStatusByName, tx, cache);
}

async function resolveId(
  kind: LookupKind,
  raw: string | undefined,
  mappingTable: Record<string, MappingAction> | undefined,
  findByName: (name: string) => Promise<{ id: string } | null>,
  tx: Prisma.TransactionClient,
  cache: Map<string, string | null>
): Promise<string | undefined> {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const cacheKey = `${kind}:${normalizeText(trimmed)}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    return cached ?? undefined;
  }

  const existing = await findByName(trimmed);
  if (existing) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const mapping = mappingTable?.[trimmed];
  if (!mapping) {
    cache.set(cacheKey, null);
    throw badRequest(`Valor "${trimmed}" não mapeado para ${kind}`);
  }

  if (mapping.action === "map") {
    const target = await findBySlug(kind, mapping.targetSlug);
    if (!target) throw badRequest(`Slug "${mapping.targetSlug}" não encontrado`);
    cache.set(cacheKey, target.id);
    return target.id;
  }

  const created = await createLookupByName(kind, mapping.name);
  cache.set(cacheKey, created.id);
  return created.id;
}

export function validateMappingsCoverUnknown(
  unknown: UnknownValues,
  mappings: ImportMappings
): string[] {
  const missing: string[] = [];
  for (const val of unknown.statuses) {
    if (!mappings.statuses?.[val]) missing.push(`Status: ${val}`);
  }
  return missing;
}
