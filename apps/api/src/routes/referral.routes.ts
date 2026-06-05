import type { FastifyInstance } from "fastify";
import { getReferrals } from "../controllers/referral.controller.js";
import { authenticate } from "../middlewares/auth.js";

export async function referralRoutes(app: FastifyInstance) {
  app.get("/referrals", { preHandler: [authenticate] }, getReferrals);
}
