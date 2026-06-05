import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";
import { normalizePhone } from "../utils/format.js";
import { getReferrerOf, upsertReferral } from "./referral.service.js";
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from "../schemas/lead.schema.js";

const assignedToSelect = {
  select: { id: true, name: true, email: true },
} as const;

function toDecimal(value?: number) {
  return value === undefined ? undefined : new Prisma.Decimal(value);
}

export async function listLeads(query: ListLeadsQuery) {
  const { page, limit, search, status, source, assignedTo } = query;

  const where: Prisma.LeadWhereInput = {
    ...(status ? { salesStatus: status } : {}),
    ...(source ? { source } : {}),
    ...(assignedTo ? { assignedToUserId: assignedTo } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { externalCode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, data] = await prisma.$transaction([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { assignedTo: assignedToSelect },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: assignedToSelect,
      purchases: { orderBy: { purchaseDate: "desc" } },
    },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const referrer = await getReferrerOf(id);
  return { ...lead, referrer };
}

export async function createLead(input: CreateLeadInput) {
  const { referrer, ...data } = input;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        externalCode: data.externalCode,
        name: data.name,
        phone: normalizePhone(data.phone),
        source: data.source,
        assignedToUserId: data.assignedToUserId,
        salesStatus: data.salesStatus,
        nextAction: data.nextAction,
        nextFollowUpAt: data.nextFollowUpAt,
        notes: data.notes,
        offeredAmount: toDecimal(data.offeredAmount),
        closedAmount: toDecimal(data.closedAmount),
      },
    });

    if (referrer) {
      await upsertReferral(lead.id, referrer, tx);
    }

    return lead;
  });
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Lead não encontrado");

  const { referrer, ...data } = input;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        ...(data.externalCode !== undefined ? { externalCode: data.externalCode } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.assignedToUserId !== undefined ? { assignedToUserId: data.assignedToUserId } : {}),
        ...(data.salesStatus !== undefined ? { salesStatus: data.salesStatus } : {}),
        ...(data.nextAction !== undefined ? { nextAction: data.nextAction } : {}),
        ...(data.nextFollowUpAt !== undefined ? { nextFollowUpAt: data.nextFollowUpAt } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.offeredAmount !== undefined ? { offeredAmount: toDecimal(data.offeredAmount) } : {}),
        ...(data.closedAmount !== undefined ? { closedAmount: toDecimal(data.closedAmount) } : {}),
      },
    });

    if (referrer) {
      await upsertReferral(lead.id, referrer, tx);
    }

    return lead;
  });
}

export async function deleteLead(id: string) {
  const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Lead não encontrado");
  await prisma.lead.delete({ where: { id } });
}
