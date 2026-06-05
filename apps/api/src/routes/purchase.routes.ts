import type { FastifyInstance } from "fastify";
import { getAllPurchases } from "../controllers/purchase.controller.js";
import { authenticate } from "../middlewares/auth.js";

export async function purchaseRoutes(app: FastifyInstance) {
  app.get("/purchases", { preHandler: [authenticate] }, getAllPurchases);
}
