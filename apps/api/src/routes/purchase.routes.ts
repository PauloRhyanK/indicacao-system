import type { FastifyInstance } from "fastify";
import { getAllPurchases } from "../controllers/purchase.controller.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

export async function purchaseRoutes(app: FastifyInstance) {
  app.get(
    "/purchases",
    { preHandler: [authenticate, requirePermission("sales.view_all")] },
    getAllPurchases,
  );
}
