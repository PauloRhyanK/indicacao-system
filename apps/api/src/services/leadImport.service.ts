import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { normalizePhone, parseDate, parseDecimal } from "../utils/format.js";

export interface ImportReport {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

/** Remove acentos e normaliza para comparação de cabeçalhos. */
function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  externalCode: ["id"],
  createdAt: ["data do registro", "data de registro"],
  name: ["nome do cliente", "nome", "cliente"],
  phone: ["telefone", "celular"],
  source: ["origem do lead", "origem"],
  assignedTo: ["responsavel pela reuniao", "responsavel"],
  salesStatus: ["status atual da oportunidade", "status"],
  nextAction: ["proxima acao", "proxima ação"],
  nextFollowUpAt: ["data do proximo follow-up", "proximo follow-up", "follow-up"],
  notes: ["observacoes", "observacao", "obs"],
  offeredAmount: ["valor da carta ofertada", "valor ofertado", "carta ofertada"],
  closedAmount: ["valor fechado", "valor da venda"],
  updatedAt: ["ultima atualizacao", "atualizado em"],
};

/** Constrói um índice header-normalizado -> chave de campo do nosso modelo. */
function buildHeaderIndex(headers: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const header of headers) {
    const norm = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(norm)) {
        index.set(header, field);
        break;
      }
    }
  }
  return index;
}

/** Resolve (ou cria placeholder) o consultor responsável a partir do nome. */
async function resolveAssignedUser(
  name: string | undefined,
  cache: Map<string, string>,
  tx: Prisma.TransactionClient
): Promise<string | undefined> {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (key === "") return undefined;
  if (cache.has(key)) return cache.get(key);

  const existing = await tx.user.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  // Cria consultor placeholder (sem senha utilizável) para manter o vínculo.
  const slug = key.replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const placeholderEmail = `${slug || "consultor"}.${Date.now()}@import.local`;
  const created = await tx.user.create({
    data: {
      name: name.trim(),
      email: placeholderEmail,
      passwordHash: "!import-placeholder",
      role: "CONSULTANT",
    },
    select: { id: true },
  });
  cache.set(key, created.id);
  return created.id;
}

export async function importLeadsFromBuffer(buffer: Buffer): Promise<ImportReport> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { imported: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: "Planilha vazia" }] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const report: ImportReport = { imported: 0, updated: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return report;

  const headerIndex = buildHeaderIndex(Object.keys(rows[0]));
  const userCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 cabeçalho, +1 base-1
    const raw = rows[i];

    const fields: Record<string, unknown> = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = headerIndex.get(header);
      if (field) fields[field] = value;
    }

    const name = fields.name ? String(fields.name).trim() : "";
    if (!name) {
      report.skipped++;
      report.errors.push({ row: rowNumber, message: "Nome do cliente ausente" });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const assignedToUserId = await resolveAssignedUser(
          fields.assignedTo ? String(fields.assignedTo) : undefined,
          userCache,
          tx
        );

        const externalCode = fields.externalCode ? String(fields.externalCode).trim() : undefined;
        const closed = parseDecimal(fields.closedAmount as string | number | null);

        const data = {
          name,
          phone: normalizePhone(fields.phone as string | null),
          source: fields.source ? String(fields.source) : undefined,
          assignedToUserId,
          salesStatus: fields.salesStatus ? String(fields.salesStatus) : undefined,
          nextAction: fields.nextAction ? String(fields.nextAction) : undefined,
          nextFollowUpAt: parseDate(fields.nextFollowUpAt as string | number | null),
          notes: fields.notes ? String(fields.notes) : undefined,
          offeredAmount: parseDecimal(fields.offeredAmount as string | number | null),
          closedAmount: closed,
        };

        let leadId: string;
        let wasUpdate = false;

        if (externalCode) {
          const existing = await tx.lead.findUnique({
            where: { externalCode },
            select: { id: true },
          });
          if (existing) {
            await tx.lead.update({ where: { externalCode }, data });
            leadId = existing.id;
            wasUpdate = true;
          } else {
            const created = await tx.lead.create({ data: { externalCode, ...data } });
            leadId = created.id;
          }
        } else {
          const created = await tx.lead.create({ data });
          leadId = created.id;
        }

        // Linhas com valor fechado geram compra e incrementam a meta vigente.
        if (closed && closed.greaterThan(0)) {
          const purchaseDate = parseDate(fields.updatedAt as string | number | null) ?? new Date();
          await tx.purchase.create({
            data: { leadId, amount: closed, purchaseDate },
          });

          const now = new Date();
          const goal = await tx.goal.findFirst({
            where: { startDate: { lte: now }, endDate: { gte: now } },
            orderBy: { startDate: "desc" },
          });
          if (goal) {
            await tx.goal.update({
              where: { id: goal.id },
              data: { currentAmount: { increment: closed } },
            });
          }
        }

        if (wasUpdate) report.updated++;
        else report.imported++;
      });
    } catch (err) {
      report.skipped++;
      const message = err instanceof Error ? err.message : "Erro ao processar linha";
      report.errors.push({ row: rowNumber, message });
    }
  }

  return report;
}
