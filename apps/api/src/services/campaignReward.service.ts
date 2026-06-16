import {
  CampaignRewardStatus,
  CampaignRewardType,
  Prisma,
  ReferrerType,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { getBonusChain } from "./bonusChain.service.js";
import { referralBonusAmount } from "./campaignReward.rules.js";
import { activeLeadWhere, activePurchaseWhere } from "../utils/softDelete.js";
import { getReferrerOf } from "./referral.service.js";
import type {
  BackfillCampaignRewardsInput,
  BulkUpdateCampaignRewardsInput,
  ListCampaignRewardsQuery,
  UpdateCampaignRewardInput,
} from "../schemas/campaignReward.schema.js";

const NON_REFERRAL_LEVEL = 0;

export interface CampaignRewardDto {
  id: string;
  purchaseId: string;
  type: CampaignRewardType;
  referralLevel: number;
  recipientType: ReferrerType | null;
  recipientId: string | null;
  recipientName: string;
  amount: number | null;
  clientChoice: string | null;
  status: CampaignRewardStatus;
  amountStale: boolean;
  paidAt: string | null;
  notes: string | null;
}

export interface PurchaseRewardsSummaryDto {
  purchaseId: string;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  purchaseAmount: number;
  purchaseDate: string;
  directReferrerName: string | null;
  rewardsGenerated: boolean;
  totalRewards: number;
  paidCount: number;
  pendingCount: number;
  staleCount: number;
  rewards: CampaignRewardDto[];
}

function toDto(reward: {
  id: string;
  purchaseId: string;
  type: CampaignRewardType;
  referralLevel: number;
  recipientType: ReferrerType | null;
  recipientId: string | null;
  recipientName: string;
  amount: Prisma.Decimal | null;
  clientChoice: string | null;
  status: CampaignRewardStatus;
  amountStale: boolean;
  paidAt: Date | null;
  notes: string | null;
}): CampaignRewardDto {
  return {
    id: reward.id,
    purchaseId: reward.purchaseId,
    type: reward.type,
    referralLevel: reward.referralLevel,
    recipientType: reward.recipientType,
    recipientId: reward.recipientId,
    recipientName: reward.recipientName,
    amount: reward.amount != null ? Number(reward.amount) : null,
    clientChoice: reward.clientChoice,
    status: reward.status,
    amountStale: reward.amountStale,
    paidAt: reward.paidAt?.toISOString() ?? null,
    notes: reward.notes,
  };
}

interface RewardSeed {
  type: CampaignRewardType;
  referralLevel: number;
  recipientType: ReferrerType;
  recipientId: string;
  recipientName: string;
  amount?: Prisma.Decimal;
}

async function buildRewardSeeds(
  leadId: string,
  saleAmount: Prisma.Decimal,
): Promise<RewardSeed[]> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...activeLeadWhere },
    select: {
      id: true,
      name: true,
      responsavel: { select: { id: true, name: true } },
      coVendedor: { select: { id: true, name: true } },
      firstContact: { select: { id: true, name: true } },
    },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const bonusAmount = new Prisma.Decimal(referralBonusAmount(saleAmount));
  const seeds: RewardSeed[] = [];

  if (lead.responsavel) {
    seeds.push({
      type: CampaignRewardType.RESPONSAVEL,
      referralLevel: NON_REFERRAL_LEVEL,
      recipientType: ReferrerType.USER,
      recipientId: lead.responsavel.id,
      recipientName: lead.responsavel.name,
    });
  }
  if (lead.coVendedor) {
    seeds.push({
      type: CampaignRewardType.CO_VENDEDOR,
      referralLevel: NON_REFERRAL_LEVEL,
      recipientType: ReferrerType.USER,
      recipientId: lead.coVendedor.id,
      recipientName: lead.coVendedor.name,
    });
  }
  if (lead.firstContact) {
    seeds.push({
      type: CampaignRewardType.FIRST_CONTACT,
      referralLevel: NON_REFERRAL_LEVEL,
      recipientType: ReferrerType.USER,
      recipientId: lead.firstContact.id,
      recipientName: lead.firstContact.name,
    });
  }

  const chain = await getBonusChain(leadId);
  for (const node of chain.chain) {
    seeds.push({
      type: CampaignRewardType.REFERRAL,
      referralLevel: node.level,
      recipientType: node.nodeType,
      recipientId: node.nodeId,
      recipientName: node.name,
      amount: bonusAmount,
    });
  }

  seeds.push({
    type: CampaignRewardType.CLIENT,
    referralLevel: NON_REFERRAL_LEVEL,
    recipientType: ReferrerType.LEAD,
    recipientId: lead.id,
    recipientName: lead.name,
  });

  return seeds;
}

