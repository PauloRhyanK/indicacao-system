import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";
import { dayBoundsBusiness, periodBoundsBusiness, resolveDailyTarget } from "./dailyGoal.service.js";
import { getCurrentGoal } from "./goal.service.js";
import { activeLeadWhere, activeUserWhere } from "../utils/softDelete.js";

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function shiftBusinessDay(date: Date, deltaDays: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d;
}

const activePurchaseLead = {
  deletedAt: null,
  lead: { deletedAt: null },
} as const;

async function personalSalesInRange(userId: string, start: Date, end: Date) {
  const agg = await prisma.purchase.aggregate({
    where: {
      ...activePurchaseLead,
      responsavelId: userId,
      purchaseDate: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return decimalToNumber(agg._sum.amount);
}

async function computeStreak(userId: string): Promise<number> {
  let streak = 0;
  let day = new Date();
  for (let i = 0; i < 366; i++) {
    const { start, end } = dayBoundsBusiness(day);
    const total = await personalSalesInRange(userId, start, end);
    if (total <= 0) break;
    streak++;
    day = shiftBusinessDay(start, -1);
  }
  return streak;
}

async function computeRanking(userId: string, periodStart: Date, periodEnd: Date) {
  const { start, end } = periodBoundsBusiness(periodStart, periodEnd);
  const users = await prisma.user.findMany({
    where: activeUserWhere,
    select: { id: true },
  });
  const volumes = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      vol: await prisma.purchase.aggregate({
        where: {
          ...activePurchaseLead,
          responsavelId: u.id,
          purchaseDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
    })),
  );

  const ranked = volumes
    .map((v) => ({ id: v.id, vol: decimalToNumber(v.vol._sum.amount) }))
    .filter((v) => v.vol > 0)
    .sort((a, b) => b.vol - a.vol);

  const rankTotal = ranked.length;
  const rankIndex = ranked.findIndex((r) => r.id === userId);
  return {
    rankPosition: rankIndex >= 0 ? rankIndex + 1 : null,
    rankTotal,
  };
}

function buildInsight(remaining: number, avgTicket: number, followUpCount: number): string {
  if (remaining <= 0) {
    return followUpCount > 0
      ? `Meta do dia atingida! Você tem ${followUpCount} lead${followUpCount !== 1 ? "s" : ""} em Follow-up para manter o pipeline.`
      : "Meta do dia atingida! Continue prospectando para manter o ritmo.";
  }

  const parts: string[] = [`Você está a R$ ${remaining.toLocaleString("pt-BR")} da meta`];
  if (avgTicket > 0) {
    const equiv = Math.max(1, Math.round(remaining / avgTicket));
    parts.push(`equivale a ${equiv} consórcio${equiv !== 1 ? "s" : ""} médio${equiv !== 1 ? "s" : ""}`);
  }
  if (followUpCount > 0) {
    parts.push(
      `Você tem ${followUpCount} lead${followUpCount !== 1 ? "s" : ""} em Follow-up prontos para contato agora`,
    );
  }
  return `${parts[0]} — ${parts.slice(1).join(". ")}.`;
}

export async function getPersonalDashboard(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUserWhere },
    select: { id: true, name: true, personalDailyTarget: true },
  });
  if (!user) throw notFound("Usuário não encontrado");

  const today = new Date();
  const { start: todayStart, end: todayEnd } = dayBoundsBusiness(today);
  const companyResolved = await resolveDailyTarget(today);
  const companyDailyTarget = companyResolved.target;

  const personalDailyTarget =
    user.personalDailyTarget !== null ? decimalToNumber(user.personalDailyTarget) : null;
  const targetSource = personalDailyTarget !== null ? ("personal" as const) : ("company" as const);
  const resolvedDailyTarget = personalDailyTarget ?? companyDailyTarget;

  const periodGoal = await getCurrentGoal();
  const periodStart = periodGoal?.startDate ?? todayStart;
  const periodEnd = periodGoal?.endDate ?? todayEnd;

  const activeLeadBase = { ...activeLeadWhere, responsavelId: userId };

  const [
    mySalesToday,
    todayPurchases,
    recentPurchases,
    activeLeadsCount,
    followUpLeadsCount,
    activeLeads,
    myAssignedTotal,
    myAssignedClosed,
    teamTotal,
    teamClosed,
    streakDays,
    ranking,
  ] = await Promise.all([
    personalSalesInRange(userId, todayStart, todayEnd),
    prisma.purchase.findMany({
      where: {
        ...activePurchaseLead,
        responsavelId: userId,
        purchaseDate: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { purchaseDate: "desc" },
      include: {
        consortiumType: { select: { name: true } },
        lead: { select: { name: true } },
      },
    }),
    prisma.purchase.findMany({
      where: {
        ...activePurchaseLead,
        responsavelId: userId,
      },
      orderBy: { purchaseDate: "desc" },
      take: 20,
      select: { amount: true },
    }),
    prisma.lead.count({
      where: {
        ...activeLeadBase,
        salesStatus: { slug: { not: "fechado" } },
      },
    }),
    prisma.lead.count({
      where: {
        ...activeLeadBase,
        salesStatus: { slug: "follow-up" },
      },
    }),
    prisma.lead.findMany({
      where: {
        ...activeLeadBase,
        salesStatus: { slug: { not: "fechado" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        salesStatus: { select: { slug: true, name: true } },
      },
    }),
    prisma.lead.count({ where: activeLeadBase }),
    prisma.lead.count({
      where: { ...activeLeadBase, salesStatus: { slug: "fechado" } },
    }),
    prisma.lead.count({ where: activeLeadWhere }),
    prisma.lead.count({ where: { ...activeLeadWhere, salesStatus: { slug: "fechado" } } }),
    computeStreak(userId),
    computeRanking(userId, periodStart, periodEnd),
  ]);

  const dailyPercent =
    resolvedDailyTarget > 0 ? Math.min(100, (mySalesToday / resolvedDailyTarget) * 100) : 0;
  const remaining = Math.max(0, resolvedDailyTarget - mySalesToday);

  const recentAmounts = recentPurchases.map((p) => decimalToNumber(p.amount)).filter((a) => a > 0);
  const avgTicket =
    recentAmounts.length > 0
      ? recentAmounts.reduce((s, a) => s + a, 0) / recentAmounts.length
      : 0;

  const myConversionRate = myAssignedTotal > 0 ? (myAssignedClosed / myAssignedTotal) * 100 : 0;
  const teamAvgConversionRate = teamTotal > 0 ? (teamClosed / teamTotal) * 100 : 0;

  return {
    personalDailyTarget,
    companyDailyTarget,
    resolvedDailyTarget,
    targetSource,
    mySalesToday,
    mySalesTodayCount: todayPurchases.length,
    dailyPercent,
    remaining,
    streakDays,
    rankPosition: ranking.rankPosition,
    rankTotal: ranking.rankTotal,
    activeLeadsCount,
    followUpLeadsCount,
    myConversionRate,
    teamAvgConversionRate,
    avgTicket,
    todaySales: todayPurchases.map((p) => ({
      id: p.id,
      leadName: p.lead.name,
      consortiumType: p.consortiumType?.name ?? null,
      amount: decimalToNumber(p.amount),
      soldAt: p.purchaseDate.toISOString(),
    })),
    activeLeads: activeLeads.map((l) => ({
      id: l.id,
      name: l.name,
      statusName: l.salesStatus?.name ?? "Sem status",
      statusSlug: l.salesStatus?.slug ?? null,
    })),
    insight: {
      remaining,
      avgTicket,
      followUpCount: followUpLeadsCount,
      message: buildInsight(remaining, avgTicket, followUpLeadsCount),
    },
  };
}

export async function getDashboardSummary() {
  const [goal, totalLeads, grouped] = await Promise.all([
    getCurrentGoal(),
    prisma.lead.count({ where: activeLeadWhere }),
    prisma.lead.groupBy({
      by: ["salesStatusId"],
      where: activeLeadWhere,
      _count: { _all: true },
    }),
  ]);

  const statusIds = grouped.map((g) => g.salesStatusId).filter(Boolean) as string[];
  const statuses = await prisma.leadStatus.findMany({
    where: { id: { in: statusIds } },
    select: { id: true, slug: true, name: true },
  });
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const leadsByStatus = grouped.map((g) => ({
    status: g.salesStatusId ? (statusMap.get(g.salesStatusId)?.name ?? "Sem status") : "Sem status",
    slug: g.salesStatusId ? (statusMap.get(g.salesStatusId)?.slug ?? null) : null,
    count: g._count._all,
  }));

  return {
    goal,
    totalLeads,
    leadsByStatus,
  };
}
