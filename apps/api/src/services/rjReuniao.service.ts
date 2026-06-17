import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  RJ_REUNIAO_FIELD_LABELS,
  RJ_REUNIAO_STATUS_LABELS,
  type RjReuniaoStatus,
} from "../constants/rj.js";
import { notFound } from "../utils/httpError.js";
import { recordRjAudit, type RjAuditChange } from "./rjAudit.service.js";
import { updateCredorStatus } from "./rjCredor.service.js";
import type {
  CreateReuniaoInput,
  ListReunioesQuery,
  UpdateReuniaoInput,
  UpdateReuniaoStatusInput,
} from "../schemas/rjReuniao.schema.js";
import {
  scheduleGoogleSyncOnCancel,
  scheduleGoogleSyncOnCreate,
  scheduleGoogleSyncOnDelete,
  scheduleGoogleSyncOnUpdate,
} from "./rjGoogleSync.service.js";

const activeReuniaoWhere = { deletedAt: null } as const;

const reuniaoInclude = {
  credor: { select: { id: true, nome: true, status: true } },
  participantes: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.RjReuniaoInclude;

type ReuniaoRow = Prisma.RjReuniaoGetPayload<{ include: typeof reuniaoInclude }>;

export type SugestaoEvento = "reuniao_criada" | "reuniao_realizada";

export interface SugestaoStatusCredor {
  credorId: string;
  status: string;
  label: string;
}

function serializeReuniao(row: ReuniaoRow) {
  return {
    id: row.id,
    credorId: row.credorId,
    titulo: row.titulo,
    dataHoraInicio: row.dataHoraInicio.toISOString(),
    dataHoraFim: row.dataHoraFim?.toISOString() ?? null,
    local: row.local,
    linkOnline: row.linkOnline,
    status: row.status as RjReuniaoStatus,
    pauta: row.pauta,
    resultado: row.resultado,
    criadoPorId: row.criadoPorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    credor: {
      id: row.credor.id,
      nome: row.credor.nome,
      status: row.credor.status,
    },
    participantes: row.participantes.map((p) => ({
      userId: p.userId,
      nome: p.user.name,
      email: p.user.email,
      confirmado: p.confirmado,
    })),
  };
}

/** Usuários elegíveis para a agenda: confidencial aprovado com acesso à agenda. */
const agendaUserWhere: Prisma.UserWhereInput = {
  accessScope: "CONFIDENCIAL",
  deletedAt: null,
  confidencialApprovedAt: { not: null },
  userRoles: {
    some: {
      role: {
        rolePermissions: {
          some: { permissionKey: { in: ["rj.agenda.view", "rj.view"] } },
        },
      },
    },
  },
};

export async function listParticipantesOpcoes() {
  const users = await prisma.user.findMany({
    where: agendaUserWhere,
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, nome: u.name, email: u.email }));
}

async function resolveDefaultParticipantesIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: agendaUserWhere,
    select: { id: true },
  });
  return users.map((u) => u.id);
}

function monthRange(now = new Date()) {
  const de = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const ate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { de, ate };
}

export async function listReunioes(
  query: ListReunioesQuery,
  actorUserId: string,
  canViewAll: boolean,
) {
  const fallback = monthRange();
  const de = query.de ? new Date(query.de) : fallback.de;
  const ate = query.ate ? new Date(`${query.ate}T23:59:59.999Z`) : fallback.ate;

  const where: Prisma.RjReuniaoWhereInput = {
    ...activeReuniaoWhere,
    dataHoraInicio: { gte: de, lte: ate },
  };

  if (query.credorId) where.credorId = query.credorId;
  if (query.status) where.status = query.status;

  if (query.userId === "all") {
    if (!canViewAll) {
      where.participantes = { some: { userId: actorUserId } };
    }
  } else if (query.userId) {
    where.participantes = { some: { userId: query.userId } };
  } else {
    where.participantes = { some: { userId: actorUserId } };
  }

  const rows = await prisma.rjReuniao.findMany({
    where,
    include: reuniaoInclude,
    orderBy: { dataHoraInicio: "asc" },
  });

  return rows.map(serializeReuniao);
}

export async function getReunioesByCredor(credorId: string) {
  const rows = await prisma.rjReuniao.findMany({
    where: { credorId, ...activeReuniaoWhere },
    include: reuniaoInclude,
    orderBy: { dataHoraInicio: "desc" },
  });
  return rows.map(serializeReuniao);
}

async function findActiveReuniao(id: string) {
  return prisma.rjReuniao.findFirst({
    where: { id, ...activeReuniaoWhere },
    include: reuniaoInclude,
  });
}

export async function getReuniaoById(id: string) {
  const row = await findActiveReuniao(id);
  if (!row) throw notFound("Reunião não encontrada");
  return serializeReuniao(row);
}

export async function getReuniaoRow(id: string) {
  const row = await findActiveReuniao(id);
  if (!row) throw notFound("Reunião não encontrada");
  return row;
}

