import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { decrementGoalAtDate, incrementCurrentGoal } from "./goal.service.js";
import { findBySlug } from "./lookup.service.js";
import type { DeletePurchaseInput } from "../schemas/purchase.schema.js";
import { getBonusChain } from "./bonusChain.service.js";
import {
  findConsortiumTypeById,
  findConsortiumTypeBySlug,
} from "./consortiumType.service.js";
import type { CreatePurchaseInput } from "../schemas/purchase.schema.js";

const purchaseInclude = {
  consortiumType: true,
  lead: {
    select: {
      id: true,
      name: true,
      phone: true,
      externalCode: true,
      responsavel: { select: { id: true, name: true } },
      vendedor: { select: { id: true, name: true } },
      coVendedor: { select: { id: true, name: true } },
    },
  },
} as const;

async function resolveConsortiumTypeId(input: CreatePurchaseInput): Promise<string | undefined> {
  if (input.consortiumTypeId) {
    const type = await findConsortiumTypeById(input.consortiumTypeId);
    if (!type) throw badRequest("Tipo de consórcio não encontrado");
    return type.id;
  }
  if (input.consortiumTypeSlug) {
    const type = await findConsortiumTypeBySlug(input.consortiumTypeSlug.trim());
    if (!type) throw badRequest("Tipo de consórcio não encontrado");
    return type.id;
  }
  return undefined;
}

export async function registerPurchase(leadId: string, input: CreatePurchaseInput) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, closedAmount: true },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const consortiumTypeId = await resolveConsortiumTypeId(input);
  const fechadoStatus = await prisma.leadStatus.findUnique({ where: { slug: "fechado" } });
  const amount = new Prisma.Decimal(input.amount);

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        leadId,
        amount,
        purchaseDate: input.purchaseDate,
        consortiumTypeId,
      },
      include: purchaseInclude,
    });

    const currentClosed = lead.closedAmount ?? new Prisma.Decimal(0);
    await tx.lead.update({
      where: { id: leadId },
      data: {
        closedAmount: currentClosed.plus(amount),
        ...(fechadoStatus ? { salesStatusId: fechadoStatus.id } : {}),
        ...(input.vendedorId !== undefined ? { vendedorId: input.vendedorId } : {}),
        ...(input.coVendedorId !== undefined ? { coVendedorId: input.coVendedorId } : {}),
      },
    });

    await incrementCurrentGoal(amount, tx);

    return created;
  });

  const bonus = await getBonusChain(leadId);

  return {
    purchase,
    bonusChain: bonus.chain,
    tree_truncated: bonus.tree_truncated,
  };
}

export async function listPurchases(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) throw notFound("Lead não encontrado");

  return prisma.purchase.findMany({
    where: { leadId },
    orderBy: { purchaseDate: "desc" },
    include: purchaseInclude,
  });
}

export async function listAllPurchases() {
  return prisma.purchase.findMany({
    orderBy: { purchaseDate: "desc" },
    include: purchaseInclude,
  });
}

export async function deletePurchase(purchaseId: string, input: DeletePurchaseInput) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: { id: true, leadId: true, amount: true, createdAt: true },
  });
  if (!purchase) throw notFound("Venda não encontrada");

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: purchase.leadId },
      select: { id: true, closedAmount: true },
    });
    if (!lead) throw notFound("Lead não encontrado");

    await tx.purchase.delete({ where: { id: purchaseId } });

    const currentClosed = lead.closedAmount ?? new Prisma.Decimal(0);
    const nextClosed = currentClosed.minus(purchase.amount);
    const flooredClosed = nextClosed.lessThan(0) ? new Prisma.Decimal(0) : nextClosed;

    const remaining = await tx.purchase.count({ where: { leadId: purchase.leadId } });

    let salesStatusId: string | undefined;
    if (remaining === 0) {
      const status = await findBySlug("status", input.leadStatusSlug);
      if (status) salesStatusId = status.id;
    }

    await tx.lead.update({
      where: { id: purchase.leadId },
      data: {
        closedAmount: flooredClosed,
        ...(salesStatusId ? { salesStatusId } : {}),
      },
    });

    await decrementGoalAtDate(purchase.amount, purchase.createdAt, tx);
  });
}
