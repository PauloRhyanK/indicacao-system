import * as XLSX from "xlsx";
import { OpportunityGrade, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";
import { normalizePhone, parseDate, parseDecimal } from "../utils/format.js";
import {
  collectUnknownValues,
  hasUnknownValues,
  resolveStatusId,
  validateMappingsCoverUnknown,
  type ImportMappings,
  type UnknownValues,
} from "./domainResolver.service.js";
import { activeLeadWhere } from "../utils/softDelete.js";

export interface ImportRowDetail {
  row: number;
  name: string;
  externalCode?: string | null;
  phone?: string | null;
  leadId?: string;
}

export interface ImportUpdateDetail extends ImportRowDetail {
  changes: string[];
  matchedBy?: "externalCode" | "phone";
}

export interface ImportIssueDetail {
  row: number;
  name?: string | null;
  message: string;
}

export interface ImportCreatedUserDetail {
  name: string;
  email: string;
  sheetAliases: string[];
}

export interface ImportReport {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportIssueDetail[];
  sheetUsed?: string;
  created: ImportRowDetail[];
  updates: ImportUpdateDetail[];
  ignored: ImportIssueDetail[];
  createdUsers?: ImportCreatedUserDetail[];
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
  name: ["nome do cliente", "nome dos clientes", "nome", "cliente"],
  phone: ["telefone", "celular"],
  assignedTo: ["responsavel pela reuniao", "responsavel"],
  salesStatus: ["status atual da oportunidade", "status"],
  opportunityGrade: ["grau de oportunidade", "grau da oportunidade"],
  notes: ["observacoes", "observacao", "obs"],
  offeredAmount: ["valor da carta ofertada", "valor ofertado", "carta ofertada"],
  closedAmount: ["valor fechado", "valor da venda"],
  updatedAt: ["ultima atualizacao", "atualizado em"],
};

const OPPORTUNITY_GRADE_MAP: Record<string, OpportunityGrade> = {
  baixo: OpportunityGrade.BAIXO,
  medio: OpportunityGrade.MEDIO,
  alto: OpportunityGrade.ALTO,
  extremo: OpportunityGrade.EXTREMO,
};

const OPPORTUNITY_GRADE_LABELS: Record<OpportunityGrade, string> = {
  [OpportunityGrade.BAIXO]: "Baixo",
  [OpportunityGrade.MEDIO]: "Médio",
  [OpportunityGrade.ALTO]: "Alto",
  [OpportunityGrade.EXTREMO]: "Extremo",
};

function parseOpportunityGrade(
  raw: unknown,
): { grade?: OpportunityGrade; error?: string } {
  if (raw == null || String(raw).trim() === "") return { grade: undefined };
  const norm = normalizeHeader(String(raw));
  const grade = OPPORTUNITY_GRADE_MAP[norm];
  if (!grade) {
    return {
      error: `Grau de oportunidade inválido: "${String(raw).trim()}". Use Extremo, Alto, Médio ou Baixo.`,
    };
  }
  return { grade };
}

function formatOpportunityGradeLabel(
  grade: OpportunityGrade | null | undefined,
): string {
  if (!grade) return "—";
  return OPPORTUNITY_GRADE_LABELS[grade];
}

function rowLooksLikeHeader(headers: string[]): boolean {
  const index = buildHeaderIndex(headers.filter(Boolean));
  const fields = new Set(index.values());
  const hasName = fields.has("name");
  const hasId = fields.has("externalCode");

  if (hasId && hasName) return true;
  if (hasName && fields.size >= 2) return true;

  return false;
}

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
    where: { name: { equals: name.trim(), mode: "insensitive" }, deletedAt: null },
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

function formatDateLabel(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("pt-BR");
}

function formatDecimalLabel(value: Prisma.Decimal | null | undefined): string {
  if (!value) return "—";
  return value.toFixed(2);
}

function pushChange(
  changes: string[],
  label: string,
  before: string | null | undefined,
  after: string | null | undefined,
) {
  const oldVal = before?.trim() || "—";
  const newVal = after?.trim() || "—";
  if (oldVal !== newVal) {
    changes.push(`${label}: ${oldVal} → ${newVal}`);
  }
}

function computeLeadChanges(
  existing: {
    name: string;
    phone: string | null;
    externalCode: string | null;
    opportunityGrade: OpportunityGrade | null;
    notes: string | null;
    offeredAmount: Prisma.Decimal | null;
    closedAmount: Prisma.Decimal | null;
    responsavel: { name: string } | null;
    salesStatus: { name: string } | null;
  },
  next: {
    name: string;
    phone: string | null | undefined;
    externalCode?: string;
    opportunityGrade?: OpportunityGrade | null;
    notes?: string;
    offeredAmount: Prisma.Decimal | null | undefined;
    closedAmount: Prisma.Decimal | null | undefined;
    responsavelLabel?: string;
    statusLabel?: string;
  },
): string[] {
  const changes: string[] = [];

  pushChange(changes, "Nome", existing.name, next.name);
  pushChange(changes, "Telefone", existing.phone, next.phone ?? null);
  if (next.externalCode) {
    pushChange(changes, "Código", existing.externalCode, next.externalCode);
  }
  pushChange(changes, "Vendedor responsável", existing.responsavel?.name, next.responsavelLabel);
  pushChange(changes, "Status", existing.salesStatus?.name, next.statusLabel);
  if (next.opportunityGrade !== undefined) {
    pushChange(
      changes,
      "Grau de oportunidade",
      formatOpportunityGradeLabel(existing.opportunityGrade),
      formatOpportunityGradeLabel(next.opportunityGrade),
    );
  }
  pushChange(changes, "Observações", existing.notes, next.notes ?? null);

  const oldOffered = formatDecimalLabel(existing.offeredAmount);
  const newOffered = formatDecimalLabel(next.offeredAmount ?? null);
  if (oldOffered !== newOffered) {
    changes.push(`Valor ofertado: ${oldOffered} → ${newOffered}`);
  }

  const oldClosed = formatDecimalLabel(existing.closedAmount);
  const newClosed = formatDecimalLabel(next.closedAmount ?? null);
  if (oldClosed !== newClosed) {
    changes.push(`Valor fechado: ${oldClosed} → ${newClosed}`);
  }

  return changes;
}

function pickDefaultSheetName(workbook: XLSX.WorkBook): string | null {
  const analyzed = workbook.SheetNames.map((name) =>
    analyzeSheet(name, workbook.Sheets[name])
  );
  const valid = analyzed.filter((s) => s.hasValidHeaders);
  if (valid.length === 0) return null;

  const baseCrm = valid.find((s) => normalizeHeader(s.name) === "base_crm");
  if (baseCrm) return baseCrm.name;

  const leadsSheet = valid.find((s) => normalizeHeader(s.name) === "leads");
  if (leadsSheet) return leadsSheet.name;

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
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i++) {
    const headers = rows[i].map((c) => (c == null ? "" : String(c).trim()));
    if (rowLooksLikeHeader(headers)) return i;
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
  let unknownValues: UnknownValues = { statuses: [] };

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
      created: [],
      updates: [],
      ignored: [],
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
          message: `A aba "${sheetUsed}" não possui cabeçalhos reconhecidos (modelo simples ou BASE_CRM)`,
        },
      ],
      created: [],
      updates: [],
      ignored: [],
    };
  }

  const rows = sheetToDataRows(sheet);
  const report: ImportReport = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    sheetUsed,
    created: [],
    updates: [],
    ignored: [],
  };
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
  const headerIdx = findHeaderRowIndex(matrix);
  const userCache = new Map<string, string>();
  const phoneCache = new Map<string, string>();
  const lookupCache = new Map<string, string | null>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = headerIdx + 2 + i;
    const raw = rows[i];

    const fields: Record<string, unknown> = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = headerIndex.get(header);
      if (field) fields[field] = value;
    }

    const name = fields.name ? String(fields.name).trim() : "";
    if (!name) {
      report.skipped++;
      report.ignored.push({ row: rowNumber, message: "Nome do cliente ausente" });
      continue;
    }

    const gradeResult = parseOpportunityGrade(fields.opportunityGrade);
    if (gradeResult.error) {
      report.errors.push({ row: rowNumber, name, message: gradeResult.error });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const responsavelId = await resolveAssignedUser(
          fields.assignedTo ? String(fields.assignedTo) : undefined,
          userCache,
          tx
        );

        const salesStatusId = await resolveStatusId(
          fields.salesStatus ? String(fields.salesStatus) : undefined,
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
          responsavelId,
          firstContactId: responsavelId,
          salesStatusId: fechadoStatus ? fechadoStatus.id : salesStatusId,
          ...(gradeResult.grade !== undefined ? { opportunityGrade: gradeResult.grade } : {}),
          notes: fields.notes ? String(fields.notes) : undefined,
          offeredAmount: parseDecimal(fields.offeredAmount as string | number | null),
          closedAmount: closed,
          ...(createdAt ? { createdAt } : {}),
          ...(updatedAt ? { updatedAt } : {}),
        };

        let leadId: string;
        let matchedBy: "externalCode" | "phone" | undefined;

        let existingId: string | undefined;

        if (externalCode) {
          const byCode = await tx.lead.findUnique({
            where: { externalCode },
            select: { id: true },
          });
          if (byCode) {
            existingId = byCode.id;
            matchedBy = "externalCode";
          }
        }

        if (!existingId && phone) {
          const cachedId = phoneCache.get(phone);
          if (cachedId) {
            existingId = cachedId;
            matchedBy = "phone";
          } else {
            const byPhone = await tx.lead.findFirst({
              where: { phone, ...activeLeadWhere },
              select: { id: true },
            });
            if (byPhone) {
              existingId = byPhone.id;
              matchedBy = "phone";
            }
          }
        }

        const responsavelLabel = fields.assignedTo
          ? String(fields.assignedTo).trim()
          : undefined;
        const statusLabel = fechadoStatus
          ? "Fechado"
          : fields.salesStatus
            ? String(fields.salesStatus).trim()
            : undefined;

        const rowDetail = {
          row: rowNumber,
          name,
          externalCode: externalCode ?? null,
          phone: phone ?? null,
        };

        if (existingId) {
          const existing = await tx.lead.findUniqueOrThrow({
            where: { id: existingId },
            include: {
              responsavel: { select: { name: true } },
              salesStatus: { select: { name: true } },
            },
          });

          const changes = computeLeadChanges(existing, {
            name,
            phone,
            externalCode,
            opportunityGrade: gradeResult.grade ?? null,
            notes: data.notes,
            offeredAmount: data.offeredAmount,
            closedAmount: data.closedAmount,
            responsavelLabel,
            statusLabel,
          });

          await tx.lead.update({
            where: { id: existingId },
            data: {
              ...data,
              ...(externalCode ? { externalCode } : {}),
            },
          });
          leadId = existingId;

          report.updates.push({
            ...rowDetail,
            leadId,
            matchedBy,
            changes: changes.length > 0 ? changes : ["Nenhum campo alterado (dados já atualizados)"],
          });
        } else {
          const created = await tx.lead.create({
            data: { ...(externalCode ? { externalCode } : {}), ...data },
          });
          leadId = created.id;

          report.created.push({ ...rowDetail, leadId });
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

      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar linha";
      report.errors.push({ row: rowNumber, name, message });
    }
  }

  report.imported = report.created.length;
  report.updated = report.updates.length;
  report.skipped = report.ignored.length;

  return report;
}

const TEMPLATE_INSTRUCTION =
  "Grau de oportunidade: informe Extremo, Alto, Médio ou Baixo.";
const TEMPLATE_HEADERS = [
  "Nome do cliente",
  "Grau de oportunidade",
  "Telefone",
  "Observações",
];

export function buildLeadsImportTemplate(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    [TEMPLATE_INSTRUCTION, "", "", ""],
    TEMPLATE_HEADERS,
  ]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
