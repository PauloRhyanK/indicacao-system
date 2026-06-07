import type { FastifyInstance } from "fastify";
import {
  getLead,
  getLeadBonusChain,
  getLeads,
  getLeadTree,
  patchLead,
  postLead,
  removeLead,
} from "../controllers/lead.controller.js";
import { importLeads, previewImport } from "../controllers/import.controller.js";
import { getPurchases, postPurchase } from "../controllers/purchase.controller.js";
import { authenticate, loadPermissions, requirePermission } from "../middlewares/auth.js";

export async function leadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", loadPermissions);

  app.get(
    "/leads",
    { preHandler: [requirePermission("leads.view_all", "leads.view_own")] },
    getLeads,
  );
  app.post("/leads", { preHandler: [requirePermission("leads.create")] }, postLead);
  app.post(
    "/leads/import/preview",
    { preHandler: [requirePermission("leads.import")] },
    previewImport,
  );
  app.post("/leads/import", { preHandler: [requirePermission("leads.import")] }, importLeads);

  app.get(
    "/leads/:id",
    { preHandler: [requirePermission("leads.view_all", "leads.view_own")] },
    getLead,
  );
  app.patch(
    "/leads/:id",
    { preHandler: [requirePermission("leads.edit_all", "leads.edit_own")] },
    patchLead,
  );
  app.delete("/leads/:id", { preHandler: [requirePermission("leads.delete")] }, removeLead);
  app.get(
    "/leads/:id/tree",
    { preHandler: [requirePermission("leads.view_all", "leads.view_own")] },
    getLeadTree,
  );
  app.get(
    "/leads/:id/bonus-chain",
    { preHandler: [requirePermission("leads.view_all", "leads.view_own")] },
    getLeadBonusChain,
  );

  app.get(
    "/leads/:leadId/purchases",
    { preHandler: [requirePermission("sales.view_all")] },
    getPurchases,
  );
  app.post(
    "/leads/:leadId/purchases",
    { preHandler: [requirePermission("sales.create")] },
    postPurchase,
  );
}
