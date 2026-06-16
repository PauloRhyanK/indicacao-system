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
    { preHandler: [requirePermission("rewards.manage")] },
    patchCampaignRewardsBulk,
  );

  app.post(
    "/campaign-rewards/backfill",
    { preHandler: [requirePermission("rewards.manage")] },
    postCampaignRewardsBackfill,
  );

  app.patch(
    "/campaign-rewards/:id",
    { preHandler: [requirePermission("rewards.manage")] },
    patchCampaignReward,
  );

  app.get(
    "/purchases/:id/campaign-rewards",
    { preHandler: [requirePermission("sales.view_all")] },
    getPurchaseCampaignRewards,
  );

  app.post(
    "/purchases/:id/campaign-rewards/backfill",
    { preHandler: [requirePermission("rewards.manage")] },
    postPurchaseCampaignRewardsBackfill,
  );
}
