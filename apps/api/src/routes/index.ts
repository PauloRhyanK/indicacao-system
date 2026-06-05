import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.routes.js";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { leadRoutes } from "./lead.routes.js";
import { goalRoutes } from "./goal.routes.js";
import { referralRoutes } from "./referral.routes.js";
import { purchaseRoutes } from "./purchase.routes.js";
import { settingsRoutes } from "./settings.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(settingsRoutes);
  await app.register(leadRoutes);
  await app.register(goalRoutes);
  await app.register(referralRoutes);
  await app.register(purchaseRoutes);
}
