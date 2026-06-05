import { prisma } from "../config/prisma.js";
import { getCurrentGoal } from "./goal.service.js";

export async function getDashboardSummary() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [goal, totalLeads, grouped, recentFollowUps] = await Promise.all([
    getCurrentGoal(),
    prisma.lead.count(),
    prisma.lead.groupBy({
      by: ["salesStatus"],
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { nextFollowUpAt: { gte: now, lte: in7days } },
      select: {
        id: true,
        name: true,
        nextAction: true,
        nextFollowUpAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 10,
    }),
  ]);

  const leadsByStatus = grouped.map((g) => ({
    status: g.salesStatus ?? "Sem status",
    count: g._count._all,
  }));

  return {
    goal,
    totalLeads,
    leadsByStatus,
    recentFollowUps,
  };
}
