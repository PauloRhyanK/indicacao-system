import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { RJ_STATUS_LABELS, RJ_MOTIVO_LABELS, type RjStatus } from "../constants/rj.js";
import { notFound } from "../utils/httpError.js";
import {
  buildStatusChangeSummary,
  diffCredorFields,
  recordRjAudit,
} from "./rjAudit.service.js";
import {
  buildCredoresCsv,
  computeClasses,
  computeKpis,
  computeRepresentatividade,
  normalizeCredorFields,
  parseRetorno,
  serializeCredor,
  sortCredores,
} from "../utils/rjCalculations.js";
import { getConfig } from "./rjConfig.service.js";
import type {
  CreateCredorInput,
  UpdateCredorInput,
  UpdateCredorStatusInput,
} from "../schemas/rj.schema.js";

const activeCredorWhere = { deletedAt: null } as const;

async function findActiveCredor(id: string) {
  return prisma.rjCredor.findFirst({
    where: { id, ...activeCredorWhere },
  });
}

async function listActiveCredores() {
  return prisma.rjCredor.findMany({ where: activeCredorWhere });
}

export async function listCredores() {
  const [credoresRaw, config] = await Promise.all([listActiveCredores(), getConfig()]);
  const credores = sortCredores(credoresRaw);
  const kpis = computeKpis(credores);
  const classes = computeClasses(credores);
  const representatividade = computeRepresentatividade(kpis, config.passivo);

  return {
    credores: credores.map(serializeCredor),
    kpis,
    classes,
    config,
    representatividade,
  };
}

export async function createCredor(input: CreateCredorInput, actorUserId?: string) {
  const { classe, motivo } = normalizeCredorFields(input);

  const created = await prisma.rjCredor.create({
    data: {
      nome: input.nome,
      sujeito: input.sujeito,
      classe,
      motivo,
      valor: new Prisma.Decimal(input.valor ?? 0),
      status: input.status,
      contato: input.contato ?? "",
      passo: input.passo ?? "",
      retorno: parseRetorno(input.retorno),
      obs: input.obs ?? "",
    },
  });

  await recordRjAudit({
    actorUserId,
    entityType: "credor",
    entityId: created.id,
    entityLabel: created.nome,
    action: "create",
    summary: `Credor cadastrado: ${created.nome}`,
    changes: [
      {
        field: "status",
        label: "Status",
        oldValue: null,
        newValue: RJ_STATUS_LABELS[created.status as RjStatus] ?? created.status,
      },
    ],
  });

  return serializeCredor(created);
}

export async function updateCredor(id: string, input: UpdateCredorInput, actorUserId?: string) {
  const existing = await findActiveCredor(id);
  if (!existing) throw notFound("Credor não encontrado");

  const sujeito = input.sujeito ?? existing.sujeito;
  const { classe, motivo } = normalizeCredorFields({
    sujeito,
    classe: input.classe !== undefined ? input.classe : existing.classe,
    motivo: input.motivo !== undefined ? input.motivo : existing.motivo,
  });

  const updated = await prisma.rjCredor.update({
    where: { id },
    data: {
      ...(input.nome !== undefined ? { nome: input.nome } : {}),
      ...(input.sujeito !== undefined ? { sujeito: input.sujeito } : {}),
      classe,
      motivo,
      ...(input.valor !== undefined ? { valor: new Prisma.Decimal(input.valor) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.contato !== undefined ? { contato: input.contato } : {}),
      ...(input.passo !== undefined ? { passo: input.passo } : {}),
      ...(input.retorno !== undefined ? { retorno: parseRetorno(input.retorno) } : {}),
      ...(input.obs !== undefined ? { obs: input.obs } : {}),
    },
  });

  const { changes, summary } = diffCredorFields(existing, updated);
  if (changes.length > 0) {
    await recordRjAudit({
      actorUserId,
      entityType: "credor",
      entityId: updated.id,
      entityLabel: updated.nome,
      action: "update",
      summary,
      changes,
    });
  }

  return serializeCredor(updated);
}

export async function updateCredorStatus(
  id: string,
  input: UpdateCredorStatusInput,
  actorUserId?: string,
) {
  const existing = await findActiveCredor(id);
  if (!existing) throw notFound("Credor não encontrado");

  if (existing.status === input.status) {
    return serializeCredor(existing);
  }

  const updated = await prisma.rjCredor.update({
    where: { id },
    data: { status: input.status },
  });

  const summary = buildStatusChangeSummary(existing.status, updated.status);
  await recordRjAudit({
    actorUserId,
    entityType: "credor",
    entityId: updated.id,
    entityLabel: updated.nome,
    action: "update",
    summary,
    changes: [
      {
        field: "status",
        label: "Status",
        oldValue: RJ_STATUS_LABELS[existing.status as RjStatus] ?? existing.status,
        newValue: RJ_STATUS_LABELS[updated.status as RjStatus] ?? updated.status,
      },
    ],
  });

  return serializeCredor(updated);
}

export async function softDeleteCredor(id: string, actorUserId?: string) {
  const existing = await findActiveCredor(id);
  if (!existing) throw notFound("Credor não encontrado");

  await prisma.rjCredor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await recordRjAudit({
    actorUserId,
    entityType: "credor",
    entityId: existing.id,
    entityLabel: existing.nome,
    action: "delete",
    summary: `Credor excluído: ${existing.nome}`,
  });
}

export async function exportCredoresCsv() {
  const credores = sortCredores(await listActiveCredores());
  return buildCredoresCsv(credores);
}

export async function exportCredoresXlsx(): Promise<Buffer> {
  const credores = sortCredores(await listActiveCredores());
  const kpis = computeKpis(credores);

  const headers = [
    "Credor",
    "Situação",
    "Classe / Motivo",
    "Valor",
    "Status",
    "Contato",
    "Próximo Passo",
    "Retorno",
    "Observações",
  ];

  const dataRows = credores.map((c) => {
    const sitLabel = c.sujeito ? "Sujeito a RJ (vota)" : "Fora da RJ (não vota)";
    const cmLabel = c.sujeito
      ? `Classe ${c.classe ?? ""}`
      : (c.motivo ? RJ_MOTIVO_LABELS[c.motivo as keyof typeof RJ_MOTIVO_LABELS] : "") ?? "";
    const valNum = c.valor ? Number(c.valor) : 0;
    const statusLabel = RJ_STATUS_LABELS[c.status as RjStatus] ?? c.status;
    const retornoStr = c.retorno ? c.retorno.toISOString().slice(0, 10) : "";

    return [
      c.nome,
      sitLabel,
      cmLabel,
      valNum,
      statusLabel,
      c.contato,
      c.passo,
      retornoStr,
      c.obs,
    ];
  });

  // Create worksheet data
  const aoa = [
    headers,
    ...dataRows,
    [], // empty spacer row
    ["", "VALOR COM VOTO (sujeitos)", "", kpis.votoTotal],
    ["", "VALOR CONFIRMADO QUE VOTA", "", "", "", kpis.votoConf],
    ["", "VALOR FORA DA RJ", "", "", "", kpis.foraTotal],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-fit column widths
  ws["!cols"] = [
    { wch: 30 }, // Credor
    { wch: 22 }, // Situação
    { wch: 18 }, // Classe / Motivo
    { wch: 16 }, // Valor
    { wch: 18 }, // Status
    { wch: 25 }, // Contato
    { wch: 30 }, // Próximo Passo
    { wch: 12 }, // Retorno
    { wch: 30 }, // Observações
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Credores MG2");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