export async function generateRewardsForPurchase(purchaseId: string) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, ...activePurchaseWhere },
    select: { id: true, leadId: true, amount: true },
  });
  if (!purchase) throw notFound("Venda não encontrada");

  const seeds = await buildRewardSeeds(purchase.leadId, purchase.amount);

  await prisma.$transaction(async (tx) => {
    for (const seed of seeds) {
      await tx.campaignReward.upsert({
        where: {
          purchaseId_type_referralLevel: {
            purchaseId,
            type: seed.type,
            referralLevel: seed.referralLevel,
          },
        },
        create: {
          purchaseId,
          type: seed.type,
          referralLevel: seed.referralLevel,
          recipientType: seed.recipientType,
          recipientId: seed.recipientId,
          recipientName: seed.recipientName,
          amount: seed.amount ?? null,
          status: CampaignRewardStatus.PENDING,
        },
        update: {
          recipientType: seed.recipientType,
          recipientId: seed.recipientId,
          recipientName: seed.recipientName,
          ...(seed.amount !== undefined ? { amount: seed.amount } : {}),
        },
      });
    }
  });

  return getRewardsByPurchaseId(purchaseId);
}

export async function syncRewardsOnPurchaseUpdate(
  purchaseId: string,
  oldAmount: Prisma.Decimal,
  newAmount: Prisma.Decimal,
): Promise<{ stalePaidCount: number }> {
  if (oldAmount.equals(newAmount)) return { stalePaidCount: 0 };

  const nextBonus = new Prisma.Decimal(referralBonusAmount(newAmount));
  const referralRewards = await prisma.campaignReward.findMany({
    where: {
      purchaseId,
      type: CampaignRewardType.REFERRAL,
      status: { not: CampaignRewardStatus.CANCELLED },
    },
  });

  let stalePaidCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const reward of referralRewards) {
      if (reward.status === CampaignRewardStatus.PENDING) {
        await tx.campaignReward.update({
          where: { id: reward.id },
          data: { amount: nextBonus, amountStale: false },
        });
      } else if (reward.status === CampaignRewardStatus.PAID) {
        const current = reward.amount ?? new Prisma.Decimal(0);
        if (!current.equals(nextBonus)) {
          await tx.campaignReward.update({
            where: { id: reward.id },
            data: { amountStale: true },
          });
          stalePaidCount++;
        }
      }
    }
  });

  return { stalePaidCount };
}

export async function cancelRewardsOnPurchaseDelete(purchaseId: string) {
  await prisma.campaignReward.updateMany({
    where: {
      purchaseId,
      status: { not: CampaignRewardStatus.CANCELLED },
    },
    data: { status: CampaignRewardStatus.CANCELLED },
  });
}

export async function countPurchasesWithoutRewards() {
  const purchases = await prisma.purchase.findMany({
    where: activePurchaseWhere,
    select: { id: true },
  });
  if (purchases.length === 0) return 0;

  const withRewards = await prisma.campaignReward.groupBy({
    by: ["purchaseId"],
    where: { purchaseId: { in: purchases.map((p) => p.id) } },
  });
  const withSet = new Set(withRewards.map((r) => r.purchaseId));
  return purchases.filter((p) => !withSet.has(p.id)).length;
}

export async function backfillCampaignRewards(input: BackfillCampaignRewardsInput) {
  const purchases = await prisma.purchase.findMany({
    where: {
      ...activePurchaseWhere,
      campaignRewards: { none: {} },
    },
    orderBy: { purchaseDate: "desc" },
    take: input.limit,
    select: { id: true },
  });

  const errors: { purchaseId: string; message: string }[] = [];
  let processed = 0;

  for (const purchase of purchases) {
    try {
      await generateRewardsForPurchase(purchase.id);
      processed++;
    } catch (err) {
      errors.push({
        purchaseId: purchase.id,
        message: err instanceof Error ? err.message : "Erro ao gerar recompensas",
      });
    }
  }

  const remaining = await countPurchasesWithoutRewards();

  return { processed, remaining, errors };
}

/** Gera recompensas para todas as vendas que ainda não têm registro (idempotente). */
export async function ensureAllCampaignRewardsGenerated() {
  let totalProcessed = 0;
  const allErrors: { purchaseId: string; message: string }[] = [];
  let remaining = await countPurchasesWithoutRewards();

  while (remaining > 0) {
    const batch = await backfillCampaignRewards({ limit: 200 });
    totalProcessed += batch.processed;
    allErrors.push(...batch.errors);
    if (batch.processed === 0) break;
    remaining = batch.remaining;
  }

  return { processed: totalProcessed, remaining, errors: allErrors };
}

