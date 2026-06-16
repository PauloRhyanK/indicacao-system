import type { FastifyReply, FastifyRequest } from "fastify";
import {
  backfillCampaignRewardsSchema,
  bulkUpdateCampaignRewardsSchema,
  listCampaignRewardsQuerySchema,
  updateCampaignRewardSchema,
} from "../schemas/campaignReward.schema.js";
import {
  assertRewardPaymentsAllowed,
  backfillCampaignRewards,
  bulkUpdateCampaignRewards,
  generateRewardsForPurchase,
  getRewardsByPurchaseId,
  listCampaignRewards,
  updateCampaignReward,
} from "../services/campaignReward.service.js";

function requestPermissions(request: FastifyRequest): Set<string> {
  return request.permissions ?? new Set();
}

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
  const updated = await updateCampaignReward(
    id,
    input,
    request.user.sub,
    requestPermissions(request),
  );
  return reply.send({ data: updated });
}

export async function patchCampaignRewardsBulk(request: FastifyRequest, reply: FastifyReply) {
  const perms = requestPermissions(request);
  assertRewardPaymentsAllowed(perms);
  const input = bulkUpdateCampaignRewardsSchema.parse(request.body);
  const updated = await bulkUpdateCampaignRewards(input, request.user.sub, perms);
  return reply.send({ data: updated });
}

export async function postCampaignRewardsBackfill(request: FastifyRequest, reply: FastifyReply) {
  assertRewardPaymentsAllowed(requestPermissions(request));
  const input = backfillCampaignRewardsSchema.parse(request.body ?? {});
  const result = await backfillCampaignRewards(input);
  return reply.send(result);
}

export async function postPurchaseCampaignRewardsBackfill(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assertRewardPaymentsAllowed(requestPermissions(request));
  const { id } = request.params as { id: string };
  const result = await generateRewardsForPurchase(id);
  return reply.send({ data: result });
}
