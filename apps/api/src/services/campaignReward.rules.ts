import { Prisma } from "@prisma/client";

export const REFERRAL_BONUS_THRESHOLD = 1_000_000;

export function referralBonusAmount(saleAmount: number | Prisma.Decimal): number {
  const value = typeof saleAmount === "number" ? saleAmount : Number(saleAmount);
  return value >= REFERRAL_BONUS_THRESHOLD ? 2000 : 1000;
}
