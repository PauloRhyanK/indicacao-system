import type { Prisma, RjCredor } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  RJ_CLASSE_LABELS,
  RJ_FIELD_LABELS,
  RJ_MOTIVO_LABELS,
  RJ_STATUS_LABELS,
  type RjClasse,
  type RjMotivo,
  type RjStatus,
} from "../constants/rj.js";
import { PERMISSIONS_CATALOG } from "../constants/permissions.js";

export type RjAuditEntityType = "credor" | "config" | "usuario" | "papel";
export type RjAuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reset_password"
  | "role_change";

export interface RjAuditChange {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface RecordRjAuditInput {
  actorUserId?: string | null;
  entityType: RjAuditEntityType;
  entityId: string;
  entityLabel: string;
  action: RjAuditAction;
  summary: string;
  changes?: RjAuditChange[] | null;
}

export interface ListRjAuditLogsInput {
  page?: number;
  limit?: number;
  entityType?: RjAuditEntityType;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  q?: string;
}

const PERMISSION_LABELS = Object.fromEntries(
  PERMISSIONS_CATALOG.map((p) => [p.key, p.label]),
);

function formatCredorValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;

  switch (field) {
    case "sujeito":
      return value ? "Sim" : "Não";
    case "valor": {
      const n = typeof value === "object" && value !== null && "toNumber" in value
        ? (value as { toNumber: () => number }).toNumber()
        : Number(value);
      return Number.isFinite(n)
        ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : String(value);
    }
    case "status":
      return RJ_STATUS_LABELS[value as RjStatus] ?? String(value);
    case "classe":
      return value ? (RJ_CLASSE_LABELS[value as RjClasse] ?? String(value)) : null;
    case "motivo":
      return value ? (RJ_MOTIVO_LABELS[value as RjMotivo] ?? String(value)) : null;
    case "retorno": {
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      return String(value).slice(0, 10);
    }
    default:
      return String(value);
  }
}

function formatPermissionList(keys: string[]): string {
  return keys.map((k) => PERMISSION_LABELS[k] ?? k).join(", ");
}

async function resolveActor(actorUserId?: string | null) {
  if (!actorUserId) {
    return { actorId: null, actorName: "Sistema", actorEmail: "sistema@interno" };
  }

  const user = await prisma.user.findFirst({
    where: { id: actorUserId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return { actorId: actorUserId, actorName: "Usuário removido", actorEmail: "—" };
  }

  return { actorId: user.id, actorName: user.name, actorEmail: user.email };
}

export async function recordRjAudit(input: RecordRjAuditInput) {
  const actor = await resolveActor(input.actorUserId);

  const row = await prisma.rjAuditLog.create({
    data: {
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorEmail: actor.actorEmail,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      action: input.action,
      summary: input.summary,
      changes: input.changes?.length
        ? (input.changes as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return serializeAuditLog(row);
}

export function diffCredorFields(
  before: RjCredor,
  after: RjCredor,
): { changes: RjAuditChange[]; summary: string } {
  const fields = [
    "nome",
    "sujeito",
    "classe",
    "motivo",
    "valor",
    "status",
    "contato",
    "passo",
    "retorno",
    "obs",
  ] as const;

  const changes: RjAuditChange[] = [];

  for (const field of fields) {
    const oldRaw = before[field];
    const newRaw = after[field];

    const oldStr = formatCredorValue(field, oldRaw);
    const newStr = formatCredorValue(field, newRaw);

    if (oldStr === newStr) continue;

    changes.push({
      field,
      label: RJ_FIELD_LABELS[field] ?? field,
      oldValue: oldStr,
      newValue: newStr,
    });
  }

  if (changes.length === 0) {
    return { changes: [], summary: "Alteração sem diferenças registradas" };
  }

  if (changes.length === 1) {
    const c = changes[0];
    return {
      changes,
      summary: `${c.label}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`,
    };
  }

  const labels = changes.map((c) => c.label.toLowerCase()).join(", ");
  return { changes, summary: `Alterou ${labels}` };
}

export function buildStatusChangeSummary(oldStatus: string, newStatus: string): string {
  const oldLabel = RJ_STATUS_LABELS[oldStatus as RjStatus] ?? oldStatus;
  const newLabel = RJ_STATUS_LABELS[newStatus as RjStatus] ?? newStatus;
  return `Status: ${oldLabel} → ${newLabel}`;
}

export function buildRoleNamesSummary(before: string[], after: string[]): string {
  const beforeLabel = before.length ? before.join(", ") : "—";
  const afterLabel = after.length ? after.join(", ") : "—";
  return `Papéis: ${beforeLabel} → ${afterLabel}`;
}

export function buildPermissionChangeSummary(before: string[], after: string[]): string {
  return `Permissões: ${formatPermissionList(before)} → ${formatPermissionList(after)}`;
}

function serializeAuditLog(row: {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  action: string;
  summary: string;
  changes: unknown;
}) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actorId: row.actorId,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    entityType: row.entityType as RjAuditEntityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    action: row.action as RjAuditAction,
    summary: row.summary,
    changes: (row.changes as RjAuditChange[] | null) ?? null,
  };
}

export async function listRjAuditLogs(input: ListRjAuditLogsInput = {}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Prisma.RjAuditLogWhereInput = {};

  if (input.entityType) where.entityType = input.entityType;
  if (input.entityId) where.entityId = input.entityId;
  if (input.actorId) where.actorId = input.actorId;

  if (input.from || input.to) {
    where.createdAt = {};
    if (input.from) where.createdAt.gte = new Date(input.from);
    if (input.to) {
      const to = new Date(input.to);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  if (input.q?.trim()) {
    const q = input.q.trim();
    where.OR = [
      { entityLabel: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.rjAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.rjAuditLog.count({ where }),
  ]);

  return {
    items: rows.map(serializeAuditLog),
    total,
    page,
    limit,
  };
}

export async function listCredorAuditLogs(credorId: string, input: Omit<ListRjAuditLogsInput, "entityType" | "entityId"> = {}) {
  return listRjAuditLogs({ ...input, entityType: "credor", entityId: credorId });
}
