import { prisma } from "../config/prisma.js";
import { conflict, notFound } from "../utils/httpError.js";
import { slugify } from "../utils/slugify.js";
import type { CreateLookupInput, UpdateLookupInput } from "../schemas/settings.schema.js";

export async function listConsortiumTypes() {
  return prisma.consortiumType.findMany({ orderBy: { name: "asc" } });
}

export async function createConsortiumType(input: CreateLookupInput) {
  const slug = input.slug?.trim() || slugify(input.name);
  const name = input.name.trim();

  const existing = await prisma.consortiumType.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
  });
  if (existing) throw conflict("Já existe um registro com esse nome ou slug");

  return prisma.consortiumType.create({ data: { slug, name } });
}

export async function updateConsortiumType(id: string, input: UpdateLookupInput) {
  const existing = await prisma.consortiumType.findUnique({ where: { id } });
  if (!existing) throw notFound("Registro não encontrado");

  const name = input.name?.trim();
  if (name) {
    const dup = await prisma.consortiumType.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
    });
    if (dup) throw conflict("Já existe um registro com esse nome");
  }

  return prisma.consortiumType.update({
    where: { id },
    data: { ...(name ? { name } : {}) },
  });
}

export async function deleteConsortiumType(id: string) {
  const inUse = await prisma.purchase.count({ where: { consortiumTypeId: id } });
  if (inUse > 0) {
    throw conflict(`Não é possível remover: ${inUse} compra(s) referenciam este tipo`);
  }
  await prisma.consortiumType.delete({ where: { id } });
}

export async function findConsortiumTypeById(id: string) {
  return prisma.consortiumType.findUnique({ where: { id } });
}

export async function findConsortiumTypeBySlug(slug: string) {
  return prisma.consortiumType.findUnique({ where: { slug } });
}
