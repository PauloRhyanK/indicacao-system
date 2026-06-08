import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { normalizePhone } from "../utils/format.js";
import { getReferrerOf, upsertReferral } from "./referral.service.js";
import { findBySlug } from "./lookup.service.js";
import {
  assertLeadEditable,
  assertLeadReadable,
  leadListFilter,
} from "./permission.service.js";
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from "../schemas/lead.schema.js";

const userRoleSelect = {
  select: { id: true, name: true, email: true },
} as const;

const lookupSelect = {
  select: { id: true, slug: true, name: true },
} as const;

const leadInclude = {
  responsavel: userRoleSelect,
  vendedor: userRoleSelect,
  coVendedor: userRoleSelect,
  source: lookupSelect,
  salesStatus: lookupSelect,
  nextAction: lookupSelect,
} as const;

function toDecimal(value?: number) {
  return value === undefined ? undefined : new Prisma.Decimal(value);
}

async function resolveLookupIds(input: {
  sourceId?: string;
  sourceSlug?: string;
  salesStatusId?: string;
  salesStatusSlug?: string;
  nextActionId?: string;
  nextActionSlug?: string;
}) {
  let sourceId = input.sourceId;
  let salesStatusId = input.salesStatusId;
  let nextActionId = input.nextActionId;

  if (input.sourceSlug) {
    const found = await findBySlug("source", input.sourceSlug);
    if (!found) throw badRequest(`Origem "${input.sourceSlug}" não encontrada`);
    sourceId = found.id;
  }
  if (input.salesStatusSlug) {
    const found = await findBySlug("status", input.salesStatusSlug);
    if (!found) throw badRequest(`Status "${input.salesStatusSlug}" não encontrado`);
    salesStatusId = found.id;
  }
  if (input.nextActionSlug) {
    const found = await findBySlug("action", input.nextActionSlug);
    if (!found) throw badRequest(`Ação "${input.nextActionSlug}" não encontrada`);
    nextActionId = found.id;
  }

  return { sourceId, salesStatusId, nextActionId };
}

function dateRange(field: "nextFollowUpAt" | "createdAt" | "updatedAt", from?: Date, to?: Date) {
  if (!from && !to) return {};
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = from;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return { [field]: range };
}

function decimalRange(field: "offeredAmount" | "closedAmount", min?: number, max?: number) {
  if (min === undefined && max === undefined) return {};
  const range: { gte?: Prisma.Decimal; lte?: Prisma.Decimal } = {};
  if (min !== undefined) range.gte = new Prisma.Decimal(min);
  if (max !== undefined) range.lte = new Prisma.Decimal(max);
  return { [field]: range };
}

export async function listLeads(
  query: ListLeadsQuery,
  access?: { userId: string; perms: Set<string> },
) {
  const {
    page,
    limit,
    search,
    status,
    source,
    nextAction,
    responsavelId,
    unassigned,
    followUpFrom,
    followUpTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    offeredMin,
    offeredMax,
    closedMin,
    closedMax,
    notes,
  } = query;

  const where: Prisma.LeadWhereInput = {
    ...(access ? leadListFilter(access.perms, access.userId) : {}),
    ...(status ? { salesStatus: { slug: status } } : {}),
    ...(source ? { source: { slug: source } } : {}),
    ...(nextAction ? { nextAction: { slug: nextAction } } : {}),
    ...(unassigned ? { responsavelId: null } : {}),
    ...(responsavelId ? { responsavelId } : {}),
    ...dateRange("nextFollowUpAt", followUpFrom, followUpTo),
    ...dateRange("createdAt", createdFrom, createdTo),
    ...dateRange("updatedAt", updatedFrom, updatedTo),
    ...decimalRange("offeredAmount", offeredMin, offeredMax),
    ...decimalRange("closedAmount", closedMin, closedMax),
    ...(notes ? { notes: { contains: notes, mode: "insensitive" } } : {}),
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
      include: leadInclude,
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

export async function getLeadById(
  id: string,
  access?: { userId: string; perms: Set<string> },
) {
  if (access) {
    await assertLeadReadable(id, access.userId, access.perms);
  }
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadInclude,
      purchases: { orderBy: { purchaseDate: "desc" } },
    },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const referrer = await getReferrerOf(id);
  return { ...lead, referrer };
}

export async function createLead(input: CreateLeadInput) {
  const { referrer, ...data } = input;
  const lookupIds = await resolveLookupIds(data);

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        externalCode: data.externalCode,
        name: data.name,
        phone: normalizePhone(data.phone),
        sourceId: lookupIds.sourceId,
        responsavelId: data.responsavelId,
        vendedorId: data.vendedorId ?? undefined,
        coVendedorId: data.coVendedorId ?? undefined,
        salesStatusId: lookupIds.salesStatusId,
        nextActionId: lookupIds.nextActionId,
        nextFollowUpAt: data.nextFollowUpAt,
        notes: data.notes,
        offeredAmount: toDecimal(data.offeredAmount),
        closedAmount: toDecimal(data.closedAmount),
      },
      include: leadInclude,
    });

    if (referrer) {
      await upsertReferral(lead.id, referrer, tx);
    }

    return lead;
  });
}

export async function updateLead(
  id: string,
  input: UpdateLeadInput,
  access?: { userId: string; perms: Set<string> },
) {
  if (access) {
    await assertLeadEditable(id, access.userId, access.perms);
  }
  const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Lead não encontrado");

  const { referrer, ...data } = input;
  const lookupIds = await resolveLookupIds(data);

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        ...(data.externalCode !== undefined ? { externalCode: data.externalCode } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
        ...(lookupIds.sourceId !== undefined ? { sourceId: lookupIds.sourceId } : {}),
        ...(data.responsavelId !== undefined ? { responsavelId: data.responsavelId } : {}),
        ...(data.vendedorId !== undefined ? { vendedorId: data.vendedorId } : {}),
        ...(data.coVendedorId !== undefined ? { coVendedorId: data.coVendedorId } : {}),
        ...(lookupIds.salesStatusId !== undefined ? { salesStatusId: lookupIds.salesStatusId } : {}),
        ...(lookupIds.nextActionId !== undefined ? { nextActionId: lookupIds.nextActionId } : {}),
        ...(data.nextFollowUpAt !== undefined ? { nextFollowUpAt: data.nextFollowUpAt } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.offeredAmount !== undefined ? { offeredAmount: toDecimal(data.offeredAmount) } : {}),
        ...(data.closedAmount !== undefined ? { closedAmount: toDecimal(data.closedAmount) } : {}),
      },
      include: leadInclude,
    });

    if (referrer) {
      await upsertReferral(lead.id, referrer, tx);
    }

    return lead;
  });
}

export async function deleteLead(
  id: string,
  access: { userId: string; perms: Set<string> },
) {
  await assertLeadReadable(id, access.userId, access.perms);
  const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Lead não encontrado");
  await prisma.lead.delete({ where: { id } });
}