async function loadPurchaseSummary(
  purchase: {
    id: string;
    amount: Prisma.Decimal;
    purchaseDate: Date;
    lead: { id: string; name: string; phone: string | null };
  },
  rewards: CampaignRewardDto[],
): Promise<PurchaseRewardsSummaryDto> {
  const referrer = await getReferrerOf(purchase.lead.id);
  const active = rewards.filter((r) => r.status !== CampaignRewardStatus.CANCELLED);

  return {
    purchaseId: purchase.id,
    leadId: purchase.lead.id,
    leadName: purchase.lead.name,
    leadPhone: purchase.lead.phone,
    purchaseAmount: Number(purchase.amount),
    purchaseDate: purchase.purchaseDate.toISOString(),
    directReferrerName: referrer?.name ?? null,
    rewardsGenerated: active.length > 0,
    totalRewards: active.length,
    paidCount: active.filter((r) => r.status === CampaignRewardStatus.PAID).length,
    pendingCount: active.filter((r) => r.status === CampaignRewardStatus.PENDING).length,
    staleCount: active.filter((r) => r.amountStale).length,
    rewards: active,
  };
}

export async function getRewardsByPurchaseId(purchaseId: string) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, ...activePurchaseWhere },
    select: {
      id: true,
      amount: true,
      purchaseDate: true,
      lead: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!purchase) throw notFound("Venda não encontrada");

  const rewards = await prisma.campaignReward.findMany({
    where: { purchaseId },
    orderBy: [{ type: "asc" }, { referralLevel: "asc" }],
  });

  return loadPurchaseSummary(purchase, rewards.map(toDto));
}

export async function listCampaignRewards(query: ListCampaignRewardsQuery) {
  const purchases = await prisma.purchase.findMany({
    where: activePurchaseWhere,
    orderBy: { purchaseDate: "desc" },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      campaignRewards: {
        where: { status: { not: CampaignRewardStatus.CANCELLED } },
        orderBy: [{ type: "asc" }, { referralLevel: "asc" }],
      },
    },
  });

  let summaries: PurchaseRewardsSummaryDto[] = [];
  for (const purchase of purchases) {
    const dto = await loadPurchaseSummary(
      purchase,
      purchase.campaignRewards.map(toDto),
    );
    summaries.push(dto);
  }

  if (query.pendingOnly) {
    summaries = summaries.filter((s) => s.pendingCount > 0);
  }
  if (query.hasReferral) {
    summaries = summaries.filter((s) =>
      s.rewards.some((r) => r.type === CampaignRewardType.REFERRAL),
    );
  }
  if (!query.includeWithoutRewards) {
    summaries = summaries.filter((s) => s.rewardsGenerated);
  }

  const total = summaries.length;
  const start = (query.page - 1) * query.limit;
  const items = summaries.slice(start, start + query.limit);
  const backfillRemaining = await countPurchasesWithoutRewards();

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
    backfillRemaining,
  };
}

export async function updateCampaignReward(
  id: string,
  input: UpdateCampaignRewardInput,
  paidById?: string,
) {
  const existing = await prisma.campaignReward.findUnique({ where: { id } });
  if (!existing || existing.status === CampaignRewardStatus.CANCELLED) {
    throw notFound("Recompensa não encontrada");
  }

  if (input.status === CampaignRewardStatus.PAID && existing.type === CampaignRewardType.CLIENT) {
    const choice = input.clientChoice ?? existing.clientChoice;
    if (!choice) {
      throw badRequest("Informe cashback ou voucher de viagens antes de marcar como pago");
    }
  }

  const nextStatus = input.status ?? existing.status;
  const markingPaid =
    nextStatus === CampaignRewardStatus.PAID &&
    existing.status !== CampaignRewardStatus.PAID;

  const updated = await prisma.campaignReward.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.clientChoice !== undefined ? { clientChoice: input.clientChoice } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(markingPaid
        ? {
            paidAt: new Date(),
            paidById: paidById ?? null,
            amountStale: false,
          }
        : {}),
      ...(input.status === CampaignRewardStatus.PENDING
        ? { paidAt: null, paidById: null }
        : {}),
    },
  });

  return toDto(updated);
}

export async function bulkUpdateCampaignRewards(
  input: BulkUpdateCampaignRewardsInput,
  paidById?: string,
) {
  const results: CampaignRewardDto[] = [];
  for (const id of input.ids) {
    const updated = await updateCampaignReward(
      id,
      { status: input.status, notes: input.notes },
      paidById,
    );
    results.push(updated);
  }
  return results;
}
