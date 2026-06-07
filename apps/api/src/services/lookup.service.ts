import { prisma } from "../config/prisma.js";
import { conflict, notFound } from "../utils/httpError.js";
import { normalizeText, slugify } from "../utils/slugify.js";
import type { CreateLookupInput, UpdateLookupInput } from "../schemas/settings.schema.js";

export type LookupKind = "status" | "source" | "action";

const leadFkMap = {
  status: "salesStatusId",
  source: "sourceId",
  action: "nextActionId",
} as const;

export async function getAllLookups() {
  const [statuses, sources, nextActions, consortiumTypes] = await Promise.all([
    prisma.leadStatus.findMany({ orderBy: { name: "asc" } }),
    prisma.leadSource.findMany({ orderBy: { name: "asc" } }),
    prisma.nextAction.findMany({ orderBy: { name: "asc" } }),
    prisma.consortiumType.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { statuses, sources, nextActions, consortiumTypes };
}

export async function listLookups(kind: LookupKind) {
  switch (kind) {
    case "status":
      return prisma.leadStatus.findMany({ orderBy: { name: "asc" } });
    case "source":
      return prisma.leadSource.findMany({ orderBy: { name: "asc" } });
    case "action":
      return prisma.nextAction.findMany({ orderBy: { name: "asc" } });
  }
}

export async function createLookup(kind: LookupKind, input: CreateLookupInput) {
  const slug = input.slug?.trim() || slugify(input.name);
  const name = input.name.trim();

  switch (kind) {
    case "status": {
      const existing = await prisma.leadStatus.findFirst({
        where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
      });
      if (existing) throw conflict("Já existe um registro com esse nome ou slug");
      return prisma.leadStatus.create({ data: { slug, name } });
    }
    case "source": {
      const existing = await prisma.leadSource.findFirst({
        where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
      });
      if (existing) throw conflict("Já existe um registro com esse nome ou slug");
      return prisma.leadSource.create({ data: { slug, name } });
    }
    case "action": {
      const existing = await prisma.nextAction.findFirst({
        where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
      });
      if (existing) throw conflict("Já existe um registro com esse nome ou slug");
      return prisma.nextAction.create({ data: { slug, name } });
    }
  }
}

export async function updateLookup(kind: LookupKind, id: string, input: UpdateLookupInput) {
  const name = input.name?.trim();

  switch (kind) {
    case "status": {
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
    case "source": {
      const existing = await prisma.leadSource.findUnique({ where: { id } });
      if (!existing) throw notFound("Registro não encontrado");
      if (name) {
        const dup = await prisma.leadSource.findFirst({
          where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
        });
        if (dup) throw conflict("Já existe um registro com esse nome");
      }
      return prisma.leadSource.update({
        where: { id },
        data: { ...(name ? { name } : {}) },
      });
    }
    case "action": {
      const existing = await prisma.nextAction.findUnique({ where: { id } });
      if (!existing) throw notFound("Registro não encontrado");
      if (name) {
        const dup = await prisma.nextAction.findFirst({
          where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
        });
        if (dup) throw conflict("Já existe um registro com esse nome");
      }
      return prisma.nextAction.update({
        where: { id },
        data: { ...(name ? { name } : {}) },
      });
    }
  }
}

export async function deleteLookup(kind: LookupKind, id: string) {
  const fkField = leadFkMap[kind];
  const inUse = await prisma.lead.count({ where: { [fkField]: id } });
  if (inUse > 0) {
    throw conflict(`Não é possível remover: ${inUse} lead(s) referenciam este registro`);
  }

  switch (kind) {
    case "status":
      await prisma.leadStatus.delete({ where: { id } });
      break;
    case "source":
      await prisma.leadSource.delete({ where: { id } });
      break;
    case "action":
      await prisma.nextAction.delete({ where: { id } });
      break;
  }
}

export async function findStatusByName(name: string) {
  return findByName("status", name);
}

export async function findSourceByName(name: string) {
  return findByName("source", name);
}

export async function findActionByName(name: string) {
  return findByName("action", name);
}

export async function findBySlug(kind: LookupKind, slug: string) {
  switch (kind) {
    case "status":
      return prisma.leadStatus.findUnique({ where: { slug } });
    case "source":
      return prisma.leadSource.findUnique({ where: { slug } });
    case "action":
      return prisma.nextAction.findUnique({ where: { slug } });
  }
}

async function findByName(kind: LookupKind, raw: string) {
  const norm = normalizeText(raw);
  const all = await listLookups(kind);
  return all.find((item) => normalizeText(item.name) === norm) ?? null;
}

export async function createLookupByName(kind: LookupKind, name: string) {
  return createLookup(kind, { name: name.trim() });
}
