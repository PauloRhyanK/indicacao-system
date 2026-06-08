import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";
import { normalizePhone, parseDate, parseDecimal } from "../utils/format.js";
import {
  collectUnknownValues,
  hasUnknownValues,
  resolveActionId,
  resolveSourceId,
  resolveStatusId,
  validateMappingsCoverUnknown,
  type ImportMappings,
  type UnknownValues,
} from "./domainResolver.service.js";

export interface ImportReport {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  sheetUsed?: string;
}

export interface SheetInfo {
  name: string;
  hasValidHeaders: boolean;
  matchedColumns: number;
  dataRowCount: number;
  isDefault: boolean;
}

export interface ImportPreview {
  sheets: SheetInfo[];
  defaultSheet: string | null;
  unknownValues: UnknownValues;
  canImport: boolean;
}

export interface ImportOptions {
  sheetName?: string;
  mappings?: ImportMappings;
}

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

  const slug = key.replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const placeholderEmail = `${slug || "consultor"}.${Date.now()}@import.local`;
  const created = await tx.user.create({
    data: {
      name: name.trim(),
      email: placeholderEmail,
      passwordHash: "!import-placeholder",
    },
    select: { id: true },
  });

  const colaboradorRole = await tx.role.findUnique({
    where: { name: "Colaborador" },
    select: { id: true },
  });
  if (colaboradorRole) {
    await tx.userRole.create({
      data: { userId: created.id, roleId: colaboradorRole.id },
    });
  }
  cache.set(key, created.id);
  return created.id;
}

function pickDefaultSheetName(workbook: XLSX.WorkBook): string | null {
  const analyzed = workbook.SheetNames.map((name) =>
    analyzeSheet(name, workbook.Sheets[name])
  );
  const valid = analyzed.filter((s) => s.hasValidHeaders);
  if (valid.length === 0) return null;

  const baseCrm = valid.find((s) => normalizeHeader(s.name) === "base_crm");
  if (baseCrm) return baseCrm.name;

  return valid.sort(
    (a, b) => b.matchedColumns - a.matchedColumns || b.dataRowCount - a.dataRowCount
  )[0].name;
}

function analyzeSheet(
  name: string,
  sheet: XLSX.WorkSheet
): Omit<SheetInfo, "isDefault"> {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1 });
  const headerIdx = findHeaderRowIndex(matrix);
  const headers =
    headerIdx >= 0
      ? matrix[headerIdx]
          .map((h) => (h == null ? "" : String(h).trim()))
          .filter(Boolean)
      : [];
  const matchedColumns = buildHeaderIndex(headers).size;
  const dataRowCount =
    headerIdx >= 0
      ? matrix
          .slice(headerIdx + 1)
          .filter((r) => r.some((c) => c != null && String(c).trim() !== "")).length
      : 0;

  return { name, hasValidHeaders: headerIdx >= 0, matchedColumns, dataRowCount };
}

function resolveSheet(
  workbook: XLSX.WorkBook,
  sheetName?: string
): { sheet: XLSX.WorkSheet; sheetUsed: string } | null {
  if (sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;
    return { sheet, sheetUsed: sheetName };
  }

  const autoName = pickDefaultSheetName(workbook);
  if (autoName) {
    return { sheet: workbook.Sheets[autoName], sheetUsed: autoName };
  }

  const fallback = workbook.SheetNames[0];
  if (!fallback) return null;
  return { sheet: workbook.Sheets[fallback], sheetUsed: fallback };
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const norms = rows[i].map((c) => (c == null ? "" : normalizeHeader(String(c))));
    const hasId = norms.some((n) => n === "id");
    const hasName = norms.some((n) => n.includes("nome") && n.includes("cliente"));
    if (hasId && hasName) return i;
  }
  return -1;
}

function sheetToDataRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1 });
  const headerIdx = findHeaderRowIndex(matrix);
  if (headerIdx < 0) {
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  }

  const headers = matrix[headerIdx].map((h) => (h == null ? "" : String(h).trim()));
  const result: Record<string, unknown>[] = [];

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row.some((c) => c != null && String(c).trim() !== "")) continue;

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) obj[header] = row[j] ?? null;
    }
    result.push(obj);
  }
  return result;
}

function rowsToFields(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (rows.length === 0) return [];
  const headerIndex = buildHeaderIndex(Object.keys(rows[0]));
  return rows.map((raw) => {
    const fields: Record<string, unknown> = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = headerIndex.get(header);
      if (field) fields[field] = value;
    }
    return fields;
  });
}

