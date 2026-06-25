import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { getCurrentGoal } from "./goal.service.js";
import type { UpsertDailyDefaultsInput } from "../schemas/dailyGoal.schema.js";
import { DAILY_PRESET_SLUGS } from "../schemas/dailyGoal.schema.js";
import { activeUserWhere } from "../utils/softDelete.js";

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

/** Início do primeiro dia e fim exclusivo do último dia do período (fuso SP). */
export function periodBoundsBusiness(startDate: Date, endDate: Date) {
  const { start } = dayBoundsBusiness(startDate);
  const { end } = dayBoundsBusiness(endDate);
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

async function sumPurchasesByBoletoStatus(
  where: Prisma.PurchaseWhereInput,
): Promise<{ paid: number; pending: number; paidCount: number; pendingCount: number }> {
  const purchases = await prisma.purchase.findMany({
    where,
    select: { amount: true, boletoPaid: true },
  });

  let paid = 0;
  let pending = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const p of purchases) {
    const amt = decimalToNumber(p.amount);
    if (p.boletoPaid) {
      paid += amt;
      paidCount += 1;
    } else {
      pending += amt;
      pendingCount += 1;
    }
  }

  return { paid, pending, paidCount, pendingCount };
}

export async function getDailyProgress(date: Date) {
  const { start, end } = dayBoundsBusiness(date);
  const { paid } = await sumPurchasesByBoletoStatus({
    deletedAt: null,
    lead: { deletedAt: null },
    purchaseDate: { gte: start, lt: end },
  });
  return paid;
}

async function getDailyProgressSplit(date: Date) {
  const { start, end } = dayBoundsBusiness(date);
  return sumPurchasesByBoletoStatus({
    deletedAt: null,
    lead: { deletedAt: null },
    purchaseDate: { gte: start, lt: end },
  });
}

async function getPeriodProgressSplit(startDate: Date, endDate: Date) {
  const { start, end } = periodBoundsBusiness(startDate, endDate);
  return sumPurchasesByBoletoStatus({
    deletedAt: null,
    lead: { deletedAt: null },
    purchaseDate: { gte: start, lt: end },
  });
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

async function getPeriodSalesRanking(start: Date, end: Date) {
  const { start: periodStart, end: periodEnd } = periodBoundsBusiness(start, end);

  const purchases = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      responsavelId: { not: null },
      purchaseDate: { gte: periodStart, lt: periodEnd },
      responsavel: activeUserWhere,
    },
    select: {
      amount: true,
      boletoPaid: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true } },
    },
  });

  const totals = new Map<
    string,
    {
      userId: string;
      name: string;
      total: number;
      pendingTotal: number;
      count: number;
      pendingCount: number;
    }
  >();

  for (const p of purchases) {
    const seller = p.responsavel;
    if (!seller || !p.responsavelId) continue;

    const entry = totals.get(p.responsavelId) ?? {
      userId: seller.id,
      name: seller.name,
      total: 0,
      pendingTotal: 0,
      count: 0,
      pendingCount: 0,
    };
    const amt = decimalToNumber(p.amount);
    if (p.boletoPaid) {
      entry.total += amt;
      entry.count += 1;
    } else {
      entry.pendingTotal += amt;
      entry.pendingCount += 1;
    }
    totals.set(p.responsavelId, entry);
  }

  return [...totals.values()]
    .sort((a, b) => b.total - a.total || b.pendingTotal - a.pendingTotal || b.count - a.count)
    .map((row, index) => ({
      position: index + 1,
      userId: row.userId,
      name: row.name,
      total: row.total,
      pendingTotal: row.pendingTotal,
      count: row.count,
      pendingCount: row.pendingCount,
    }));
}

