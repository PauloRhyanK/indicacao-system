import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { normalizePhone } from "../utils/format.js";
import { getReferrerOf, upsertReferral } from "./referral.service.js";
import { findBySlug } from "./lookup.service.js";
import {
  assertLeadEditable,
  assertLeadReadable,
  leadListFilter,
} from "./permission.service.js";
import { activeLeadWhere } from "../utils/softDelete.js";
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from "../schemas/lead.schema.js";

const userRoleSelect = {
  select: { id: true, name: true, email: true },
} as const;

const lookupSelect = {
  select: { id: true, slug: true, name: true },
} as const;

const leadInclude = {
  responsavel: userRoleSelect,
  coVendedor: userRoleSelect,
  salesStatus: lookupSelect,
} as const;

function toDecimal(value?: number) {
  return value === undefined ? undefined : new Prisma.Decimal(value);
}

async function resolveSalesStatusId(input: {
  salesStatusId?: string;
  salesStatusSlug?: string;
}) {
  let salesStatusId = input.salesStatusId;

  if (input.salesStatusSlug) {
    const found = await findBySlug("status", input.salesStatusSlug);
    if (!found) throw badRequest(`Status "${input.salesStatusSlug}" não encontrado`);
    salesStatusId = found.id;
  }

  return salesStatusId;
}

function dateRange(field: "createdAt" | "updatedAt", from?: Date, to?: Date) {
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
    responsavelId,
    unassigned,
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
    ...activeLeadWhere,
    ...(access ? leadListFilter(access.perms, access.userId) : {}),
    ...(status ? { salesStatus: { slug: status } } : {}),
    ...(unassigned ? { responsavelId: null } : {}),
    ...(responsavelId ? { responsavelId } : {}),
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
  const lead = await prisma.lead.findFirst({
    where: { id, ...activeLeadWhere },
    include: {
      ...leadInclude,
      purchases: {
        where: { deletedAt: null },
        orderBy: { purchaseDate: "desc" },
      },
    },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const referrer = await getReferrerOf(id);
  return { ...lead, referrer };
}

export async function createLead(input: CreateLeadInput) {
  const { referrer, ...data } = input;
  const salesStatusId = await resolveSalesStatusId(data);

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        externalCode: data.externalCode,
        name: data.name,
        phone: normalizePhone(data.phone),
        responsavelId: data.responsavelId,
        coVendedorId: data.coVendedorId ?? undefined,
        salesStatusId,
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
  const existing = await prisma.lead.findFirst({
    where: { id, ...activeLeadWhere },
    select: { id: true },
  });
  if (!existing) throw notFound("Lead não encontrado");

  const { referrer, ...data } = input;
  const salesStatusId =
    data.salesStatusId !== undefined || data.salesStatusSlug !== undefined
      ? await resolveSalesStatusId(data)
      : undefined;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        ...(data.externalCode !== undefined ? { externalCode: data.externalCode } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
        ...(data.responsavelId !== undefined ? { responsavelId: data.responsavelId } : {}),
        ...(data.coVendedorId !== undefined ? { coVendedorId: data.coVendedorId } : {}),
        ...(salesStatusId !== undefined ? { salesStatusId } : {}),
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
  const existing = await prisma.lead.findFirst({
    where: { id, ...activeLeadWhere },
    select: { id: true },
  });
  if (!existing) throw notFound("Lead não encontrado");

  const salesCount = await prisma.purchase.count({
    where: { leadId: id, deletedAt: null },
  });
  if (salesCount > 0) {
    throw conflict("Lead possui vendas registradas. Remova as vendas antes de excluir.");
  }

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
