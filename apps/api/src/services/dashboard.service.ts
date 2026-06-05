import { prisma } from "../config/prisma.js";
import { getCurrentGoal } from "./goal.service.js";

export async function getDashboardSummary() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [goal, totalLeads, grouped, recentFollowUps] = await Promise.all([
    getCurrentGoal(),
    prisma.lead.count(),
    prisma.lead.groupBy({
      by: ["salesStatusId"],
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { nextFollowUpAt: { gte: now, lte: in7days } },
      select: {
        id: true,
        name: true,
        nextFollowUpAt: true,
        nextAction: { select: { id: true, slug: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 10,
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
    recentFollowUps,
  };
}