async function getPeriodCoVendedorRanking(start: Date, end: Date) {
  const { start: periodStart, end: periodEnd } = periodBoundsBusiness(start, end);

  const purchases = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      lead: {
        deletedAt: null,
        coVendedorId: { not: null },
        coVendedor: activeUserWhere,
      },
      purchaseDate: { gte: periodStart, lt: periodEnd },
    },
    select: {
      amount: true,
      boletoPaid: true,
      lead: {
        select: {
          coVendedorId: true,
          coVendedor: { select: { id: true, name: true } },
        },
      },
    },
  });

  const totals = new Map<
    string,
    {
      userId: string;
      name: string;
      total: number;
      pendingTotal: number;
      count: number;
      pendingCount: number;
    }
  >();

  for (const p of purchases) {
    const coSeller = p.lead?.coVendedor;
    const coSellerId = p.lead?.coVendedorId;
    if (!coSeller || !coSellerId) continue;

    const entry = totals.get(coSellerId) ?? {
      userId: coSeller.id,
      name: coSeller.name,
      total: 0,
      pendingTotal: 0,
      count: 0,
      pendingCount: 0,
    };
    const amt = decimalToNumber(p.amount);
    if (p.boletoPaid) {
      entry.total += amt;
      entry.count += 1;
    } else {
      entry.pendingTotal += amt;
      entry.pendingCount += 1;
    }
    totals.set(coSellerId, entry);
  }

  return [...totals.values()]
    .sort((a, b) => b.total - a.total || b.pendingTotal - a.pendingTotal || b.count - a.count)
    .map((row, index) => ({
      position: index + 1,
      userId: row.userId,
      name: row.name,
      total: row.total,
      pendingTotal: row.pendingTotal,
      count: row.count,
      pendingCount: row.pendingCount,
    }));
}

async function getPeriodParticipacoesRanking(start: Date, end: Date) {
  const { start: periodStart, end: periodEnd } = periodBoundsBusiness(start, end);

  const purchases = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      lead: { deletedAt: null },
      purchaseDate: { gte: periodStart, lt: periodEnd },
    },
    select: {
      amount: true,
      boletoPaid: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true, deletedAt: true } },
      lead: {
        select: {
          coVendedorId: true,
          coVendedor: { select: { id: true, name: true, deletedAt: true } },
          firstContactId: true,
          firstContact: { select: { id: true, name: true, deletedAt: true } },
        },
      },
    },
  });

  const totals = new Map<
    string,
    {
      userId: string;
      name: string;
      total: number;
      pendingTotal: number;
      count: number;
      pendingCount: number;
      vendedorCount: number;
      covendedorCount: number;
      firstContactCount: number;
      pendingVendedorCount: number;
      pendingCovendedorCount: number;
      pendingFirstContactCount: number;
    }
  >();

  for (const p of purchases) {
    const amt = decimalToNumber(p.amount);
    const isPaid = p.boletoPaid;

    const candidates: Array<{
      user: { id: string; name: string; deletedAt: Date | null };
      roleWeight: number; // 3 = vendedor, 2 = covendedor, 1 = primeiro contato
    }> = [];

    if (p.responsavelId && p.responsavel && p.responsavel.deletedAt === null) {
      candidates.push({ user: p.responsavel, roleWeight: 3 });
    }
    if (p.lead?.coVendedorId && p.lead?.coVendedor && p.lead.coVendedor.deletedAt === null) {
      candidates.push({ user: p.lead.coVendedor, roleWeight: 2 });
    }
    if (p.lead?.firstContactId && p.lead?.firstContact && p.lead.firstContact.deletedAt === null) {
      candidates.push({ user: p.lead.firstContact, roleWeight: 1 });
    }

    const uniqueCandidates = new Map<string, { user: typeof candidates[0]['user']; roleWeight: number }>();
    for (const c of candidates) {
      const existing = uniqueCandidates.get(c.user.id);
      if (!existing || c.roleWeight > existing.roleWeight) {
        uniqueCandidates.set(c.user.id, c);
      }
    }

    for (const { user, roleWeight } of uniqueCandidates.values()) {
      const entry = totals.get(user.id) ?? {
        userId: user.id,
        name: user.name,
        total: 0,
        pendingTotal: 0,
        count: 0,
        pendingCount: 0,
        vendedorCount: 0,
        covendedorCount: 0,
        firstContactCount: 0,
        pendingVendedorCount: 0,
        pendingCovendedorCount: 0,
        pendingFirstContactCount: 0,
      };

      if (isPaid) {
        entry.total += amt;
        entry.count += 1;
        if (roleWeight === 3) entry.vendedorCount += 1;
        else if (roleWeight === 2) entry.covendedorCount += 1;
        else if (roleWeight === 1) entry.firstContactCount += 1;
      } else {
        entry.pendingTotal += amt;
        entry.pendingCount += 1;
        if (roleWeight === 3) entry.pendingVendedorCount += 1;
        else if (roleWeight === 2) entry.pendingCovendedorCount += 1;
        else if (roleWeight === 1) entry.pendingFirstContactCount += 1;
      }

      totals.set(user.id, entry);
    }
  }

  return [...totals.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.vendedorCount !== a.vendedorCount) return b.vendedorCount - a.vendedorCount;
      if (b.covendedorCount !== a.covendedorCount) return b.covendedorCount - a.covendedorCount;
      if (b.firstContactCount !== a.firstContactCount) return b.firstContactCount - a.firstContactCount;
      if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
      if (b.pendingVendedorCount !== a.pendingVendedorCount) return b.pendingVendedorCount - a.pendingVendedorCount;
      if (b.pendingCovendedorCount !== a.pendingCovendedorCount) return b.pendingCovendedorCount - a.pendingCovendedorCount;
      if (b.pendingFirstContactCount !== a.pendingFirstContactCount) return b.pendingFirstContactCount - a.pendingFirstContactCount;
      if (b.total !== a.total) return b.total - a.total;
      return b.pendingTotal - a.pendingTotal;
    })
    .map((row, index) => ({
      position: index + 1,
      userId: row.userId,
      name: row.name,
      total: row.total,
      pendingTotal: row.pendingTotal,
      count: row.count,
      pendingCount: row.pendingCount,
    }));
}

