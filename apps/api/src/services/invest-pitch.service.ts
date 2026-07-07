import { Prisma, type InvestPitch } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";
import {
  investPitchConteudoSchema,
  type CreateInvestPitchInput,
  type ListInvestPitchesQuery,
  type UpdateInvestPitchInput,
} from "../schemas/invest-pitch.schema.js";

const activeWhere = { deletedAt: null } as const;

const includeCreatedBy = {
  createdBy: { select: { id: true, name: true } },
} as const;

type InvestPitchWithUser = InvestPitch & {
  createdBy: { id: string; name: string } | null;
};

/** Garante o shape do conteúdo (preenche defaults) mesmo para registros antigos. */
function parseConteudo(raw: Prisma.JsonValue) {
  return investPitchConteudoSchema.parse(raw ?? {});
}

function serializeInvestPitch(pitch: InvestPitchWithUser) {
  return {
    id: pitch.id,
    faixa: pitch.faixa,
    titulo: pitch.titulo,
    gancho: pitch.gancho,
    padrao_do_segmento: pitch.padraoDoSegmento,
    ativo: pitch.ativo,
    conteudo: parseConteudo(pitch.conteudo),
    created_by: pitch.createdBy,
    created_at: pitch.createdAt,
    updated_at: pitch.updatedAt,
  };
}

export type SerializedInvestPitch = ReturnType<typeof serializeInvestPitch>;

export async function listInvestPitches(query: ListInvestPitchesQuery = {}) {
  const and: Prisma.InvestPitchWhereInput[] = [{ deletedAt: null }];
  if (query.faixa) and.push({ faixa: query.faixa });
  if (query.ativo !== undefined) and.push({ ativo: query.ativo });
  if (query.q?.trim()) {
    const q = query.q.trim();
    and.push({
      OR: [
        { titulo: { contains: q, mode: "insensitive" } },
        { gancho: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const pitches = await prisma.investPitch.findMany({
    where: { AND: and },
    include: includeCreatedBy,
    // Padrão do segmento primeiro, depois por faixa e título.
    orderBy: [{ padraoDoSegmento: "desc" }, { faixa: "asc" }, { titulo: "asc" }],
  });

  return pitches.map(serializeInvestPitch);
}

async function findActiveInvestPitch(id: string) {
  return prisma.investPitch.findFirst({ where: { id, ...activeWhere } });
}

export async function getInvestPitch(id: string) {
  const pitch = await prisma.investPitch.findFirst({
    where: { id, ...activeWhere },
    include: includeCreatedBy,
  });
  if (!pitch) throw notFound("Pitch não encontrado");
  return serializeInvestPitch(pitch);
}

export async function createInvestPitch(input: CreateInvestPitchInput, actorUserId?: string) {
  const created = await prisma.investPitch.create({
    data: {
      faixa: input.faixa,
      titulo: input.titulo,
      gancho: input.gancho,
      padraoDoSegmento: input.padraoDoSegmento,
      ativo: input.ativo,
      conteudo: input.conteudo as Prisma.InputJsonValue,
      createdById: actorUserId ?? null,
    },
    include: includeCreatedBy,
  });

  return serializeInvestPitch(created);
}

export async function updateInvestPitch(id: string, input: UpdateInvestPitchInput) {
  const existing = await findActiveInvestPitch(id);
  if (!existing) throw notFound("Pitch não encontrado");

  const updated = await prisma.investPitch.update({
    where: { id },
    data: {
      ...(input.faixa !== undefined ? { faixa: input.faixa } : {}),
      ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
      ...(input.gancho !== undefined ? { gancho: input.gancho } : {}),
      ...(input.padraoDoSegmento !== undefined
        ? { padraoDoSegmento: input.padraoDoSegmento }
        : {}),
      ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
      ...(input.conteudo !== undefined
        ? { conteudo: input.conteudo as Prisma.InputJsonValue }
        : {}),
    },
    include: includeCreatedBy,
  });

  return serializeInvestPitch(updated);
}

export async function softDeleteInvestPitch(id: string) {
  const existing = await findActiveInvestPitch(id);
  if (!existing) throw notFound("Pitch não encontrado");
  // Desvincula dos leads (SetNull manual) e marca como excluído.
  await prisma.$transaction([
    prisma.investLead.updateMany({ where: { pitchId: id }, data: { pitchId: null } }),
    prisma.investPitch.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
}
