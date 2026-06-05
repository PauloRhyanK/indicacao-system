import { Prisma } from "@prisma/client";

/**
 * Normaliza telefone para apenas dígitos, preservando o conteúdo numérico.
 * Retorna undefined se a entrada ficar vazia.
 */
export function normalizePhone(input?: string | null): string | undefined {
  if (!input) return undefined;
  const digits = String(input).replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

/**
 * Converte um valor (string com vírgula/ponto, número ou Decimal) em Prisma.Decimal.
 * Retorna undefined quando vazio/ inválido.
 */
export function parseDecimal(value?: string | number | null): Prisma.Decimal | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  let normalized = String(value).trim();
  if (normalized === "") return undefined;

  // Remove separador de milhar e padroniza decimal com ponto.
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  normalized = normalized.replace(/[^0-9.\-]/g, "");

  if (normalized === "" || Number.isNaN(Number(normalized))) return undefined;
  return new Prisma.Decimal(normalized);
}

/**
 * Converte um valor para Date. Aceita Date, string ISO ou serial de Excel.
 */
export function parseDate(value?: string | number | Date | null): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;

  if (typeof value === "number") {
    // Serial de data do Excel (dias desde 1899-12-30).
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = value * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch + ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