export async function getDailyTodaySummary() {
  const today = new Date();
  const resolved = await resolveDailyTarget(today);
  const dailySplit = await getDailyProgressSplit(today);
  const current = dailySplit.paid;
  const currentPending = dailySplit.pending;
  const percent = resolved.target > 0 ? Math.min(100, (current / resolved.target) * 100) : 0;

  const [periodGoal, recentPurchases] = await Promise.all([
    getCurrentGoal(),
    prisma.purchase.findMany({
      where: { deletedAt: null, lead: { deletedAt: null } },
      orderBy: { purchaseDate: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        boletoPaid: true,
        purchaseDate: true,
        responsavel: { select: { name: true } },
        lead: {
          select: {
            name: true,
            responsavel: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const salesRanking = periodGoal
    ? await getPeriodSalesRanking(periodGoal.startDate, periodGoal.endDate)
    : [];

  const coVendedorRanking = periodGoal
    ? await getPeriodCoVendedorRanking(periodGoal.startDate, periodGoal.endDate)
    : [];

  const participacoesRanking = periodGoal
    ? await getPeriodParticipacoesRanking(periodGoal.startDate, periodGoal.endDate)
    : [];

  const periodSplit = periodGoal
    ? await getPeriodProgressSplit(periodGoal.startDate, periodGoal.endDate)
    : null;

  let maxSaleAmount = 0;
  if (periodGoal) {
    const { start: pStart, end: pEnd } = periodBoundsBusiness(periodGoal.startDate, periodGoal.endDate);
    const maxPurchase = await prisma.purchase.findFirst({
      where: {
        deletedAt: null,
        lead: { deletedAt: null },
        purchaseDate: { gte: pStart, lt: pEnd },
        boletoPaid: true,
      },
      orderBy: { amount: "desc" },
      select: { amount: true },
    });
    if (maxPurchase) {
      maxSaleAmount = decimalToNumber(maxPurchase.amount);
    }
  }

  const period = periodGoal
    ? {
        id: periodGoal.id,
        targetAmount: decimalToNumber(periodGoal.targetAmount),
        currentAmount: periodSplit?.paid ?? 0,
        currentPending: periodSplit?.pending ?? 0,
        paidCount: periodSplit?.paidCount ?? 0,
        pendingCount: periodSplit?.pendingCount ?? 0,
        maxSaleAmount: maxSaleAmount,
        startDate: periodGoal.startDate.toISOString(),
        endDate: periodGoal.endDate.toISOString(),
      }
    : null;

  return {
    ...resolved,
    current,
    currentPending,
    percent,
    periodGoal: period,
    todaySalesCount: dailySplit.paidCount + dailySplit.pendingCount,
    todayPaidSalesCount: dailySplit.paidCount,
    recentSales: recentPurchases.map((p) => ({
      id: p.id,
      leadName: p.lead.name,
      sellerName: p.responsavel?.name ?? p.lead.responsavel?.name ?? "Equipe CAIS",
      saleValue: decimalToNumber(p.amount),
      soldAt: p.purchaseDate.toISOString(),
      boletoPaid: p.boletoPaid,
    })),
    salesRanking,
    coVendedorRanking,
    participacoesRanking,
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
