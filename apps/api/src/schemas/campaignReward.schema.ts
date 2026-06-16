import { CampaignRewardStatus, ClientRewardChoice } from "@prisma/client";
import { z } from "zod";

export const listCampaignRewardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  pendingOnly: z.coerce.boolean().optional(),
  hasReferral: z.coerce.boolean().optional(),
  includeWithoutRewards: z.coerce.boolean().optional(),
});

export const updateCampaignRewardSchema = z.object({
  status: z.nativeEnum(CampaignRewardStatus).optional(),
  clientChoice: z.nativeEnum(ClientRewardChoice).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const bulkUpdateCampaignRewardsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.nativeEnum(CampaignRewardStatus),
  notes: z.string().optional().nullable(),
});

export const backfillCampaignRewardsSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type ListCampaignRewardsQuery = z.infer<typeof listCampaignRewardsQuerySchema>;
export type UpdateCampaignRewardInput = z.infer<typeof updateCampaignRewardSchema>;
export type BulkUpdateCampaignRewardsInput = z.infer<typeof bulkUpdateCampaignRewardsSchema>;
export type BackfillCampaignRewardsInput = z.infer<typeof backfillCampaignRewardsSchema>;