export async function previewWorkbookFromBuffer(
  buffer: Buffer,
  sheetName?: string
): Promise<ImportPreview> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const defaultSheet = pickDefaultSheetName(workbook);
  const sheets = workbook.SheetNames.map((name) => {
    const info = analyzeSheet(name, workbook.Sheets[name]);
    return { ...info, isDefault: info.name === defaultSheet };
  });

  const resolved = resolveSheet(workbook, sheetName ?? defaultSheet ?? undefined);
  let unknownValues: UnknownValues = { statuses: [], sources: [], nextActions: [] };

  if (resolved) {
    const rows = sheetToDataRows(resolved.sheet);
    const fields = rowsToFields(rows);
    unknownValues = await collectUnknownValues(fields);
  }

  return {
    sheets,
    defaultSheet,
    unknownValues,
    canImport: !hasUnknownValues(unknownValues),
  };
}

export async function importLeadsFromBuffer(
  buffer: Buffer,
  options: ImportOptions = {}
): Promise<ImportReport> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const resolved = resolveSheet(workbook, options.sheetName);
  if (!resolved) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Planilha vazia" }],
    };
  }

  const { sheet, sheetUsed } = resolved;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1 });
  if (findHeaderRowIndex(matrix) < 0) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      sheetUsed,
      errors: [
        {
          row: 0,
          message: `A aba "${sheetUsed}" não possui cabeçalhos BASE_CRM (ID + Nome do cliente)`,
        },
      ],
    };
  }

  const rows = sheetToDataRows(sheet);
  const report: ImportReport = { imported: 0, updated: 0, skipped: 0, errors: [], sheetUsed };
  if (rows.length === 0) return report;

  const fieldsList = rowsToFields(rows);
  const unknownValues = await collectUnknownValues(fieldsList);
  const mappings = options.mappings ?? {};

  if (hasUnknownValues(unknownValues)) {
    const missing = validateMappingsCoverUnknown(unknownValues, mappings);
    if (missing.length > 0) {
      throw badRequest(
        `Valores não mapeados: ${missing.join("; ")}. Resolva no preview antes de importar.`
      );
    }
  }

  const headerIndex = buildHeaderIndex(Object.keys(rows[0]));
  const userCache = new Map<string, string>();
  const phoneCache = new Map<string, string>();
  const lookupCache = new Map<string, string | null>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
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
        const responsavelId = await resolveAssignedUser(
          fields.assignedTo ? String(fields.assignedTo) : undefined,
          userCache,
          tx
        );

        const sourceId = await resolveSourceId(
          fields.source ? String(fields.source) : undefined,
          mappings,
          tx,
          lookupCache
        );
        const salesStatusId = await resolveStatusId(
          fields.salesStatus ? String(fields.salesStatus) : undefined,
          mappings,
          tx,
          lookupCache
        );
        const nextActionId = await resolveActionId(
          fields.nextAction ? String(fields.nextAction) : undefined,
          mappings,
          tx,
          lookupCache
        );

        const externalCode = fields.externalCode ? String(fields.externalCode).trim() : undefined;
        const phone = normalizePhone(
          fields.phone != null ? String(fields.phone) : null,
        );
        const closed = parseDecimal(fields.closedAmount as string | number | null);
        const createdAt = parseDate(fields.createdAt as string | number | Date | null);
        const updatedAt = parseDate(fields.updatedAt as string | number | Date | null);

        const fechadoStatus = closed && closed.greaterThan(0)
          ? await tx.leadStatus.findUnique({ where: { slug: "fechado" } })
          : null;

        const data = {
          name,
          phone,
          sourceId,
          responsavelId,
          salesStatusId: fechadoStatus ? fechadoStatus.id : salesStatusId,
          nextActionId,
          nextFollowUpAt: parseDate(fields.nextFollowUpAt as string | number | null),
          notes: fields.notes ? String(fields.notes) : undefined,
          offeredAmount: parseDecimal(fields.offeredAmount as string | number | null),
          closedAmount: closed,
          ...(createdAt ? { createdAt } : {}),
          ...(updatedAt ? { updatedAt } : {}),
        };

        let leadId: string;
        let wasUpdate = false;

        let existingId: string | undefined;

        if (externalCode) {
          const byCode = await tx.lead.findUnique({
            where: { externalCode },
            select: { id: true },
          });
          if (byCode) existingId = byCode.id;
        }

        if (!existingId && phone) {
          const cachedId = phoneCache.get(phone);
          if (cachedId) {
            existingId = cachedId;
          } else {
            const byPhone = await tx.lead.findFirst({
              where: { phone },
              select: { id: true },
            });
            if (byPhone) existingId = byPhone.id;
          }
        }

        if (existingId) {
          await tx.lead.update({
            where: { id: existingId },
            data: {
              ...data,
              ...(externalCode ? { externalCode } : {}),
            },
          });
          leadId = existingId;
          wasUpdate = true;
        } else {
          const created = await tx.lead.create({
            data: { ...(externalCode ? { externalCode } : {}), ...data },
          });
          leadId = created.id;
        }

        if (phone) phoneCache.set(phone, leadId);

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
