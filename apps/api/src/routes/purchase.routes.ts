import type { FastifyInstance } from "fastify";
import {
  getAllPurchases,
  patchPurchase,
  removePurchase,
} from "../controllers/purchase.controller.js";
import {
  importConsorcio,
  previewConsorcioImport,
} from "../controllers/consorcioImport.controller.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

export async function purchaseRoutes(app: FastifyInstance) {
  app.get(
    "/purchases",
    { preHandler: [authenticate, requirePermission("sales.view_all")] },
    getAllPurchases,
  );

  app.post(
    "/purchases/import/preview",
    { preHandler: [authenticate, requirePermission("leads.import")] },
    previewConsorcioImport,
  );

  app.post(
    "/purchases/import",
    { preHandler: [authenticate, requirePermission("leads.import")] },
    importConsorcio,
  );

  app.patch(
    "/purchases/:id",
    { preHandler: [authenticate, requirePermission("sales.create")] },
    patchPurchase,
  );

  app.delete(
    "/purchases/:id",
    { preHandler: [authenticate, requirePermission("sales.delete")] },
    removePurchase,
  );
}