function defaultTitulo(nomeCredor: string) {
  return `Reunião — ${nomeCredor}`;
}

function normalizeLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sugerirStatusCredor(
  credor: { id: string; nome: string; status: string },
  evento: SugestaoEvento,
): SugestaoStatusCredor | null {
  if (evento === "reuniao_criada") {
    return null;
  }

  if (evento === "reuniao_realizada") {
    if (
      credor.status === "agendado" ||
      credor.status === "negociacao" ||
      credor.status === "juridico"
    ) {
      return {
        credorId: credor.id,
        status: "confirmado",
        label: `${credor.nome} teve reunião realizada. Confirmar este credor no condomínio?`,
      };
    }
  }

  return null;
}

async function resolveParticipantesIds(
  participantesIds: string[] | undefined,
  criadoPorId: string,
): Promise<string[]> {
  const base =
    participantesIds && participantesIds.length > 0
      ? participantesIds
      : await resolveDefaultParticipantesIds();
  return Array.from(new Set([criadoPorId, ...base]));
}

export async function createReuniao(input: CreateReuniaoInput, actorUserId: string) {
  const credor = await prisma.rjCredor.findFirst({
    where: { id: input.credorId, deletedAt: null },
    select: { id: true, nome: true, status: true },
  });
  if (!credor) throw notFound("Credor não encontrado");

  const inicio = new Date(input.dataHoraInicio);
  const fim = input.dataHoraFim
    ? new Date(input.dataHoraFim)
    : new Date(inicio.getTime() + 60 * 60 * 1000);

  const participantesIds = await resolveParticipantesIds(input.participantesIds, actorUserId);

  const created = await prisma.rjReuniao.create({
    data: {
      credorId: credor.id,
      titulo: input.titulo?.trim() || defaultTitulo(credor.nome),
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      local: normalizeLink(input.local),
      linkOnline: normalizeLink(input.linkOnline),
      pauta: input.pauta?.trim() || null,
      status: "agendada",
      criadoPorId: actorUserId,
      participantes: {
        create: participantesIds.map((userId) => ({ userId })),
      },
    },
    include: reuniaoInclude,
  });

  await recordRjAudit({
    actorUserId,
    entityType: "reuniao",
    entityId: created.id,
    entityLabel: created.titulo,
    action: "create",
    summary: `Reunião agendada: ${created.titulo}`,
    changes: [
      {
        field: "dataHoraInicio",
        label: RJ_REUNIAO_FIELD_LABELS.dataHoraInicio,
        oldValue: null,
        newValue: created.dataHoraInicio.toISOString(),
      },
    ],
  });

  if (credor.status !== "confirmado" && credor.status !== "agendado") {
    await updateCredorStatus(credor.id, { status: "agendado" }, actorUserId);
  }

  const refreshed = await findActiveReuniao(created.id);

  scheduleGoogleSyncOnCreate(created.id);

  return {
    reuniao: serializeReuniao(refreshed ?? created),
    sugestaoStatusCredor: null,
  };
}

export async function updateReuniao(
  id: string,
  input: UpdateReuniaoInput,
  actorUserId: string,
) {
  const existing = await findActiveReuniao(id);
  if (!existing) throw notFound("Reunião não encontrada");

  const previousParticipantIds = existing.participantes.map((p) => p.userId);

  if (input.credorId && input.credorId !== existing.credorId) {
    const credor = await prisma.rjCredor.findFirst({
      where: { id: input.credorId, deletedAt: null },
      select: { id: true },
    });
    if (!credor) throw notFound("Credor não encontrado");
  }

  const data: Prisma.RjReuniaoUpdateInput = {};
  if (input.credorId !== undefined) data.credor = { connect: { id: input.credorId } };
  if (input.titulo !== undefined) data.titulo = input.titulo.trim();
  if (input.dataHoraInicio !== undefined) data.dataHoraInicio = new Date(input.dataHoraInicio);
  if (input.dataHoraFim !== undefined) {
    data.dataHoraFim = input.dataHoraFim ? new Date(input.dataHoraFim) : null;
  }
  if (input.local !== undefined) data.local = normalizeLink(input.local);
  if (input.linkOnline !== undefined) data.linkOnline = normalizeLink(input.linkOnline);
  if (input.pauta !== undefined) data.pauta = input.pauta?.trim() || null;
  if (input.resultado !== undefined) data.resultado = input.resultado?.trim() || null;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.rjReuniao.update({
      where: { id },
      data,
      include: reuniaoInclude,
    });

    if (input.participantesIds !== undefined) {
      const ids = Array.from(new Set([row.criadoPorId, ...input.participantesIds]));
      await tx.rjReuniaoParticipante.deleteMany({ where: { reuniaoId: id } });
      await tx.rjReuniaoParticipante.createMany({
        data: ids.map((userId) => ({ reuniaoId: id, userId })),
        skipDuplicates: true,
      });
      return tx.rjReuniao.findUniqueOrThrow({ where: { id }, include: reuniaoInclude });
    }

    return row;
  });

  const changes = diffReuniao(existing, updated);
  if (changes.length > 0) {
    await recordRjAudit({
      actorUserId,
      entityType: "reuniao",
      entityId: updated.id,
      entityLabel: updated.titulo,
      action: "update",
      summary: buildReuniaoSummary(changes),
      changes,
    });
  }

  scheduleGoogleSyncOnUpdate(updated.id, previousParticipantIds);

  return serializeReuniao(updated);
}

