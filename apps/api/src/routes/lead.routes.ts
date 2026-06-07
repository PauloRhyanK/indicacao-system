import type { FastifyInstance } from "fastify";
import {
  getLead,
  getLeads,
  getLeadBonusChain,
  getLeadTree,
  patchLead,
  postLead,
  removeLead,
} from "../controllers/lead.controller.js";
import { importLeads, previewImport } from "../controllers/import.controller.js";
import { getPurchases, postPurchase } from "../controllers/purchase.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";

export async function leadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/leads", getLeads);
  app.post("/leads", postLead);
  app.post("/leads/import/preview", previewImport);
  app.post("/leads/import", importLeads);

  app.get("/leads/:id", getLead);
  app.patch("/leads/:id", patchLead);
  app.delete("/leads/:id", { preHandler: [authorize("ADMIN")] }, removeLead);
  app.get("/leads/:id/tree", getLeadTree);
  app.get("/leads/:id/bonus-chain", getLeadBonusChain);

  app.get("/leads/:leadId/purchases", getPurchases);
  app.post("/leads/:leadId/purchases", postPurchase);
}
