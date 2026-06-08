import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { getCurrentGoal } from "./goal.service.js";
import type { UpsertDailyDefaultsInput } from "../schemas/dailyGoal.schema.js";
import { DAILY_PRESET_SLUGS } from "../schemas/dailyGoal.schema.js";

export const DAILY_PRESETS = {
  normal: { label: "Dia normal", multiplier: 1 },
  peak: { label: "Dia de pico (+50%)", multiplier: 1.5 },
  reduced: { label: "Equipe reduzida (−30%)", multiplier: 0.7 },
  sprint: { label: "Sprint da semana (×2)", multiplier: 2 },
} as const;

export type DailyPresetSlug = keyof typeof DAILY_PRESETS;

const BUSINESS_TZ = "America/Sao_Paulo";

function calendarPartsInTz(date: Date, timeZone = BUSINESS_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return { y, m, d };
}

function weekdayInTz(date: Date, timeZone = BUSINESS_TZ): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? 0;
}

/** Meia-noite a meia-noite no fuso de São Paulo. */
export function dayBoundsBusiness(date: Date) {
  const { y, m, d } = calendarPartsInTz(date);
  const start = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0, 0));
  return { start, end };
}

function toDateOnlyBusiness(date: Date): Date {
  const { y, m, d } = calendarPartsInTz(date);
  return new Date(Date.UTC(y, m - 1, d));
}

function parseDateParam(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) throw badRequest("Data inválida. Use YYYY-MM-DD");
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const parsed = new Date(Date.UTC(y, m, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m ||
    parsed.getUTCDate() !== d
  ) {
    throw badRequest("Data inválida");
  }
  return parsed;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function getDefaults() {
  const rows = await prisma.metaDailyDefault.findMany({ orderBy: { weekday: "asc" } });
  return rows.map((r: { weekday: number; amount: Prisma.Decimal }) => ({
    weekday: r.weekday,
    amount: decimalToNumber(r.amount),
  }));
}

export async function upsertDefaults(input: UpsertDailyDefaultsInput) {
  await prisma.$transaction(
    input.defaults.map((d) =>
      prisma.metaDailyDefault.upsert({
        where: { weekday: d.weekday },
        create: { weekday: d.weekday, amount: new Prisma.Decimal(d.amount) },
        update: { amount: new Prisma.Decimal(d.amount) },
      }),
    ),
  );
  return getDefaults();
}

export async function getOverridesForMonth(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await prisma.metaDailyOverride.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });
  return rows.map((r: { date: Date; amount: Prisma.Decimal | null; presetSlug: string | null }) => ({
    date: r.date.toISOString().slice(0, 10),
    amount: r.amount !== null ? decimalToNumber(r.amount) : null,
    presetSlug: r.presetSlug as DailyPresetSlug | null,
  }));
}

export async function upsertOverride(
  dateStr: string,
  data: { amount?: number; presetSlug?: DailyPresetSlug },
) {
  const date = parseDateParam(dateStr);
  const existing = await prisma.metaDailyOverride.findUnique({ where: { date } });

  const row = await prisma.metaDailyOverride.upsert({
    where: { date },
    create: {
      date,
      amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : null,
      presetSlug: data.presetSlug ?? null,
    },
    update: {
      ...(data.amount !== undefined ? { amount: new Prisma.Decimal(data.amount) } : {}),
      ...(data.presetSlug !== undefined ? { presetSlug: data.presetSlug } : {}),
    },
  });

  return {
    date: row.date.toISOString().slice(0, 10),
    amount: row.amount !== null ? decimalToNumber(row.amount) : null,
    presetSlug: row.presetSlug as DailyPresetSlug | null,
    hadExisting: !!existing,
  };
}

export async function deleteOverride(dateStr: string) {
  const date = parseDateParam(dateStr);
  const existing = await prisma.metaDailyOverride.findUnique({ where: { date } });
  if (!existing) throw notFound("Override não encontrado para esta data");
  await prisma.metaDailyOverride.delete({ where: { date } });
}

export async function getDailyProgress(date: Date) {
  const { start, end } = dayBoundsBusiness(date);
  const agg = await prisma.purchase.aggregate({
    where: { purchaseDate: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return decimalToNumber(agg._sum.amount);
}

export async function resolveDailyTarget(date: Date) {
  const dateOnly = toDateOnlyBusiness(date);
  const weekday = weekdayInTz(date);

  const [override, defaultRow] = await Promise.all([
    prisma.metaDailyOverride.findUnique({ where: { date: dateOnly } }),
    prisma.metaDailyDefault.findUnique({ where: { weekday } }),
  ]);

  const baseAmount =
    override?.amount !== null && override?.amount !== undefined
      ? decimalToNumber(override.amount)
      : defaultRow
        ? decimalToNumber(defaultRow.amount)
        : 0;

  const presetSlug = (override?.presetSlug ?? "normal") as DailyPresetSlug;
  const preset = DAILY_PRESETS[presetSlug] ?? DAILY_PRESETS.normal;
  const target = baseAmount * preset.multiplier;

  return {
    date: dateOnly.toISOString().slice(0, 10),
    weekday,
    baseAmount,
    presetSlug,
    presetLabel: preset.label,
    presetMultiplier: preset.multiplier,
    target,
    hasOverride: !!override,
    overrideAmount:
      override?.amount !== null && override?.amount !== undefined
        ? decimalToNumber(override.amount)
        : null,
  };
}

export async function getDailyTodaySummary() {
  const today = new Date();
  const { start, end } = dayBoundsBusiness(today);
  const resolved = await resolveDailyTarget(today);
  const current = await getDailyProgress(today);
  const percent = resolved.target > 0 ? Math.min(100, (current / resolved.target) * 100) : 0;

  const [periodGoal, recentPurchases, todayCount] = await Promise.all([
    getCurrentGoal(),
    prisma.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      take: 10,
      include: {
        lead: {
          select: {
            name: true,
            vendedor: { select: { name: true } },
            responsavel: { select: { name: true } },
          },
        },
      },
    }),
    prisma.purchase.count({
      where: { purchaseDate: { gte: start, lt: end } },
    }),
  ]);

  const period = periodGoal
    ? {
        id: periodGoal.id,
        targetAmount: decimalToNumber(periodGoal.targetAmount),
        currentAmount: decimalToNumber(periodGoal.currentAmount),
        startDate: periodGoal.startDate.toISOString(),
        endDate: periodGoal.endDate.toISOString(),
      }
    : null;

  return {
    ...resolved,
    current,
    percent,
    periodGoal: period,
    todaySalesCount: todayCount,
    recentSales: recentPurchases.map((p) => ({
      id: p.id,
      leadName: p.lead.name,
      sellerName: p.lead.vendedor?.name ?? p.lead.responsavel?.name ?? "Equipe CAIS",
      saleValue: decimalToNumber(p.amount),
      soldAt: p.purchaseDate.toISOString(),
    })),
    presets: DAILY_PRESET_SLUGS.map((slug) => ({
      slug,
      label: DAILY_PRESETS[slug].label,
      multiplier: DAILY_PRESETS[slug].multiplier,
    })),
  };
}

export async function applyPresetToday(presetSlug: DailyPresetSlug) {
  if (!DAILY_PRESETS[presetSlug]) throw badRequest("Preset inválido");
  const today = toDateOnlyBusiness(new Date());
  const dateStr = today.toISOString().slice(0, 10);

  await prisma.metaDailyOverride.upsert({
    where: { date: today },
    create: { date: today, presetSlug },
    update: { presetSlug },
  });

  return getDailyTodaySummary();
}
