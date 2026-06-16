import type { FastifyReply, FastifyRequest } from "fastify";
import {
  backfillCampaignRewardsSchema,
  bulkUpdateCampaignRewardsSchema,
  listCampaignRewardsQuerySchema,
  updateCampaignRewardSchema,
} from "../schemas/campaignReward.schema.js";
import {
  backfillCampaignRewards,
  bulkUpdateCampaignRewards,
  generateRewardsForPurchase,
  getRewardsByPurchaseId,
  listCampaignRewards,
  updateCampaignReward,
} from "../services/campaignReward.service.js";

export async function getCampaignRewardsList(request: FastifyRequest, reply: FastifyReply) {
  const query = listCampaignRewardsQuerySchema.parse(request.query);
  const result = await listCampaignRewards(query);
  return reply.send(result);
}

export async function getPurchaseCampaignRewards(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await getRewardsByPurchaseId(id);
  return reply.send({ data: result });
}

export async function patchCampaignReward(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateCampaignRewardSchema.parse(request.body);
  const updated = await updateCampaignReward(id, input, request.user.sub);
  return reply.send({ data: updated });
}

export async function patchCampaignRewardsBulk(request: FastifyRequest, reply: FastifyReply) {
  const input = bulkUpdateCampaignRewardsSchema.parse(request.body);
  const updated = await bulkUpdateCampaignRewards(input, request.user.sub);
  return reply.send({ data: updated });
}

export async function postCampaignRewardsBackfill(request: FastifyRequest, reply: FastifyReply) {
  const input = backfillCampaignRewardsSchema.parse(request.body ?? {});
  const result = await backfillCampaignRewards(input);
  return reply.send(result);
}

export async function postPurchaseCampaignRewardsBackfill(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const result = await generateRewardsForPurchase(id);
  return reply.send({ data: result });
}
