import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { incrementCurrentGoal } from "./goal.service.js";
import { getBonusChain } from "./bonusChain.service.js";
import {
  findConsortiumTypeById,
  findConsortiumTypeBySlug,
} from "./consortiumType.service.js";
import type { CreatePurchaseInput } from "../schemas/purchase.schema.js";

const purchaseInclude = {
  consortiumType: true,
  lead: { select: { id: true, name: true, phone: true } },
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
