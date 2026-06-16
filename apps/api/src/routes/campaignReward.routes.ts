import type { FastifyInstance } from "fastify";
import {
  getCampaignRewardsList,
  getPurchaseCampaignRewards,
  patchCampaignReward,
  patchCampaignRewardsBulk,
  postCampaignRewardsBackfill,
  postPurchaseCampaignRewardsBackfill,
} from "../controllers/campaignReward.controller.js";
import { authenticate, loadPermissions, requirePermission } from "../middlewares/auth.js";

const REWARD_PAYMENTS = ["rewards.payments", "rewards.manage"] as const;
const REWARD_WRITE = ["rewards.payments", "rewards.client_choice", "rewards.manage"] as const;

export async function campaignRewardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", loadPermissions);

  app.get(
    "/campaign-rewards",
    { preHandler: [requirePermission("sales.view_all")] },
    getCampaignRewardsList,
  );

  app.patch(
    "/campaign-rewards/bulk",
    { preHandler: [requirePermission(...REWARD_PAYMENTS)] },
    patchCampaignRewardsBulk,
  );

  app.post(
    "/campaign-rewards/backfill",
    { preHandler: [requirePermission(...REWARD_PAYMENTS)] },
    postCampaignRewardsBackfill,
  );

  app.patch(
    "/campaign-rewards/:id",
    { preHandler: [requirePermission(...REWARD_WRITE)] },
    patchCampaignReward,
  );

  app.get(
    "/purchases/:id/campaign-rewards",
    { preHandler: [requirePermission("sales.view_all")] },
    getPurchaseCampaignRewards,
  );

  app.post(
    "/purchases/:id/campaign-rewards/backfill",
    { preHandler: [requirePermission(...REWARD_PAYMENTS)] },
    postPurchaseCampaignRewardsBackfill,
  );
}
