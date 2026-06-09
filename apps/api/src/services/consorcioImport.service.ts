import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";
import { normalizeText } from "../utils/slugify.js";
import { activeLeadWhere } from "../utils/softDelete.js";
import { incrementCurrentGoal } from "./goal.service.js";
import {
  buildCreatedUsersReport,
  collectUnknownUserNames,
  getSuggestedUserMappings,
  persistUserAliases,
  resolveUserId,
  validateUserMappingsCoverUnknown,
  type ResolveUserContext,
  type UserImportMappings,
} from "./userResolver.service.js";
import type { ImportReport, SheetInfo } from "./leadImport.service.js";

export type ConsortiumSection = "imobiliario" | "veiculo";

export interface ConsorcioSaleRow {
  row: number;
  section: ConsortiumSection;
  clientName: string;
  cardCount: number;
  unitValue: number;
  sellerName: string;
  coSellerName: string | null;
  total: number;
}

export interface ConsorcioUnknownValues {
  users: string[];
}

export interface ConsorcioImportPreview {
  sheets: SheetInfo[];
  defaultSheet: string | null;
  unknownValues: ConsorcioUnknownValues;
  suggestedUserMappings: Record<string, { userId: string; userName: string }>;
  dataRowCount: number;
  sellerNames: string[];
  canImport: boolean;
}

export interface ConsorcioImportOptions {
  sheetName?: string;
  purchaseDate: Date;
  mappings?: UserImportMappings;
}

const SECTION_CONSORTIUM_SLUG: Record<ConsortiumSection, string> = {
  imobiliario: "imovel",
  veiculo: "automovel",
};

const SKIP_SELLER_LABELS = new Set([
  "vendedor",
  "co vendedor",
  "rejeitada pela adm",
]);

function normalizeSectionLabel(cell: unknown): ConsortiumSection | null {
  if (cell == null) return null;
  const n = normalizeText(String(cell));
  if (n === "imobiliario") return "imobiliario";
  if (n === "veiculo") return "veiculo";
  return null;
}

function isHeaderRow(row: unknown[]): boolean {
  const cols = row.map((c) => normalizeText(String(c ?? "")));
  return cols.includes("cliente") && cols.includes("vendedor");
}

function isTotalRow(row: unknown[]): boolean {
  const first = normalizeText(String(row[0] ?? ""));
  return first === "total" || first === "total campanha" || first.startsWith("total ");
}

function parseSellerCell(cell: unknown): string | null {
  if (cell == null) return null;
  const s = String(cell).trim();
  if (!s) return null;
  const compact = s.replace(/\s/g, "");
  if (/^\d+([.,]\d+)?$/.test(compact)) return null;
  return s;
}

function collectSellerNamesFromMatrix(matrix: unknown[][]): string[] {
  const names = new Set<string>();
  for (const row of matrix) {
    const seller = parseSellerCell(row[3]);
    const coSeller = parseSellerCell(row[4]);
    if (seller && !SKIP_SELLER_LABELS.has(normalizeText(seller))) names.add(seller);
    if (coSeller && !SKIP_SELLER_LABELS.has(normalizeText(coSeller))) names.add(coSeller);
    if (seller && SKIP_SELLER_LABELS.has(normalizeText(seller)) && normalizeText(seller) === "rejeitada pela adm") {
      names.add(seller);
    }
  }
  return [...names].sort();
}

function parseConsorcioRows(matrix: unknown[][]): ConsorcioSaleRow[] {
  let section: ConsortiumSection | null = null;
  const rows: ConsorcioSaleRow[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

    const sectionLabel = normalizeSectionLabel(row[0]);
    if (sectionLabel) {
      section = sectionLabel;
      continue;
    }

    if (isHeaderRow(row)) continue;
    if (isTotalRow(row)) continue;
    if (!section) continue;

    const clientName = row[0] == null ? "" : String(row[0]).trim();
    if (!clientName) continue;

    const sellerName = parseSellerCell(row[3]);
    if (!sellerName || SKIP_SELLER_LABELS.has(normalizeText(sellerName))) continue;

    const total = Number(row[5]);
    if (!Number.isFinite(total) || total <= 0) continue;

    const cardCount = Number(row[1]);
    const unitValue = Number(row[2]);

    rows.push({
      row: i + 1,
      section,
      clientName,
      cardCount: Number.isFinite(cardCount) ? cardCount : 1,
      unitValue: Number.isFinite(unitValue) ? unitValue : total,
      sellerName,
      coSellerName: parseSellerCell(row[4]),
      total,
    });
  }

  return rows;
}

