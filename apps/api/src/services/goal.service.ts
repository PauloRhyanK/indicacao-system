import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";
import type { UpdateGoalInput } from "../schemas/goal.schema.js";

/**
 * Retorna a meta vigente (período que contém a data atual) ou a mais recente.
 */
export async function getCurrentGoal() {
  const now = new Date();
  const active = await prisma.goal.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
  if (active) return active;

  return prisma.goal.findFirst({ orderBy: { startDate: "desc" } });
}

async function findGoalAtDate(at: Date, tx: Prisma.TransactionClient) {
  return tx.goal.findFirst({
    where: { startDate: { lte: at }, endDate: { gte: at } },
    orderBy: { startDate: "desc" },
  });
}

/**
 * Incrementa o valor atingido da meta vigente. Aceita client transacional.
 * Silencioso (no-op) caso não exista meta ativa.
 */
export async function incrementCurrentGoal(
  amount: Prisma.Decimal,
  tx: Prisma.TransactionClient = prisma,
) {
  const goal = await findGoalAtDate(new Date(), tx);
  if (!goal) return null;

  return tx.goal.update({
    where: { id: goal.id },
    data: { currentAmount: { increment: amount } },
  });
}

/**
 * Decrementa o valor atingido da meta vigente na data informada.
 * Silencioso (no-op) caso não exista meta naquela data. Piso em zero.
 */
export async function decrementGoalAtDate(
  amount: Prisma.Decimal,
  at: Date,
  tx: Prisma.TransactionClient = prisma,
) {
  const goal = await findGoalAtDate(at, tx);
  if (!goal) return null;

  const next = goal.currentAmount.minus(amount);
  const floored = next.lessThan(0) ? new Prisma.Decimal(0) : next;

  return tx.goal.update({
    where: { id: goal.id },
    data: { currentAmount: floored },
  });
}

export async function updateGoal(id: string, input: UpdateGoalInput) {
  const existing = await prisma.goal.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Meta não encontrada");

  return prisma.goal.update({
    where: { id },
    data: {
      ...(input.targetAmount !== undefined
        ? { targetAmount: new Prisma.Decimal(input.targetAmount) }
        : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
    },
  });
}
