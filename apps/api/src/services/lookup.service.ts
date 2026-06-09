import { prisma } from "../config/prisma.js";
import { conflict, notFound } from "../utils/httpError.js";
import { normalizeText, slugify } from "../utils/slugify.js";
import type { CreateLookupInput, UpdateLookupInput } from "../schemas/settings.schema.js";
import { activeLeadWhere } from "../utils/softDelete.js";

export type LookupKind = "status";

export async function getAllLookups() {
  const [statuses, consortiumTypes] = await Promise.all([
    prisma.leadStatus.findMany({ orderBy: { name: "asc" } }),
    prisma.consortiumType.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { statuses, consortiumTypes };
}

export async function listLookups(kind: LookupKind) {
  return prisma.leadStatus.findMany({ orderBy: { name: "asc" } });
}

export async function createLookup(kind: LookupKind, input: CreateLookupInput) {
  const slug = input.slug?.trim() || slugify(input.name);
  const name = input.name.trim();

  const existing = await prisma.leadStatus.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
  });
  if (existing) throw conflict("Já existe um registro com esse nome ou slug");
  return prisma.leadStatus.create({ data: { slug, name } });
}

export async function updateLookup(kind: LookupKind, id: string, input: UpdateLookupInput) {
  const name = input.name?.trim();

  const existing = await prisma.leadStatus.findUnique({ where: { id } });
  if (!existing) throw notFound("Registro não encontrado");
  if (name) {
    const dup = await prisma.leadStatus.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
    });
    if (dup) throw conflict("Já existe um registro com esse nome");
  }
  return prisma.leadStatus.update({
    where: { id },
    data: { ...(name ? { name } : {}) },
  });
}

export async function deleteLookup(kind: LookupKind, id: string) {
  const inUse = await prisma.lead.count({
    where: { salesStatusId: id, ...activeLeadWhere },
  });
  if (inUse > 0) {
    throw conflict(`Não é possível remover: ${inUse} lead(s) referenciam este registro`);
  }

  await prisma.leadStatus.delete({ where: { id } });
}

export async function findStatusByName(name: string) {
  return findByName("status", name);
}

export async function findBySlug(kind: LookupKind, slug: string) {
  return prisma.leadStatus.findUnique({ where: { slug } });
}

async function findByName(kind: LookupKind, raw: string) {
  const norm = normalizeText(raw);
  const all = await listLookups(kind);
  return all.find((item) => normalizeText(item.name) === norm) ?? null;
}

export async function createLookupByName(kind: LookupKind, name: string) {
  return createLookup(kind, { name: name.trim() });
}