function analyzeConsorcioSheet(name: string, sheet: XLSX.WorkSheet): Omit<SheetInfo, "isDefault"> {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1 });
  const saleRows = parseConsorcioRows(matrix);
  const hasValidHeaders = matrix.some((row) => isHeaderRow(row));
  return {
    name,
    hasValidHeaders,
    matchedColumns: hasValidHeaders ? 6 : 0,
    dataRowCount: saleRows.length,
  };
}

function pickDefaultSheetName(workbook: XLSX.WorkBook): string | null {
  for (const name of workbook.SheetNames) {
    const info = analyzeConsorcioSheet(name, workbook.Sheets[name]);
    if (info.hasValidHeaders && info.dataRowCount > 0) return name;
  }
  for (const name of workbook.SheetNames) {
    if (analyzeConsorcioSheet(name, workbook.Sheets[name]).hasValidHeaders) return name;
  }
  return workbook.SheetNames[0] ?? null;
}

function resolveSheet(workbook: XLSX.WorkBook, sheetName?: string) {
  if (sheetName && workbook.Sheets[sheetName]) {
    return { sheet: workbook.Sheets[sheetName], sheetUsed: sheetName };
  }
  const auto = pickDefaultSheetName(workbook);
  if (auto) return { sheet: workbook.Sheets[auto], sheetUsed: auto };
  const fallback = workbook.SheetNames[0];
  if (!fallback) return null;
  return { sheet: workbook.Sheets[fallback], sheetUsed: fallback };
}

async function findLeadByName(tx: Prisma.TransactionClient, name: string) {
  const normalized = normalizeText(name);
  const leads = await tx.lead.findMany({
    where: activeLeadWhere,
    select: { id: true, name: true, closedAmount: true, responsavelId: true, coVendedorId: true },
  });
  return leads.find((l) => normalizeText(l.name) === normalized) ?? null;
}

function dedupeKey(row: ConsorcioSaleRow): string {
  return [
    normalizeText(row.clientName),
    row.total,
    normalizeText(row.sellerName),
    row.section,
  ].join("|");
}

export async function previewConsorcioFromBuffer(
  buffer: Buffer,
  sheetName?: string,
): Promise<ConsorcioImportPreview> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const defaultSheet = pickDefaultSheetName(workbook);
  const sheets = workbook.SheetNames.map((name) => {
    const info = analyzeConsorcioSheet(name, workbook.Sheets[name]);
    return { ...info, isDefault: name === defaultSheet };
  });

  const resolved = resolveSheet(workbook, sheetName ?? defaultSheet ?? undefined);
  let unknownValues: ConsorcioUnknownValues = { users: [] };
  let suggestedUserMappings: Record<string, { userId: string; userName: string }> = {};
  let dataRowCount = 0;
  let sellerNames: string[] = [];

  if (resolved) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(resolved.sheet, { defval: null, header: 1 });
    sellerNames = collectSellerNamesFromMatrix(matrix);
    dataRowCount = parseConsorcioRows(matrix).length;
    unknownValues = { users: await collectUnknownUserNames(sellerNames) };
    suggestedUserMappings = await getSuggestedUserMappings(sellerNames);
  }

  return {
    sheets,
    defaultSheet,
    unknownValues,
    suggestedUserMappings,
    dataRowCount,
    sellerNames,
    canImport: unknownValues.users.length === 0 && dataRowCount > 0,
  };
}

