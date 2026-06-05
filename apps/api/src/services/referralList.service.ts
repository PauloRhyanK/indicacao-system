import { prisma } from "../config/prisma.js";

export async function listAllReferrals() {
  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      referredLead: { select: { id: true, name: true } },
    },
  });

  const userIds = referrals
    .filter((r) => r.referrerType === "USER")
    .map((r) => r.referrerId);
  const leadIds = referrals
    .filter((r) => r.referrerType === "LEAD")
    .map((r) => r.referrerId);

  const [users, leads] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [],
    leadIds.length
      ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const leadMap = new Map(leads.map((l) => [l.id, l.name]));

  return referrals.map((r) => ({
    id: r.id,
    referredLeadId: r.referredLeadId,
    referredLeadName: r.referredLead.name,
    referrerType: r.referrerType,
    referrerId: r.referrerId,
    referrerName:
      r.referrerType === "USER"
        ? (userMap.get(r.referrerId) ?? null)
        : (leadMap.get(r.referrerId) ?? null),
    createdAt: r.createdAt,
  }));
}