export async function updateReuniaoStatus(
  id: string,
  input: UpdateReuniaoStatusInput,
  actorUserId: string,
) {
  const existing = await findActiveReuniao(id);
  if (!existing) throw notFound("Reunião não encontrada");

  const updated = await prisma.rjReuniao.update({
    where: { id },
    data: {
      status: input.status,
      ...(input.resultado !== undefined ? { resultado: input.resultado?.trim() || null } : {}),
    },
    include: reuniaoInclude,
  });

  if (existing.status !== updated.status) {
    await recordRjAudit({
      actorUserId,
      entityType: "reuniao",
      entityId: updated.id,
      entityLabel: updated.titulo,
      action: "update",
      summary: `Status da reunião: ${RJ_REUNIAO_STATUS_LABELS[existing.status as RjReuniaoStatus] ?? existing.status} → ${RJ_REUNIAO_STATUS_LABELS[updated.status as RjReuniaoStatus] ?? updated.status}`,
      changes: [
        {
          field: "status",
          label: RJ_REUNIAO_FIELD_LABELS.status,
          oldValue: RJ_REUNIAO_STATUS_LABELS[existing.status as RjReuniaoStatus] ?? existing.status,
          newValue: RJ_REUNIAO_STATUS_LABELS[updated.status as RjReuniaoStatus] ?? updated.status,
        },
      ],
    });
  }

  const sugestao =
    updated.status === "realizada"
      ? sugerirStatusCredor(updated.credor, "reuniao_realizada")
      : null;

  if (updated.status === "cancelada" && existing.status !== "cancelada") {
    scheduleGoogleSyncOnCancel(updated.id);
  }

  return {
    reuniao: serializeReuniao(updated),
    sugestaoStatusCredor: sugestao,
  };
}

export async function softDeleteReuniao(id: string, actorUserId: string) {
  const existing = await findActiveReuniao(id);
  if (!existing) throw notFound("Reunião não encontrada");

  await prisma.rjReuniao.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await recordRjAudit({
    actorUserId,
    entityType: "reuniao",
    entityId: existing.id,
    entityLabel: existing.titulo,
    action: "delete",
    summary: `Reunião excluída: ${existing.titulo}`,
  });

  scheduleGoogleSyncOnDelete(
    existing.id,
    existing.participantes.map((p) => p.userId),
  );
}

function diffReuniao(before: ReuniaoRow, after: ReuniaoRow): RjAuditChange[] {
  const changes: RjAuditChange[] = [];

  const fields: { field: string; before: string | null; after: string | null }[] = [
    { field: "titulo", before: before.titulo, after: after.titulo },
    {
      field: "dataHoraInicio",
      before: before.dataHoraInicio.toISOString(),
      after: after.dataHoraInicio.toISOString(),
    },
    {
      field: "dataHoraFim",
      before: before.dataHoraFim?.toISOString() ?? null,
      after: after.dataHoraFim?.toISOString() ?? null,
    },
    { field: "local", before: before.local, after: after.local },
    { field: "linkOnline", before: before.linkOnline, after: after.linkOnline },
    { field: "pauta", before: before.pauta, after: after.pauta },
    { field: "resultado", before: before.resultado, after: after.resultado },
    {
      field: "status",
      before: RJ_REUNIAO_STATUS_LABELS[before.status as RjReuniaoStatus] ?? before.status,
      after: RJ_REUNIAO_STATUS_LABELS[after.status as RjReuniaoStatus] ?? after.status,
    },
  ];

  for (const f of fields) {
    if ((f.before ?? null) === (f.after ?? null)) continue;
    changes.push({
      field: f.field,
      label: RJ_REUNIAO_FIELD_LABELS[f.field] ?? f.field,
      oldValue: f.before,
      newValue: f.after,
    });
  }

  const beforeIds = before.participantes.map((p) => p.userId).sort().join(",");
  const afterIds = after.participantes.map((p) => p.userId).sort().join(",");
  if (beforeIds !== afterIds) {
    changes.push({
      field: "participantes",
      label: RJ_REUNIAO_FIELD_LABELS.participantes,
      oldValue: `${before.participantes.length} participante(s)`,
      newValue: `${after.participantes.length} participante(s)`,
    });
  }

  return changes;
}

function buildReuniaoSummary(changes: RjAuditChange[]): string {
  if (changes.length === 1) {
    const c = changes[0];
    return `${c.label}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`;
  }
  return `Alterou ${changes.map((c) => c.label.toLowerCase()).join(", ")}`;
}
