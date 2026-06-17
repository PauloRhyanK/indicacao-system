import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.routes.js";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { leadRoutes } from "./lead.routes.js";
import { goalRoutes } from "./goal.routes.js";
import { referralRoutes } from "./referral.routes.js";
import { purchaseRoutes } from "./purchase.routes.js";
import { settingsRoutes } from "./settings.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { campaignRewardRoutes } from "./campaignReward.routes.js";
import { roleRoutes } from "./role.routes.js";
import { rjRoutes } from "./rj.routes.js";
import { rjReuniaoRoutes } from "./rjReuniao.routes.js";
import { rjGoogleIntegracaoRoutes } from "./rjGoogleIntegracao.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(roleRoutes);
  await app.register(dashboardRoutes);
  await app.register(settingsRoutes);
  await app.register(leadRoutes);
  await app.register(goalRoutes);
  await app.register(referralRoutes);
  await app.register(purchaseRoutes);
  await app.register(campaignRewardRoutes);
  await app.register(rjRoutes);
  await app.register(rjReuniaoRoutes);
  await app.register(rjGoogleIntegracaoRoutes);
}
