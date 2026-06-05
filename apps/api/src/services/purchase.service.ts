import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";
import { incrementCurrentGoal } from "./goal.service.js";
import type { CreatePurchaseInput } from "../schemas/purchase.schema.js";

/**
 * Registra uma compra de forma atômica:
 * 1. cria Purchase
 * 2. atualiza closed_amount e status do lead para "Fechado"
 * 3. incrementa a meta vigente
 * Qualquer falha provoca rollback de toda a transação.
 */
export async function registerPurchase(leadId: string, input: CreatePurchaseInput) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, closedAmount: true },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const amount = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: { leadId, amount, purchaseDate: input.purchaseDate },
    });

    const currentClosed = lead.closedAmount ?? new Prisma.Decimal(0);
    await tx.lead.update({
      where: { id: leadId },
      data: {
        closedAmount: currentClosed.plus(amount),
        salesStatus: "Fechado",
      },
    });

    await incrementCurrentGoal(amount, tx);

    return purchase;
  });
}

export async function listPurchases(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) throw notFound("Lead não encontrado");

  return prisma.purchase.findMany({
    where: { leadId },
    orderBy: { purchaseDate: "desc" },
  });
}

export async function listAllPurchases() {
  return prisma.purchase.findMany({
    orderBy: { purchaseDate: "desc" },
  });
}