export async function importConsorcioFromBuffer(
  buffer: Buffer,
  options: ConsorcioImportOptions,
  actorUserId?: string,
): Promise<ImportReport> {
  if (!options.purchaseDate || Number.isNaN(options.purchaseDate.getTime())) {
    throw badRequest("Informe a data da campanha");
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const resolved = resolveSheet(workbook, options.sheetName);
  if (!resolved) {
    return emptyReport("Planilha vazia");
  }

  const { sheet, sheetUsed } = resolved;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: null, header: 1 });
  if (!matrix.some((row) => isHeaderRow(row))) {
    return {
      ...emptyReport(`A aba "${sheetUsed}" não possui cabeçalho de campanha (CLIENTE, VENDEDOR, TOTAL)`),
      sheetUsed,
    };
  }

  const saleRows = parseConsorcioRows(matrix);
  const mappings = options.mappings ?? {};
  const sellerNames = collectSellerNamesFromMatrix(matrix);
  const unknownUsers = await collectUnknownUserNames(sellerNames);

  if (unknownUsers.length > 0) {
    const missing = validateUserMappingsCoverUnknown(unknownUsers, mappings);
    if (missing.length > 0) {
      throw badRequest(
        `Vendedores não mapeados: ${missing.join("; ")}. Resolva no preview antes de importar.`,
      );
    }
  }

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

  if (saleRows.length === 0) return report;

  const fechadoStatus = await prisma.leadStatus.findUnique({ where: { slug: "fechado" } });
  const consortiumTypes = await prisma.consortiumType.findMany({
    select: { id: true, slug: true },
  });
  const typeBySlug = new Map(consortiumTypes.map((t) => [t.slug, t.id]));

  const userCache = new Map<string, string | null>();
  const processedKeys = new Set<string>();
  const resolveCtx: ResolveUserContext = {
    createdUsers: new Map(),
    aliasAccumulator: new Map(),
  };

  await prisma.$transaction(async (tx) => {
    for (const row of saleRows) {
      const key = dedupeKey(row);
      if (processedKeys.has(key)) {
        report.skipped += 1;
        report.ignored.push({
          row: row.row,
          name: row.clientName,
          message: "Venda duplicada na mesma importação",
        });
        continue;
      }

      try {
        const responsavelId = await resolveUserId(
          row.sellerName,
          mappings,
          tx,
          userCache,
          resolveCtx,
        );

        let coVendedorId: string | undefined;
        if (row.coSellerName) {
          coVendedorId = await resolveUserId(
            row.coSellerName,
            mappings,
            tx,
            userCache,
            resolveCtx,
          );
        }

        const consortiumTypeId = typeBySlug.get(SECTION_CONSORTIUM_SLUG[row.section]);
        const amount = new Prisma.Decimal(row.total);

        let lead = await findLeadByName(tx, row.clientName);

        if (lead) {
          const existingPurchase = await tx.purchase.findFirst({
            where: {
              leadId: lead.id,
              deletedAt: null,
              amount,
              purchaseDate: options.purchaseDate,
              ...(consortiumTypeId ? { consortiumTypeId } : {}),
            },
            select: { id: true },
          });
          if (existingPurchase) {
            report.skipped += 1;
            report.ignored.push({
              row: row.row,
              name: row.clientName,
              message: "Venda já importada (mesmo cliente, valor, data e tipo)",
            });
            continue;
          }
        }

        if (!lead) {
          lead = await tx.lead.create({
            data: {
              name: row.clientName.trim(),
              responsavelId,
              coVendedorId: coVendedorId ?? null,
              ...(fechadoStatus ? { salesStatusId: fechadoStatus.id } : {}),
              closedAmount: amount,
              offeredAmount: row.unitValue > 0 ? new Prisma.Decimal(row.unitValue) : undefined,
            },
            select: {
              id: true,
              name: true,
              closedAmount: true,
              responsavelId: true,
              coVendedorId: true,
            },
          });

          const purchase = await tx.purchase.create({
            data: {
              leadId: lead.id,
              amount,
              purchaseDate: options.purchaseDate,
              consortiumTypeId,
            },
            select: { id: true },
          });

          await incrementCurrentGoal(amount, tx);

          report.imported += 1;
          report.created.push({
            row: row.row,
            name: row.clientName,
            leadId: lead.id,
            phone: null,
            externalCode: `venda:${purchase.id}`,
          });
          processedKeys.add(key);
          continue;
        }

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            responsavelId,
            ...(coVendedorId !== undefined ? { coVendedorId } : {}),
            ...(fechadoStatus ? { salesStatusId: fechadoStatus.id } : {}),
            closedAmount: (lead.closedAmount ?? new Prisma.Decimal(0)).plus(amount),
          },
        });

        const purchase = await tx.purchase.create({
          data: {
            leadId: lead.id,
            amount,
            purchaseDate: options.purchaseDate,
            consortiumTypeId,
          },
          select: { id: true },
        });

        await incrementCurrentGoal(amount, tx);

        report.imported += 1;
        report.created.push({
          row: row.row,
          name: row.clientName,
          leadId: lead.id,
          phone: null,
          externalCode: `venda:${purchase.id}`,
        });
        processedKeys.add(key);
      } catch (err) {
        report.errors.push({
          row: row.row,
          name: row.clientName,
          message: err instanceof Error ? err.message : "Erro ao importar linha",
        });
      }
    }

    await persistUserAliases(mappings, resolveCtx, tx);
  });

  const createdUsers = buildCreatedUsersReport(resolveCtx);
  if (createdUsers.length > 0) {
    report.createdUsers = createdUsers;
  }

  return report;
}

function emptyReport(message: string): ImportReport {
  return {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [{ row: 0, message }],
    created: [],
    updates: [],
    ignored: [],
  };
}
